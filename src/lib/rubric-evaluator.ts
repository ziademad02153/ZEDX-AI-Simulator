import { 
    CompetencyEvaluation, 
    QuestionEvaluation, 
    CoachingPlanAction, 
    Rubric13Report, 
    LegacyScorecard 
} from "@/lib/interview-service";

export const FIXED_COMPETENCY_KEYS = [
    "role_and_domain_competence",
    "problem_solving_and_judgment",
    "communication_and_clarity",
    "behavioral_and_professional_effectiveness",
    "execution_and_role_readiness"
] as const;

export type CompetencyKey = typeof FIXED_COMPETENCY_KEYS[number];

export const COMPETENCY_METADATA: Record<CompetencyKey, { name: string; defaultWeight: number; focus: string }> = {
    role_and_domain_competence: {
        name: "Role & Domain Competence",
        defaultWeight: 25,
        focus: "Domain knowledge depth, terminology accuracy, architecture/methodology grasp, and practical trade-off awareness."
    },
    problem_solving_and_judgment: {
        name: "Problem Solving & Judgment",
        defaultWeight: 25,
        focus: "Structured decomposition, critical thinking, reasoning through ambiguity, and decision rationale under constraints."
    },
    communication_and_clarity: {
        name: "Communication & Clarity",
        defaultWeight: 20,
        focus: "Conciseness, verbal structure, precision of thought, articulation without filler, and clarity under pressure."
    },
    behavioral_and_professional_effectiveness: {
        name: "Behavioral & Professional Effectiveness",
        defaultWeight: 15,
        focus: "Ownership, adaptability, conflict/stakeholder management, teamwork, and professional maturity."
    },
    execution_and_role_readiness: {
        name: "Execution & Role Readiness",
        defaultWeight: 15,
        focus: "Immediate deliverability in role, workflow understanding, operational realism, risk mitigation, and self-starter capability."
    }
};

/**
 * Enforces dynamic weights guardrails:
 * - Each weight is an integer between 10% and 40% (inclusive).
 * - The sum of all 5 weights must equal exactly 100%.
 */
export function normalizeWeights(weights: number[]): number[] {
    if (!weights || weights.length !== 5) {
        return [25, 25, 20, 15, 15];
    }

    // Clamp to [10, 40]
    const clamped = weights.map(w => {
        const num = Math.round(Number(w) || 20);
        return Math.min(40, Math.max(10, num));
    });

    let sum = clamped.reduce((a, b) => a + b, 0);
    let diff = 100 - sum;

    let iterations = 0;
    while (diff !== 0 && iterations < 100) {
        iterations++;
        if (diff > 0) {
            // Find index with minimum weight that is < 40 to increment
            let minIdx = -1;
            let minVal = 41;
            for (let i = 0; i < 5; i++) {
                if (clamped[i] < 40 && clamped[i] < minVal) {
                    minVal = clamped[i];
                    minIdx = i;
                }
            }
            if (minIdx === -1) break;
            clamped[minIdx]++;
            diff--;
        } else {
            // Find index with maximum weight that is > 10 to decrement
            let maxIdx = -1;
            let maxVal = 9;
            for (let i = 0; i < 5; i++) {
                if (clamped[i] > 10 && clamped[i] > maxVal) {
                    maxVal = clamped[i];
                    maxIdx = i;
                }
            }
            if (maxIdx === -1) break;
            clamped[maxIdx]--;
            diff++;
        }
    }

    return clamped;
}

/**
 * Calculates Assessment Coverage from actual evidence and weights.
 * Formula: Sum of (Weight % * Evidence Factor)
 * Where:
 * - Sufficient = 1.0 (100% of weight)
 * - Partial = 0.5 (50% of weight)
 * - Insufficient = 0.0 (0% of weight)
 * - Not Directly Assessed = 0.0 (0% of weight)
 *
 * NOTE: Independent of question count. Grounded purely in evidence and weights.
 */
export function calculateAssessmentCoverage(competencies: CompetencyEvaluation[]): {
    coveragePct: number;
    completeness: "Sufficient" | "Partial" | "Insufficient";
} {
    let totalCoveredWeight = 0;

    for (const comp of competencies) {
        let factor = 0;
        if (comp.evidence_status === "Sufficient") {
            factor = 1.0;
        } else if (comp.evidence_status === "Partial") {
            factor = 0.5;
        } else {
            // "Insufficient" or "Not Directly Assessed"
            factor = 0.0;
        }
        totalCoveredWeight += comp.weight_pct * factor;
    }

    const coveragePct = Math.round(totalCoveredWeight * 10) / 10;

    let completeness: "Sufficient" | "Partial" | "Insufficient" = "Insufficient";
    if (coveragePct >= 80) {
        completeness = "Sufficient";
    } else if (coveragePct >= 50) {
        completeness = "Partial";
    }

    return { coveragePct, completeness };
}

