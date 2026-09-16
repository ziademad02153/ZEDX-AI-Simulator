"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, FileText, AlertCircle, ChevronDown, ChevronUp, Trash } from "lucide-react";
import { interviewService, Interview } from "@/lib/interview-service";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostHog } from 'posthog-js/react';

interface QAPair {
    question: string;
    answer: string;
}

// Helper function to parse transcript into Q&A pairs
function parseTranscriptToQA(transcript: string | null, aiResponses: string[] | undefined, storedQuestions?: string[]): QAPair[] {
    if (!transcript && (!aiResponses || aiResponses.length === 0)) return [];

    const pairs: QAPair[] = [];

    // If we have stored questions, use them directly
    if (storedQuestions && storedQuestions.length > 0 && aiResponses && aiResponses.length > 0) {
        storedQuestions.forEach((question, idx) => {
            if (aiResponses[idx]) {
                pairs.push({
                    question: question,
                    answer: aiResponses[idx]
                });
            }
        });
        return pairs;
    }

    // If we have AI responses, pair them with questions from transcript
    if (aiResponses && aiResponses.length > 0) {
        // Try to extract questions from formatted transcript (Q1: ... A1: ... format)
        const questions: string[] = [];
        const parts = (transcript || "").split(/\n\n---\n\n|(?=Q\d+:)/);
        parts.forEach(part => {
            const qMatch = part.match(/Q\d+:\s*([\s\S]+?)(?=\n\nA\d+:|$)/);
            if (qMatch && qMatch[1]) {
                questions.push(qMatch[1].trim());
            }
        });

        aiResponses.forEach((response, idx) => {
            const question = questions[idx] || `Question ${idx + 1}`;
            pairs.push({
                question: question,
                answer: response.replace(/^(A:|Answer:)\s*/i, '').trim()
            });
        });
    } else if (transcript) {
        // Parse transcript for Q&A patterns
        const sections = transcript.split(/(?=Q:|Question:|Interviewer:|Q\d+:)/i);
        sections.forEach(section => {
            if (section.trim()) {
                const parts = section.split(/(?=A:|Answer:|Candidate:|You:|A\d+:)/i);
                if (parts.length >= 2) {
                    pairs.push({
                        question: parts[0].replace(/^(Q:|Question:|Interviewer:|Q\d+:)\s*/i, '').trim(),
                        answer: parts.slice(1).join(' ').replace(/^(A:|Answer:|Candidate:|You:|A\d+:)\s*/i, '').trim()
                    });
                }
            }
        });
    }

    return pairs;
}

