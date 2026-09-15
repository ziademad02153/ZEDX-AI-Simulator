"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { interviewService, Interview } from "@/lib/interview-service";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Target, MessageSquare, Brain, CheckCircle, AlertTriangle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import Link from "next/link";


// Define the expected structure of our AI scorecard
interface Scorecard {
    overallScore: number;
    technicalScore: number;
    communicationScore: number;
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // Unwrap the params Promise (Next.js 15 requirement)
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;

    const [interview, setInterview] = useState<Interview | null>(null);
    const [scorecard, setScorecard] = useState<Scorecard | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState(false);

    // Prevent accidental reload while generating the scorecard
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isGenerating && !scorecard) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isGenerating, scorecard]);

    useEffect(() => {
        const fetchInterview = async () => {
            try {
                const data = await interviewService.getInterviewById(id);
                setInterview(data);

                if (data.analysis?.scorecard) {
                    // Scorecard already exists!
                    setScorecard(data.analysis.scorecard as unknown as Scorecard);
                } else {
                    // Generate it!
                    generateScorecard(data);
                }
            } catch (err: unknown) {
                console.error(err);
                setError("Failed to load interview report.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInterview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const generateScorecard = async (data: Interview) => {
        setIsGenerating(true);
        try {
            const userPrompt = `
Interview Type: ${data.analysis?.interview_type || "General"}
Questions and Transcript:
${data.transcript || "No transcript available. Assume a standard successful interview."}

AI Responses generated during session (Candidate's Answers):
${data.analysis?.ai_responses?.length ? data.analysis.ai_responses.join("\n\n") : "Standard excellent responses."}
`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s frontend timeout

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "openai/gpt-oss-120b", // Using a stronger model for analysis
                    promptType: 'report_deep_analysis',
                    promptContext: { language: data.analysis?.language || "en-US" },
                    prompt: userPrompt,
                    response_format: { type: "json_object" }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Failed to generate scorecard");

            const resData = await response.json();
            let parsedScorecard;

            try {
                // With Structured Outputs (json_object), the response is guaranteed to be valid JSON
                parsedScorecard = JSON.parse(resData.content.trim());
            } catch (parseError) {
                console.warn("Standard JSON parse failed, attempting regex extraction...", parseError);
                // Robust fallback for markdown-wrapped JSON (e.g. ```json ... ```)
                const jsonMatch = resData.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedScorecard = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("Could not extract JSON from AI response.");
                }
            }

            // Update the state
            setScorecard(parsedScorecard);

            // Save back to DB
            const updatedAnalysis = { ...data.analysis, scorecard: parsedScorecard as Record<string, unknown> };
            await interviewService.updateInterview(id, { analysis: updatedAnalysis });

        } catch (err) {
            console.error("Error generating scorecard:", err);
            setGenerationError(true);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                    <p className="animate-pulse">Loading meeting data...</p>
                </div>
            </div>
        );
    }

    if (error || !interview) {
        return (
            <div className="min-h-screen p-8 bg-gray-50 dark:bg-zinc-950">
                <Link href="/dashboard">
                    <Button variant="ghost" className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
                </Link>
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 max-w-2xl mx-auto">
                    {error || "Interview not found."}
                </div>
            </div>
        );
    }

    if (generationError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-[#0a0a0a]">
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-red-200/50 dark:border-red-500/20 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-orange-500 to-red-400"></div>
                    <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Analysis Failed</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        We couldn't generate the scorecard due to a network or server issue. Your meeting data is saved safely. Please try again.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={() => {
                                setGenerationError(false);
                                if (interview) generateScorecard(interview);
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-6"
                        >
                            Retry Analysis
                        </Button>
                        <Link href="/dashboard" className="w-full">
                            <Button variant="ghost" className="w-full rounded-xl py-6 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isGenerating && !scorecard) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-[#0a0a0a]">
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-white/10 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-gradient-x"></div>
                    <Brain className="w-16 h-16 mx-auto mb-6 text-emerald-500 animate-bounce" />
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Analyzing Session...</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">ZEDX AI is processing your responses, evaluating technical accuracy, and calculating your final score.</p>
                    <div className="flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    </div>
                </div>
            </div>
        );
    }

    // Helper for circular progress
    const CircularProgress = ({ value, label, icon: Icon, colorClass, gradientId, fromColor, toColor, fromClass, toClass }: { value: number, label: string, icon: any, colorClass: string, gradientId: string, fromColor: string, toColor: string, fromClass: string, toClass: string }) => (
        <div className="flex flex-col items-center p-8 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className={`absolute -top-10 -right-10 w-40 h-40 opacity-10 dark:opacity-20 rounded-full blur-2xl bg-gradient-to-br ${fromClass} ${toClass}`}></div>
            <div className="relative w-36 h-36 mb-6">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 36 36">
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={fromColor} />
                            <stop offset="100%" stopColor={toColor} />
                        </linearGradient>
                    </defs>
                    <path
                        className="text-zinc-100 dark:text-white/5"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                        className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                        strokeWidth="3.5"
                        strokeDasharray={`${value}, 100`}
                        strokeLinecap="round"
                        stroke={`url(#${gradientId})`}
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tighter">{value}<span className="text-xl text-gray-400">%</span></span>
                </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-300 font-semibold tracking-wide flex items-center gap-2">
                <Icon className={`w-5 h-5 ${colorClass}`} /> {label}
            </h3>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] p-4 sm:p-8 pt-24 font-sans relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
            
            <div className="max-w-6xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="mb-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Performance Scorecard
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {interview.title} • {new Date(interview.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {scorecard && (
                    <>
                        {/* Scores Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <CircularProgress
                                value={scorecard.overallScore}
                                label="Overall Score"
                                icon={Target}
                                colorClass="text-emerald-500"
                                gradientId="grad-overall"
                                fromColor="#10b981"
                                toColor="#14b8a6"
                                fromClass="from-emerald-500"
                                toClass="to-teal-500"
                            />
                            <CircularProgress
                                value={scorecard.technicalScore}
                                label="Technical Accuracy"
                                icon={Brain}
                                colorClass="text-blue-500"
                                gradientId="grad-tech"
                                fromColor="#3b82f6"
                                toColor="#6366f1"
                                fromClass="from-blue-500"
                                toClass="to-indigo-500"
                            />
                            <CircularProgress
                                value={scorecard.communicationScore}
                                label="Communication"
                                icon={MessageSquare}
                                colorClass="text-purple-500"
                                gradientId="grad-comm"
                                fromColor="#a855f7"
                                toColor="#ec4899"
                                fromClass="from-purple-500"
                                toClass="to-pink-500"
                            />
                        </div>

                        {/* Analysis Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Strengths */}
                            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-900/50 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-emerald-500/10 dark:shadow-none">
                                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 mb-6 flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6" /> Key Strengths
                                </h3>
                                <ul className="space-y-4">
                                    {scorecard.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-3 text-emerald-900 dark:text-emerald-100 font-medium">
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="leading-relaxed">{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Improvements */}
                            <div className="bg-amber-50/70 dark:bg-amber-950/20 backdrop-blur-xl border border-amber-200/50 dark:border-amber-900/50 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-amber-500/10 dark:shadow-none">
                                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-6 flex items-center gap-3">
                                    <AlertTriangle className="w-6 h-6" /> Areas for Improvement
                                </h3>
                                <ul className="space-y-4">
                                    {scorecard.improvements.map((s, i) => (
                                        <li key={i} className="flex items-start gap-3 text-amber-900 dark:text-amber-100 font-medium">
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                            <span className="leading-relaxed">{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Detailed Feedback */}
                        <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-zinc-200/50 dark:shadow-none">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Detailed Assessment</h3>
                            <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                                <ReactMarkdown>{scorecard.detailedFeedback}</ReactMarkdown>
                            </div>
                        </div>
                    </>
                )}

                {/* Transcript Archive */}
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-zinc-200/50 dark:shadow-none mt-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Session Transcript Archive</h3>
                    <div className="bg-gray-100/50 dark:bg-black/40 rounded-3xl p-8 whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/5 max-h-96 overflow-y-auto leading-relaxed shadow-inner">
                        {interview.transcript || "No transcript recorded for this session."}
                    </div>
                </div>

            </div>
        </div>
    );
}
