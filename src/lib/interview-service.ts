import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Represents the structure of the JSONB analysis column which tracks meeting/session data.
 */
export interface SessionExchangeTiming {
    questionEndedAt?: number | null;
    speechStartedAt?: number | null;
    speechEndedAt?: number | null;
    durationSeconds?: number;
    latencySeconds?: number | null;
}

export interface SessionExchange {
    index: number;
    mainQuestionIndex?: number;
    type?: "main" | "followup";
    question: string;
    answer: string;
    timing?: SessionExchangeTiming;
    wordCount?: number;
}

/**
 * Legacy scorecard structure (0-100 scores) for backward compatibility.
 */
export interface LegacyScorecard {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
}

/**
 * Rubric 1.3 Competency Evaluation interface.
 */
export interface CompetencyEvaluation {
    key: string;
    name: string;
    weight_pct: number;
    weight_rationale?: string;
    bars_score: number | null;
    evidence_status: "Sufficient" | "Partial" | "Insufficient" | "Not Directly Assessed";
    observable_behaviors: string[];
    observed_gaps: string[];
    traceable_evidence: string[];
}

/**
 * Rubric 1.3 Per-Question Assessment interface.
 */
export interface QuestionEvaluation {
    question_number: number;
    question_text: string;
    targeted_competencies: string[];
    candidate_answer: string;
    follow_up?: {
        probe: string;
        response: string;
    } | null;
    bars_score: number | null;
    strengths: string[];
    gaps: string[];
    evaluator_note: string;
    scoring_rationale?: string;
    benchmark_model?: string;
}

/**
 * Rubric 1.3 7-Day Targeted Action Plan interface.
 */
export interface CoachingPlanAction {
    day_range: string;
    focus_area: string;
    actions: string[];
    expected_outcome: string;
}

/**
 * Universal Rubric 1.3 Executive Report schema.
 */
export interface Rubric13Report {
    rubric_version: "1.3";
    assessment_id: string;
    assessment_date: string;
    candidate: {
        name: string;
        target_role: string;
        track: string;
        interview_type: string;
        difficulty: string;
        language: string;
        evaluator_model: string;
    };
    overall_evaluation: {
        bars_score: number | null;
        performance_level: string;
        assessment_coverage_pct: number;
        evidence_completeness: "Sufficient" | "Partial" | "Insufficient";
        executive_summary: string;
    };
    competencies: CompetencyEvaluation[];
    questions_assessment: QuestionEvaluation[];
    action_plan_7_days: CoachingPlanAction[];
    descriptive_session_metrics?: {
        total_duration_minutes?: number;
        average_latency_seconds?: number | null;
        total_words?: number;
        total_exchanges?: number;
    };
}

/**
 * Represents the structure of the JSONB analysis column which tracks meeting/session data.
 */
export interface SessionAnalysis {
    job_description?: string;
    resume_name?: string;
    resume_text?: string;
    interview_type?: string; 
    difficulty?: string;
    language?: string;
    model?: string;
    question_count?: number;
    ai_responses?: string[];
    duration_minutes?: number;
    questions?: Record<string, unknown>[];
    session_exchanges?: SessionExchange[];
    started_at?: string;
    completed_at?: string;
    // Backward compatibility: legacy reports have scorecard
    scorecard?: LegacyScorecard | Record<string, unknown>;
    // Rubric 1.3 reports store structured report
    rubric_report?: Rubric13Report;
    rubric_version?: string;
}

/**
 * Enterprise-grade interface for a Database Record.
 * Represents a saved meeting/interview session from the backend.
 */
export interface Interview {
    id: string;
    user_id: string;
    title: string;
    transcript: string | null;
    analysis: SessionAnalysis | null;
    created_at: string;
}

/**
 * Custom App Error representing failed Service layer operations.
 */
export class InterviewServiceError extends Error {
    constructor(
        message: string,
        public readonly cause?: PostgrestError | Error | unknown
    ) {
        super(message);
        this.name = "InterviewServiceError";
    }
}

/**
 * Core Data Service layer for managing meeting transcripts and AI analysis.
 */