/**
 * Helper to clean up glued words, CamelCase concatenation, and missing spaces after punctuation.
 */
function cleanDisplayText(text: string): string {
    if (!text) return "";
    return text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([.?!])([A-Za-z])/g, '$1 $2')
        .replace(/([,;:])([A-Za-z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculates overall BARS score (1.0 to 5.0) and performance level.
 * Formula: Sum of (bars_score * (weight_pct / 100)) over rated competencies.
 * When all competencies are Insufficient or Not Directly Assessed, returns null and Unrated level.
 */
export function calculateOverallBarsScore(competencies: CompetencyEvaluation[]): {
    overallBars: number | null;
    performanceLevel: string;
} {
    let ratedWeightSum = 0;
    let weightedScoreSum = 0;

    for (const comp of competencies) {
        if (
            comp.bars_score !== null &&
            comp.bars_score !== undefined &&
            comp.evidence_status !== "Insufficient" &&
            comp.evidence_status !== "Not Directly Assessed"
        ) {
            const score = Math.min(5.0, Math.max(1.0, comp.bars_score));
            weightedScoreSum += score * comp.weight_pct;
            ratedWeightSum += comp.weight_pct;
        }
    }

    if (ratedWeightSum === 0) {
        return {
            overallBars: null,
            performanceLevel: "Unrated (Insufficient Evidence)"
        };
    }

    // Weighted average across evaluated competencies
    const overallBars = Math.round((weightedScoreSum / ratedWeightSum) * 10) / 10;

    let performanceLevel = "Needs Improvement";
    if (overallBars >= 4.5) {
        performanceLevel = "Distinguished";
    } else if (overallBars >= 3.8) {
        performanceLevel = "Strong Performance";
    } else if (overallBars >= 3.0) {
        performanceLevel = "Competent / Meets Standard";
    } else if (overallBars >= 2.0) {
        performanceLevel = "Developing";
    } else {
        performanceLevel = "Needs Improvement";
    }

    return { overallBars, performanceLevel };
}

export interface EnforceReportContext {
    assessmentId: string;
    assessmentDate: string;
    candidateName: string;
    targetRole: string;
    track: string;
    interviewType: string;
    difficulty: string;
    language: string;
    evaluatorModel: string;
    sessionExchanges?: any[];
    descriptiveMetrics?: {
        total_duration_minutes?: number;
        average_latency_seconds?: number | null;
        total_words?: number;
        total_exchanges?: number;
    };
}

/**
 * Validates, normalizes, and enforces strict compliance of the AI output
 * with the Performance Analysis Report Schema (Rubric 1.3 Standards).
 */
export function enforceRubric13ReportSchema(
    raw: any,
    ctx: EnforceReportContext
): Rubric13Report {
    const exchanges = ctx.sessionExchanges || [];
    const rawQuestionsList: any[] = Array.isArray(raw?.questions_assessment) ? raw.questions_assessment : [];

    // 1. Extract and enforce the 5 competencies
    const rawCompetencies: any[] = Array.isArray(raw?.competencies) ? raw.competencies : [];
    
    // Map raw competencies by key
    const rawCompMap = new Map<string, any>();
    for (const c of rawCompetencies) {
        if (c && typeof c === "object" && c.key) {
            rawCompMap.set(c.key, c);
        }
    }

    // Extract weights
    const extractedWeights: number[] = FIXED_COMPETENCY_KEYS.map(key => {
        const item = rawCompMap.get(key);
        return Number(item?.weight_pct) || COMPETENCY_METADATA[key].defaultWeight;
    });

    // Enforce dynamic weights guardrails (each 10-40, sum = 100%)
    const normalizedWeights = normalizeWeights(extractedWeights);

    // Build enforced competencies
    const enforcedCompetencies: CompetencyEvaluation[] = FIXED_COMPETENCY_KEYS.map((key, idx) => {
        const meta = COMPETENCY_METADATA[key];
        const rawItem = rawCompMap.get(key) || {};

        // Evidence status validation
        let evidenceStatus: CompetencyEvaluation["evidence_status"] = "Sufficient";
        const rawStatus = String(rawItem.evidence_status || "").trim();
        if (rawStatus === "Partial") {
            evidenceStatus = "Partial";
        } else if (rawStatus === "Insufficient") {
            evidenceStatus = "Insufficient";
        } else if (rawStatus === "Not Directly Assessed") {
            evidenceStatus = "Not Directly Assessed";
        } else if (rawStatus === "Sufficient") {
            evidenceStatus = "Sufficient";
        } else {
            const quotes = Array.isArray(rawItem.traceable_evidence) ? rawItem.traceable_evidence : [];
            evidenceStatus = quotes.length > 0 ? "Sufficient" : "Partial";
        }

        // Traceable evidence quotes
        const rawQuotes = Array.isArray(rawItem.traceable_evidence) 
            ? rawItem.traceable_evidence
                .filter((q: any) => typeof q === "string" && q.trim().length > 0)
                .filter((q: string) => !/^(next|skip|i don'?t know|pass|ok|okay)[\.!]?$/i.test(q.trim()))
            : [];

        // STRICT Insufficient Evidence Rule:
        let barsScore: number | null = null;
        if (evidenceStatus !== "Insufficient" && evidenceStatus !== "Not Directly Assessed") {
            let parsed = Number(rawItem.bars_score);
            if (!isNaN(parsed) && parsed >= 1.0 && parsed <= 5.0) {
                barsScore = Math.round(parsed * 10) / 10;
            } else {
                barsScore = 3.0; // neutral fallback only when evidence exists
            }
        }
        
        // Filter out negative statements accidentally put into strengths
        const rawBehaviors = Array.isArray(rawItem.observable_behaviors) && rawItem.observable_behaviors.length > 0
            ? rawItem.observable_behaviors.map((s: any) => cleanDisplayText(String(s)))
            : [];
        
        const positiveBehaviors = rawBehaviors.filter((b: string) => 
            !/^(did not|failed to|unable to|no |lack of|does not|has not|missed)/i.test(b.trim())
        );

        const observableBehaviors = positiveBehaviors.length === 0
            ? [`No observable strengths demonstrated for ${meta.name.toLowerCase()} due to lack of positive behaviors.`]
            : positiveBehaviors;

        const observedGaps = Array.isArray(rawItem.observed_gaps) && rawItem.observed_gaps.length > 0
                ? rawItem.observed_gaps.map((s: any) => cleanDisplayText(String(s)))
                : [];

        const weightRationale = typeof rawItem.weight_rationale === "string" && rawItem.weight_rationale.trim().length > 0
            ? cleanDisplayText(rawItem.weight_rationale.trim())
            : `Assigned ${normalizedWeights[idx]}% based on target role requirements and seniority expectations.`;

        return {
            key,
            name: meta.name,
            weight_pct: normalizedWeights[idx],
            weight_rationale: weightRationale,
            bars_score: barsScore,
            evidence_status: evidenceStatus,
            observable_behaviors: observableBehaviors,
            observed_gaps: observedGaps,
            traceable_evidence: rawQuotes.map((q: any) => cleanDisplayText(String(q)))
        };
    });

    // 2. Calculate Coverage and Completeness from evidence & weights
    const { coveragePct, completeness } = calculateAssessmentCoverage(enforcedCompetencies);

    // 3. Calculate Overall BARS score and Performance Level
    const { overallBars, performanceLevel } = calculateOverallBarsScore(enforcedCompetencies);

    // 4. Enforce Questions Assessment
    const rawQuestions: any[] = Array.isArray(raw?.questions_assessment) ? raw.questions_assessment : [];
    const mainExchanges = exchanges.filter((e: any) => e.type !== "followup");
    const followupExchanges = exchanges.filter((e: any) => e.type === "followup");

    const questionsAssessment: QuestionEvaluation[] = rawQuestions.map((q, idx) => {
        const mainEx = mainExchanges[idx] || exchanges[idx];
        const followEx = followupExchanges.find((f: any) => f.mainQuestionIndex === idx);

        let qText = q.question_text ? String(q.question_text).trim() : "";
        if (mainEx && mainEx.question && mainEx.question.trim().length > 10) {
            qText = mainEx.question.trim();
        }
        qText = cleanDisplayText(qText || `Question ${idx + 1}`);

        let cAnswer = q.candidate_answer ? String(q.candidate_answer).trim() : "";
        if (mainEx && typeof mainEx.answer === "string" && mainEx.answer.trim().length > 0) {
            cAnswer = mainEx.answer.trim();
        }
        cAnswer = cleanDisplayText(cAnswer);

        let followUpObj = null;
        if (followEx && followEx.question) {
            followUpObj = {
                probe: cleanDisplayText(followEx.question),
                response: cleanDisplayText(followEx.answer || "")
            };
        } else if (q.follow_up && typeof q.follow_up === "object" && q.follow_up.probe) {
            followUpObj = {
                probe: cleanDisplayText(String(q.follow_up.probe)),
                response: cleanDisplayText(String(q.follow_up.response || ""))
            };
        }

        let qScore: number | null = null;
        if (q.bars_score === null || q.bars_score === undefined || String(q.bars_score).trim().toLowerCase() === "null") {
            qScore = null;
        } else {
            const parsedQScore = Number(q.bars_score);
            if (!isNaN(parsedQScore) && parsedQScore >= 1.0 && parsedQScore <= 5.0) {
                qScore = Math.round(parsedQScore * 10) / 10;
            } else if (overallBars !== null) {
                qScore = overallBars;
            }
        }

        const scoringRationale = (typeof q.scoring_rationale === "string" && q.scoring_rationale.trim().length > 0)
            ? cleanDisplayText(q.scoring_rationale.trim())
            : (qScore !== null 
                ? `Response evaluated at BARS ${qScore.toFixed(1)}/5.0 reflecting observed competencies and gap profile.` 
                : "Evaluated based on response depth.");

        const benchmarkModel = typeof q.benchmark_model === "string" && q.benchmark_model.trim().length > 0
            ? cleanDisplayText(q.benchmark_model.trim())
            : `A distinguished response for this question clearly establishes operational context, details explicit architectural decisions, and quantifies performance outcomes using standard domain terminology.`;

        // Clean up strengths to remove negative gaps mistakenly placed in strengths
        const rawStrengths = Array.isArray(q.strengths) ? q.strengths.map((s: any) => cleanDisplayText(String(s))) : [];
        const positiveStrengths = rawStrengths.filter((s: string) => 
            !/^(did not|failed to|unable to|no |lack of|does not|has not|missed)/i.test(s.trim())
        );

        const strengths = positiveStrengths.length === 0 ? [] : positiveStrengths;

        let gaps = Array.isArray(q.gaps) ? q.gaps.map((g: any) => cleanDisplayText(String(g))) : [];
        if (gaps.length === 0) {
            gaps = ["Response lacked sufficient technical depth to fully meet target expectations."];
        }

        return {
            question_number: Number(q.question_number) || (idx + 1),
            question_text: qText,
            targeted_competencies: Array.isArray(q.targeted_competencies) ? q.targeted_competencies.map(String) : ["role_and_domain_competence"],
            candidate_answer: cAnswer || "(No verbal response provided / Unanswered)",
            follow_up: followUpObj,
            bars_score: qScore,
            strengths: strengths,
            gaps: gaps,
            evaluator_note: cleanDisplayText(String(q.evaluator_note || "")),
            scoring_rationale: scoringRationale,
            benchmark_model: benchmarkModel
        };
    });

    // 5. Enforce 7-Day Action Plan
    const rawPlan: any[] = Array.isArray(raw?.action_plan_7_days) ? raw.action_plan_7_days : [];
    const defaultPlan: CoachingPlanAction[] = [
        {
            day_range: "Days 1-2",
            focus_area: "Core Domain Foundations & Narrative Preparation",
            actions: [
                `Review core technical concepts and architectural patterns relevant to the target role.`,
                "Prepare structured answers using the CAR (Context-Action-Result) framework."
            ],
            expected_outcome: "Eliminate hesitation and build clear personal narratives for common technical questions."
        },
        {
            day_range: "Days 3-4",
            focus_area: "Structured Problem-Solving & Technical Trade-offs",
            actions: [
                "Practice verbalizing technical trade-offs under constraints (scalability, latency, reliability).",
                "Simulate complex debugging or design questions out loud with concise technical terminology."
            ],
            expected_outcome: "Deliver structured, logical reasoning under simulated interview pressure."
        },
        {
            day_range: "Days 5-7",
            focus_area: "Simulated Interview Rehearsal & Delivery Pacing",
            actions: [
                "Execute full-length simulated mock interviews focusing on concise verbal delivery (<90 seconds per prompt).",
                "Eliminate filler phrases and practice pivoting effectively when presented with follow-up probes."
            ],
            expected_outcome: "Deliver structured, evidence-backed answers using CAR/STAR frameworks in the next mock interview."
        }
    ];

    const cleanActionText = (text: string) => {
        return cleanDisplayText(text)
            .replace(/achieves?\s+(a\s+)?BARS\s+score\s+of\s+(at\s+least\s+)?[\d\.]+/gi, "delivers structured, evidence-backed answers in future mock sessions");
    };

    const actionPlan7Days: CoachingPlanAction[] = rawPlan.length >= 3 
        ? rawPlan.map(p => ({
            day_range: String(p.day_range || "Days 1-2"),
            focus_area: String(p.focus_area || "Targeted Improvement"),
            actions: Array.isArray(p.actions) ? p.actions.map((s: any) => cleanActionText(String(s))) : ["Review interview feedback."],
            expected_outcome: cleanActionText(String(p.expected_outcome || "Deliver structured, evidence-backed answers in the next mock interview."))
        }))
        : defaultPlan;

    // 6. Build final executive report
    const executiveSummary = (typeof raw?.overall_evaluation?.executive_summary === "string" && raw.overall_evaluation.executive_summary.trim().length > 0)
        ? cleanDisplayText(raw.overall_evaluation.executive_summary.trim())
        : (overallBars !== null 
            ? (ctx.language?.startsWith('ar')
                ? `أظهر المرشح تفاعلاً والتزاماً مناسباً للدور المستهدف بتقييم إجمالي ${overallBars}/5.0 (${performanceLevel}).`
                : `Candidate demonstrated solid engagement for the target role with an overall rating of ${overallBars}/5.0 (${performanceLevel}).`)
            : (ctx.language?.startsWith('ar')
                ? `لم تسفر الجلسة عن أدلة لفظية كافية لتعيين تقييم BARS إجمالي. تم تصنيف الأداء على أنه غير مقيَّم.`
                : `Session did not yield sufficient verifiable evidence to assign an overall BARS rating. Performance is designated as Unrated.`));

    const report: Rubric13Report = {
        rubric_version: "1.3",
        assessment_id: ctx.assessmentId,
        assessment_date: ctx.assessmentDate,
        candidate: {
            name: ctx.candidateName,
            target_role: ctx.targetRole,
            track: ctx.track,
            interview_type: ctx.interviewType,
            difficulty: ctx.difficulty,
            language: ctx.language,
            evaluator_model: ctx.evaluatorModel
        },
        overall_evaluation: {
            bars_score: overallBars,
            performance_level: performanceLevel,
            assessment_coverage_pct: coveragePct,
            evidence_completeness: completeness,
            executive_summary: executiveSummary
        },
        competencies: enforcedCompetencies,
        questions_assessment: questionsAssessment,
        action_plan_7_days: actionPlan7Days,
        descriptive_session_metrics: ctx.descriptiveMetrics
    };

    return report;
}

/**
 * Creates a backward-compatible projection for any legacy consumers reading `analysis.scorecard`.
 */
export function generateLegacyProjection(report: Rubric13Report): LegacyScorecard {
    const roleComp = report.competencies.find(c => c.key === "role_and_domain_competence");
    const commComp = report.competencies.find(c => c.key === "communication_and_clarity");

    const overallPct = report.overall_evaluation.bars_score !== null 
        ? Math.min(100, Math.max(0, Math.round((report.overall_evaluation.bars_score / 5.0) * 100)))
        : 0;
    const technicalPct = (roleComp?.bars_score != null)
        ? Math.min(100, Math.max(0, Math.round((roleComp.bars_score / 5.0) * 100)))
        : overallPct;
    const commPct = (commComp?.bars_score != null)
        ? Math.min(100, Math.max(0, Math.round((commComp.bars_score / 5.0) * 100)))
        : overallPct;

    const strengths = report.competencies
        .flatMap(c => c.observable_behaviors)
        .filter(Boolean)
        .slice(0, 4);

    const improvements = report.competencies
        .flatMap(c => c.observed_gaps)
        .filter(Boolean)
        .slice(0, 4);

    return {
        overallScore: overallPct,
        technicalScore: technicalPct,
        communicationScore: commPct,
        strengths: strengths.length > 0 ? strengths : ["Demonstrated professional engagement", "Communicated core concepts"],
        improvements: improvements.length > 0 ? improvements : ["Continue expanding domain depth", "Refine trade-off articulation"],
        detailedFeedback: report.overall_evaluation.executive_summary
    };
}
