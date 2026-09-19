import { create } from 'zustand';

interface InterviewState {
    interviewType: string;
    jobDescription: string;
    resumeText: string;
    language: string;
    difficulty: string;
    setInterviewContext: (context: Partial<Omit<InterviewState, 'setInterviewContext' | 'reset'>>) => void;
    reset: () => void;
}

const initialState = {
    interviewType: 'General',
    jobDescription: '',
    resumeText: '',
    language: 'en-US',
    difficulty: 'Intermediate'
};

export const useInterviewStore = create<InterviewState>((set) => ({
    ...initialState,
    setInterviewContext: (context) => set((state) => ({ ...state, ...context })),
    reset: () => set(initialState)
}));