export const interviewService = {
    /**
     * Retrieves all saved sessions for the currently authenticated user.
     * @returns {Promise<Interview[]>} An array of meeting records.
     * @throws {InterviewServiceError} If authentication fails or database query errors.
     */
    getUserInterviews: async (): Promise<Interview[]> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new InterviewServiceError("User not authenticated", authError);
            }

            const { data, error } = await supabase
                .from('interviews')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                throw new InterviewServiceError("Failed to fetch meeting sessions", error);
            }
            
            return data as Interview[];
        } catch (error) {
            if (error instanceof InterviewServiceError) throw error;
            throw new InterviewServiceError("Unexpected error fetching sessions", error);
        }
    },

    /**
     * Retrieves a single session by its ID.
     */
    getInterviewById: async (id: string): Promise<Interview> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new InterviewServiceError("User not authenticated", authError);
            }

            const { data, error } = await supabase
                .from('interviews')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) {
                throw new InterviewServiceError("Failed to fetch meeting session", error);
            }
            
            return data as Interview;
        } catch (error) {
            if (error instanceof InterviewServiceError) throw error;
            throw new InterviewServiceError("Unexpected error fetching session", error);
        }
    },

    /**
     * Persists a newly completed meeting session to the cloud dataset.
     * @param title The identifying title of the transaction.
     * @param transcript The raw STT transcription text.
     * @param analysis The structured SessionAnalysis payload.
     * @returns {Promise<Interview>} The newly created DB record.
     * @throws {InterviewServiceError}
     */
    saveInterview: async (
        title: string,
        transcript: string,
        analysis: SessionAnalysis
    ): Promise<Interview> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new InterviewServiceError("User not authenticated", authError);
            }

            const { data, error } = await supabase
                .from('interviews')
                .insert({
                    user_id: user.id,
                    title,
                    transcript,
                    analysis
                })
                .select()
                .single();

            if (error) {
                throw new InterviewServiceError("Failed to save meeting session", error);
            }
            
            return data as Interview;
        } catch (error) {
            if (error instanceof InterviewServiceError) throw error;
            throw new InterviewServiceError("Unexpected error saving session", error);
        }
    },

    /**
     * Deletes a specific session ensuring RLS compliance and user ownership.
     * @param id The UUID of the record to delete.
     * @throws {InterviewServiceError}
     */
    deleteInterview: async (id: string): Promise<void> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new InterviewServiceError("User not authenticated", authError);
            }

            const { error } = await supabase
                .from('interviews')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id); // Strict ownership validation

            if (error) {
                throw new InterviewServiceError("Failed to delete meeting session", error);
            }
        } catch (error) {
            if (error instanceof InterviewServiceError) throw error;
            throw new InterviewServiceError("Unexpected error deleting session", error);
        }
    },

    /**
     * Updates an existing session (e.g., adding a scorecard).
     */
    updateInterview: async (id: string, updates: Partial<Interview>): Promise<Interview> => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new InterviewServiceError("User not authenticated", authError);
            }

            const { data, error } = await supabase
                .from('interviews')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error("Supabase update error:", error);
                throw new InterviewServiceError(`Failed to update meeting session: ${error.message || JSON.stringify(error)}`, error);
            }
            
            return data as Interview;
        } catch (error) {
            if (error instanceof InterviewServiceError) throw error;
            throw new InterviewServiceError("Unexpected error updating session", error);
        }
    },

    /**
     * Determines the report schema type to guarantee seamless backward compatibility.
     */
    getReportType: (interview: Interview): "rubric_1_3" | "legacy" | "in_progress" | "empty" => {
        const analysis = interview.analysis;
        if (!analysis) return "empty";
        if (analysis.rubric_report && analysis.rubric_report.rubric_version === "1.3") {
            return "rubric_1_3";
        }
        if (analysis.rubric_version === "1.3") {
            return "rubric_1_3";
        }
        if (analysis.scorecard && ("overallScore" in (analysis.scorecard as any))) {
            return "legacy";
        }
        if (analysis.questions && analysis.questions.length > 0) {
            return "in_progress";
        }
        return "empty";
    },

    /**
     * Derives a clean presentation Assessment ID bound 1:1 to the canonical interview UUID.
     */
    getPresentationAssessmentId: (interview: { id: string; created_at?: string }): string => {
        const year = interview.created_at ? new Date(interview.created_at).getFullYear() : new Date().getFullYear();
        const shortHex = interview.id.replace(/-/g, "").substring(0, 8).toUpperCase();
        return `ZEDX-${year}-${shortHex}`;
    }
};
