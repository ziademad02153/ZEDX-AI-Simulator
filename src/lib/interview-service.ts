import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Represents the structure of the JSONB analysis column which tracks meeting/session data.
 */
export interface SessionAnalysis {
    job_description?: string;
    resume_name?: string;
    interview_type?: string; 
    language?: string;
    ai_responses?: string[];
    duration_minutes?: number;
    questions?: any[];
    scorecard?: Record<string, unknown>;
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
    }
};