export default function InterviewHistoryPage() {
    const router = useRouter();
    const { confirm, showToast } = useConfirmDialog();
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const posthog = usePostHog();
    const loadInterviews = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await interviewService.getUserInterviews();
            setInterviews(data);
            setError(null);
        } catch (e: unknown) {
            const err = e as Error;
            if (err.message?.includes("User not authenticated")) {
                router.push("/login");
            } else {
                setError("Failed to load interviews");
                console.error(err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadInterviews();
    }, [loadInterviews]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: "Delete Interview",
            message: "Are you sure you want to delete this interview?",
            confirmText: "Delete",
            variant: "danger"
        });
        if (!confirmed) return;

        try {
            await interviewService.deleteInterview(id);
            setInterviews(prev => prev.filter(i => i.id !== id));
            showToast("Interview deleted", "success");
        } catch (e) {
            console.error("Failed to delete:", e);
            showToast("Failed to delete interview", "error");
        }
    };

    const handleDeleteAll = async () => {
        const confirmed = await confirm({
            title: "Delete All Interviews",
            message: "Are you sure you want to delete ALL interviews? This cannot be undone!",
            confirmText: "Delete All",
            variant: "danger"
        });
        if (!confirmed) return;

        try {
            await Promise.all(
                interviews.map(interview => interviewService.deleteInterview(interview.id))
            );
            setInterviews([]);
            showToast("All interviews deleted", "success");
        } catch (e) {
            console.error("Failed to delete all:", e);
            showToast("Failed to delete some interviews", "error");
            loadInterviews();
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleExpand = (id: string) => {
        if (expandedId !== id) {
            posthog.capture('report_viewed', { interview_id: id });
        }
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="p-3 sm:p-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="text-green-600" />
                    Interview History
                </h1>
                <div className="flex gap-2">
                    {interviews.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteAll}
                            className="flex items-center gap-2 text-xs sm:text-sm"
                        >
                            <Trash size={14} />
                            <span className="hidden sm:inline">Delete All</span>
                            <span className="sm:hidden">Delete</span>
                        </Button>
                    )}
                    <Button onClick={() => router.push("/dashboard/new")} size="sm" className="text-xs sm:text-sm">
                        <span className="hidden sm:inline">New Interview</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-6 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] border border-zinc-200/50 dark:border-white/10 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-2 w-full max-w-[200px]">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : interviews.length === 0 ? (
                <div className="text-center py-16 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md border border-dashed border-zinc-300 dark:border-zinc-700 rounded-[2.5rem]">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-500/10 rounded-full animate-ping opacity-20"></div>
                        <FileText size={32} className="text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No interviews recorded</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                        Your interview history will appear here. Ready to practice and master your next interview?
                    </p>
                    <Button
                        onClick={() => router.push("/dashboard/new")}
                        className="rounded-full shadow-lg shadow-emerald-500/20"
                        size="lg"
                    >
                        Start Your First Interview
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {interviews.map((interview) => {
                        const qaPairs = parseTranscriptToQA(
                            interview.transcript,
                            interview.analysis?.ai_responses,
                            interview.analysis?.questions
                        );

                        return (
                            <div
                                key={interview.id}
                                className={cn(
                                    "p-6 rounded-[2.5rem] border transition-all cursor-pointer backdrop-blur-xl shadow-xl shadow-zinc-200/10 dark:shadow-none",
                                    "bg-white/70 dark:bg-zinc-900/60 border-zinc-200/50 dark:border-white/10",
                                    expandedId === interview.id ? "shadow-lg ring-2 ring-green-500" : "hover:shadow-md"
                                )}
                                onClick={() => toggleExpand(interview.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {interview.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {formatDate(interview.created_at)}
                                        </p>
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {interview.analysis?.interview_type && (
                                                <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    {interview.analysis.interview_type}
                                                </span>
                                            )}
                                            {qaPairs.length > 0 && (
                                                <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-gray-300">
                                                    {qaPairs.length} Questions
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={(e) => handleDelete(interview.id, e)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                        {expandedId === interview.id ? (
                                            <ChevronUp size={20} className="text-gray-400" />
                                        ) : (
                                            <ChevronDown size={20} className="text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Content - Q&A Format */}
                                {expandedId === interview.id && (
                                    <div className="mt-4 space-y-4 border-t pt-4 border-gray-100 dark:border-zinc-700">
                                        {qaPairs.length > 0 ? (
                                            <div className="space-y-6">
                                                {qaPairs.map((qa, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        {/* Question */}
                                                        <div className="flex gap-3">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400">
                                                                Q
                                                            </span>
                                                            <p className="font-semibold text-green-700 dark:text-green-400 leading-relaxed">
                                                                {qa.question}
                                                            </p>
                                                        </div>
                                                        {/* Answer */}
                                                        <div className="flex gap-3 ml-0 sm:ml-2">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                                                A
                                                            </span>
                                                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                                                                {qa.answer}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Fallback: Show raw transcript if no Q&A pairs */
                                            interview.transcript && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        Transcript
                                                    </h4>
                                                    <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg max-h-48 overflow-y-auto">
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                                            {interview.transcript}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* Job Description (if available) */}
                                        {interview.analysis?.job_description && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Job Description
                                                </h4>
                                                <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg max-h-32 overflow-y-auto">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {interview.analysis.job_description.slice(0, 500)}
                                                        {interview.analysis.job_description.length > 500 && "..."}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
