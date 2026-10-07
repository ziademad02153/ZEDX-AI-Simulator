"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { interviewService, Interview, Rubric13Report, LegacyScorecard } from "@/lib/interview-service";
import { enforceRubric13ReportSchema } from "@/lib/rubric-evaluator";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Brain, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RubricReportView } from "@/components/report/rubric-report-view";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params);
    const id = unwrappedParams.id;

    const [interview, setInterview] = useState<Interview | null>(null);
    const [rubricReport, setRubricReport] = useState<Rubric13Report | null>(null);
    const [scorecard, setScorecard] = useState<LegacyScorecard | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState(false);

    // Prevent accidental reload while generating report
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isGenerating && !rubricReport && !scorecard) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isGenerating, rubricReport, scorecard]);

    useEffect(() => {
        const fetchInterview = async () => {
            try {
                const data = await interviewService.getInterviewById(id);
                setInterview(data);

                const forceRegenerate = typeof window !== "undefined" && window.location.search.includes("regenerate=rubric");

                if (!forceRegenerate && data.analysis?.rubric_report && data.analysis.rubric_report.rubric_version === "1.3") {
                    const rawReport = data.analysis.rubric_report;
                    const exchanges = (data.analysis as any)?.session_exchanges || [];
                    const sanitized = enforceRubric13ReportSchema(rawReport, {
                        assessmentId: rawReport.assessment_id || `ZEDX-${id.slice(0, 8).toUpperCase()}`,
                        assessmentDate: rawReport.assessment_date || data.created_at,
                        candidateName: rawReport.candidate?.name || "Candidate",
                        targetRole: (data.analysis as any)?.target_role || rawReport.candidate?.target_role || (data.title ? data.title.replace(/^Interview - /, '') : "Software Developer"),
                        track: data.analysis?.interview_type || rawReport.candidate?.track || "Role-Specific",
                        interviewType: data.analysis?.interview_type || rawReport.candidate?.interview_type || "Technical",
                        difficulty: data.analysis?.difficulty || rawReport.candidate?.difficulty || "Intermediate",
                        language: data.analysis?.language || rawReport.candidate?.language || "en-US",
                        evaluatorModel: rawReport.candidate?.evaluator_model || "openai/gpt-oss-120b",
                        sessionExchanges: exchanges,
                        descriptiveMetrics: (rawReport as any).session_telemetry || rawReport.descriptive_session_metrics
                    });

                    setRubricReport(sanitized);
                    setScorecard((data.analysis.scorecard as LegacyScorecard) || null);

                    // Auto-heal DB record if it had stale flaws (1.1, Below Bar, etc.)
                    const hadDefects = rawReport.overall_evaluation?.bars_score === 1.1 ||
                        String(rawReport.overall_evaluation?.performance_level || "").toLowerCase().includes("below bar") ||
                        (rawReport.overall_evaluation?.assessment_coverage_pct === 0 && rawReport.overall_evaluation?.bars_score !== null);
                    
                    if (hadDefects) {
                        interviewService.updateInterview(id, {
                            analysis: {
                                ...data.analysis,
                                rubric_report: sanitized
                            }
                        }).catch(() => {});
                    }
                } else if (!forceRegenerate && data.analysis?.scorecard) {
                    // Pure legacy interview from before Rubric 1.3
                    setScorecard(data.analysis.scorecard as LegacyScorecard);
                } else {
                    // Generate new Rubric 1.3 report!
                    generateReport(data);
                }
            } catch (err: unknown) {
                console.error("Failed to load interview report:", err);
                setError("Failed to load interview report.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInterview();
    }, [id]);

    const generateReport = async (data: Interview) => {
        setIsGenerating(true);
        setGenerationError(false);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 65000);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch("/api/generate-report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ interviewId: id }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || "Failed to generate report");
            }

            const resData = await response.json();
            if (resData.rubric_report) {
                setRubricReport(resData.rubric_report);
            }
            if (resData.scorecard) {
                setScorecard(resData.scorecard);
            }

        } catch (err) {
            console.error("Error generating report:", err);
            setGenerationError(true);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                    <p className="animate-pulse text-sm font-medium">Loading executive assessment...</p>
                </div>
            </div>
        );
    }

    if (error || !interview) {
        return (
            <div className="min-h-screen p-8 bg-slate-50 dark:bg-zinc-950">
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
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0a0a0a]">
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-red-200/50 dark:border-red-500/20 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-orange-500 to-red-400" />
                    <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Analysis Interrupted</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                        The AI evaluation engine timed out or experienced high traffic. Your interview responses are saved safely. Please retry the assessment.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => {
                                if (interview) generateReport(interview);
                            }}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-6"
                        >
                            Retry Evaluation
                        </Button>
                        <Link href="/dashboard" className="w-full">
                            <Button variant="ghost" className="w-full rounded-xl py-6 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isGenerating && !rubricReport && !scorecard) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#070708]">
                <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-slate-200/50 dark:border-white/10 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#9df400] via-lime-400 to-[#9df400] animate-pulse" />
                    
                    {/* Authentic ZEDX Brand Icon with subtle glow */}
                    <div className="relative mx-auto mb-6 w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-2xl bg-[#9df400]/20 blur-xl animate-pulse" />
                        <div className="relative w-16 h-16 rounded-2xl bg-black border border-white/15 flex items-center justify-center shadow-2xl p-2.5 overflow-hidden">
                            <img src="/apple-touch-icon.png" alt="ZEDX Logo" className="w-full h-full object-contain rounded-lg" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Generating Performance Analysis Report</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                        ZEDX AI is analyzing your spoken responses, extracting verifiable evidence quotes, evaluating 5 universal competencies, and synthesizing your personalized action plan.
                    </p>
                    <div className="flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#9df400]" />
                    </div>
                </div>
            </div>
        );
    }

    const isLegacy = !rubricReport && !!scorecard;

    return (
        <RubricReportView 
            interview={interview}
            rubricReport={rubricReport}
            legacyScorecard={scorecard}
            isLegacy={isLegacy}
        />
    );
}
