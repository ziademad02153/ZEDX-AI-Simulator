import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { interviewService, SessionExchange, LegacyScorecard } from "@/lib/interview-service";
import { getRubric13EvaluatorSystemPrompt, getRubric13EvaluatorUserPrompt } from "@/lib/prompts";
import { enforceRubric13ReportSchema, generateLegacyProjection } from "@/lib/rubric-evaluator";

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        let token = authHeader?.split(' ')[1];
        if (token === 'undefined' || token === 'null') token = undefined;
        
        if (!token) {
            return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const { data: { user }, error: authError } = await createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: { message: "Invalid session token." } }, { status: 401 });
        }

        const body = await request.json();
        const { interviewId } = body;

        if (!interviewId) {
            return NextResponse.json({ error: { message: "Missing interviewId" } }, { status: 400 });
        }

        // Fetch interview
        const { data: interview, error: fetchError } = await supabaseAdmin
            .from('interviews')
            .select('*')
            .eq('id', interviewId)
            .eq('user_id', user.id) // Ensure user owns the interview
            .single();

        if (fetchError || !interview) {
            return NextResponse.json({ error: { message: "Interview not found" } }, { status: 404 });
        }

        // Return cached Rubric 1.3 report if already generated
        if (interview.analysis?.rubric_report && interview.analysis.rubric_report.rubric_version === "1.3") {
            return NextResponse.json({ 
                rubric_report: interview.analysis.rubric_report,
                scorecard: interview.analysis.scorecard 
            });
        }

        // Preserve legacy reports: If interview has legacy scorecard from earlier, return directly
        if (interview.analysis?.scorecard && !interview.analysis?.rubric_report) {
            return NextResponse.json({ scorecard: interview.analysis.scorecard });
        }

        // --- Rate Limiting Check (4 Reports/Month for Free Tier) ---
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('tier')
            .eq('id', user.id)
            .single();

        const userTier = profile?.tier || 'free';

        if (userTier === 'free') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Fetch all interviews this month for the user to check how many have reports
            const { data: monthInterviews, error: limitCheckError } = await supabaseAdmin
                .from('interviews')
                .select('analysis')
                .eq('user_id', user.id)
                .gte('created_at', startOfMonth.toISOString());

            if (!limitCheckError && monthInterviews) {
                const reportCount = monthInterviews.filter(i => i.analysis?.rubric_report || i.analysis?.scorecard).length;
                if (reportCount >= 4) {
                    return NextResponse.json(
                        { error: { message: "You have reached your Free tier limit of 4 AI reports this month. Please upgrade to Pro to generate unlimited reports." } }, 
                        { status: 403 }
                    );
                }
            }
        }
        // ---------------------------------------------------------

        // 1. Gather Real Session Context
        const lang = interview.analysis?.language || "en-US";
        const jd = interview.analysis?.job_description || "Professional Role Expectations";
        const interviewType = interview.analysis?.interview_type || "General";
        const difficulty = interview.analysis?.difficulty || "Mid-Level";
        
        // Derive target role (prioritize explicit user input)
        const explicitTargetRole = (typeof interview.analysis?.target_role === "string" && interview.analysis.target_role.trim().length > 0)
            ? interview.analysis.target_role.trim()
            : null;
        const targetRoleMatch = jd.split('\n')[0].replace(/^#+\s*/, '').trim();
        const targetRole = explicitTargetRole 
            || (targetRoleMatch && targetRoleMatch.length < 60 ? targetRoleMatch : (interview.title ? interview.title.replace(/^Interview - /, '') : "Candidate Role"));

        // Fetch user resume text if not directly in session analysis
        let resumeText = interview.analysis?.resume_text;
        if (!resumeText) {
            const { data: latestResume } = await supabaseAdmin
                .from('resumes')
                .select('content, name')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            resumeText = latestResume?.content || interview.analysis?.resume_name || "Standard Candidate Profile";
        }

        // Gather real exchanges
        let sessionExchanges: SessionExchange[] = [];
        if (Array.isArray(interview.analysis?.session_exchanges) && interview.analysis.session_exchanges.length > 0) {
            sessionExchanges = interview.analysis.session_exchanges;
        } else if (Array.isArray(interview.analysis?.questions) && interview.analysis.questions.length > 0) {
            // Map legacy questions array
            sessionExchanges = interview.analysis.questions.map((item: any, idx: number) => ({
                index: idx + 1,
                mainQuestionIndex: idx,
                type: "main" as const,
                question: item.q || item.question || `Question ${idx + 1}`,
                answer: item.a || item.answer || ""
            }));
        } else if (interview.transcript) {
            // Fallback from raw transcript
            sessionExchanges = [{
                index: 1,
                mainQuestionIndex: 0,
                type: "main" as const,
                question: "Interview Dialogue",
                answer: interview.transcript
            }];
        }

        // Compute descriptive audio and session metrics (Non-scoring)
        const totalDurationMinutes = interview.analysis?.duration_minutes 
            || Math.max(1, Math.round(((new Date(interview.analysis?.completed_at || interview.created_at).getTime() - new Date(interview.analysis?.started_at || interview.created_at).getTime()) / 60000)) || 1);
        
        let totalWords = 0;
        let latencySum = 0;
        let latencyCount = 0;

        sessionExchanges.forEach(ex => {
            if (typeof ex.wordCount === "number") {
                totalWords += ex.wordCount;
            } else if (ex.answer) {
                totalWords += ex.answer.trim().split(/\s+/).filter(Boolean).length;
            }
            if (ex.timing?.latencySeconds != null && !isNaN(ex.timing.latencySeconds)) {
                latencySum += ex.timing.latencySeconds;
                latencyCount++;
            }
        });

        const averageLatencySeconds = latencyCount > 0 ? Math.round((latencySum / latencyCount) * 10) / 10 : null;

        const descriptiveMetrics = {
            total_duration_minutes: totalDurationMinutes,
            average_latency_seconds: averageLatencySeconds,
            total_words: totalWords,
            total_exchanges: sessionExchanges.length
        };

        const assessmentId = interviewService.getPresentationAssessmentId(interview);
        const assessmentDate = interview.analysis?.completed_at || interview.created_at;
        const candidateName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Candidate";

        // 2. Prepare System & User Prompts
        const systemPrompt = getRubric13EvaluatorSystemPrompt(lang);
        const userPrompt = getRubric13EvaluatorUserPrompt({
            targetRole,
            track: interviewType,
            jobDescription: jd,
            resumeText,
            interviewType,
            difficulty,
            language: lang,
            sessionExchanges
        });

        // 3. Multi-Key Groq Invocation with Fallback
        const groqApiKeys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
            process.env.GROQ_API_KEY_4,
            process.env.GROQ_API_KEY_5,
            process.env.GROQ_API_KEY_6,
            process.env.GROQ_API_KEY_7,
            process.env.GROQ_API_KEY_8,
            process.env.GROQ_API_KEY_9,
            process.env.GROQ_API_KEY_10,
            process.env.GROQ_API_KEY_11,
            process.env.GROQ_API_KEY_12,
            process.env.GROQ_API_KEY_13,
            process.env.GROQ_API_KEY_14
        ].filter(Boolean) as string[];

        if (groqApiKeys.length === 0) {
            return NextResponse.json({ error: { message: "Server AI configuration missing." } }, { status: 500 });
        }

        // Fisher-Yates shuffle keys
        const shuffledKeys = [...groqApiKeys];
        for (let i = shuffledKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
        }

        // Primary Evaluator Engine Model: openai/gpt-oss-120b; Fallback: qwen/qwen3.8-27b
        const modelsToTry = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"];
        let rawContent: string | null = null;
        let successfulModel = modelsToTry[0];
        let lastErrorMsg = "";

        for (const targetModel of modelsToTry) {
            for (const apiKey of shuffledKeys) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 45000);

                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json", 
                            "Authorization": `Bearer ${apiKey}` 
                        },
                        body: JSON.stringify({
                            model: targetModel,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userPrompt }
                            ],
                            max_tokens: 4096,
                            temperature: 0.1,
                            response_format: { type: "json_object" }
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        const errText = await response.text();
                        lastErrorMsg = `HTTP ${response.status}: ${errText.substring(0, 120)}`;
                        console.warn(`[Rubric 1.3 Evaluator] Model ${targetModel} on key ***${apiKey.slice(-4)} failed (${response.status}). Trying next...`);
                        continue;
                    }

                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content;
                    if (content && content.trim().length > 0) {
                        rawContent = content;
                        successfulModel = targetModel;
                        break;
                    }
                } catch (err: any) {
                    lastErrorMsg = err?.message || "Fetch aborted/failed";
                    console.warn(`[Rubric 1.3 Evaluator] Model ${targetModel} error: ${lastErrorMsg}. Retrying...`);
                }
            }

            if (rawContent) break; // Successfully obtained response
        }

        if (!rawContent) {
            console.error("[Rubric 1.3 Evaluator] All models and keys exhausted. Last error:", lastErrorMsg);
            throw new Error(`Failed to generate evaluation report: ${lastErrorMsg || "AI provider unavailable"}`);
        }

        // 4. Safe JSON Parsing
        let parsedJson: any;
        try {
            parsedJson = JSON.parse(rawContent.trim());
        } catch {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedJson = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Could not extract structured JSON from AI evaluator output.");
            }
        }

        // 5. Enforce Rubric 1.3 Schema, Dynamic Weights Guardrails & Coverage Calculation
        const rubricReport = enforceRubric13ReportSchema(parsedJson, {
            assessmentId,
            assessmentDate,
            candidateName,
            targetRole,
            track: interviewType,
            interviewType,
            difficulty,
            language: lang,
            evaluatorModel: successfulModel,
            sessionExchanges,
            descriptiveMetrics
        });

        // 6. Generate Legacy Scorecard Projection for seamless backward compatibility
        const legacyScorecard: LegacyScorecard = generateLegacyProjection(rubricReport);

        // 7. Save to DB
        const updatedAnalysis = {
            ...interview.analysis,
            session_exchanges: sessionExchanges,
            rubric_version: "1.3",
            rubric_report: rubricReport,
            scorecard: legacyScorecard
        };

        const { error: updateError } = await supabaseAdmin
            .from('interviews')
            .update({ analysis: updatedAnalysis })
            .eq('id', interviewId);

        if (updateError) {
            console.error("Failed to save Rubric 1.3 report to DB:", updateError);
            throw new Error("Failed to save report.");
        }

        return NextResponse.json({ 
            rubric_report: rubricReport,
            scorecard: legacyScorecard
        });

    } catch (error: any) {
        console.error("[API Generate Report] Error:", error);
        return NextResponse.json({ error: { message: error.message || "Failed to generate report." } }, { status: 500 });
    }
}
