import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

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
        
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
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
            .eq('user_id', user.id)
            .single();

        if (fetchError || !interview) {
            return NextResponse.json({ error: { message: "Interview not found" } }, { status: 404 });
        }

        if (interview.analysis?.scorecard) {
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

            // Fetch all interviews this month for the user to check how many have scorecards
            const { data: monthInterviews, error: limitCheckError } = await supabaseAdmin
                .from('interviews')
                .select('analysis')
                .eq('user_id', user.id)
                .gte('created_at', startOfMonth.toISOString());

            if (!limitCheckError && monthInterviews) {
                const reportCount = monthInterviews.filter(i => i.analysis?.scorecard).length;
                if (reportCount >= 4) {
                    return NextResponse.json(
                        { error: { message: "You have reached your Free tier limit of 4 AI PDF reports this month. Please upgrade to Pro to generate unlimited reports." } }, 
                        { status: 403 }
                    );
                }
            }
        }
        // ---------------------------------------------------------

        // Determine language
        const lang = interview.analysis?.language || "en-US";
        
        const userPrompt = `
Interview Type: ${interview.analysis?.interview_type || "General"}
Questions and Transcript:
${interview.transcript || "No transcript available. Assume a standard successful interview."}

AI Responses generated during session (Candidate's Answers):
${interview.analysis?.ai_responses?.length ? interview.analysis.ai_responses.join("\\n\\n") : "Standard excellent responses."}
`;

        const systemPrompt = `You are an expert technical interviewer and recruiter. Analyze the following interview transcript and AI responses. Provide a JSON scorecard evaluating the candidate. 
The JSON must strictly match this structure:
{
  "overallScore": number (0-100),
  "technicalScore": number (0-100),
  "communicationScore": number (0-100),
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "detailedFeedback": "string"
}
Output ONLY valid JSON. Provide the analysis in ${lang}.`;

        const groqApiKeys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
        ].filter(Boolean) as string[];

        if (groqApiKeys.length === 0) {
            return NextResponse.json({ error: { message: "Server AI configuration missing." } }, { status: 500 });
        }

        // Just pick a random key for the report
        const apiKey = groqApiKeys[Math.floor(Math.random() * groqApiKeys.length)];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${apiKey}` 
            },
            body: JSON.stringify({
                model: "qwen/qwen3.8-27b", // Using Qwen for reliable JSON and speed
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: 2048,
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq Error:", errText);
            throw new Error("Failed to generate scorecard from AI provider.");
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;
        
        let parsedScorecard;
        try {
            parsedScorecard = JSON.parse(content.trim());
        } catch (parseError) {
            const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
            if (jsonMatch) {
                parsedScorecard = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Could not extract JSON from AI response.");
            }
        }

        // Save back to DB securely on the server
        const updatedAnalysis = { ...interview.analysis, scorecard: parsedScorecard };
        const { error: updateError } = await supabaseAdmin
            .from('interviews')
            .update({ analysis: updatedAnalysis })
            .eq('id', interviewId)
            .eq('user_id', user.id);

        if (updateError) {
            console.error("Failed to save scorecard to DB:", updateError);
            throw new Error("Failed to save report.");
        }

        return NextResponse.json({ scorecard: parsedScorecard });

    } catch (error: any) {
        console.error("[API Generate Report] Error:", error);
        return NextResponse.json({ error: { message: error.message || "Failed to generate report." } }, { status: 500 });
    }
}
