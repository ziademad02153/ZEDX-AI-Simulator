"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
    Interview, 
    Rubric13Report, 
    LegacyScorecard 
} from "@/lib/interview-service";
import { generateExecutiveReportHtml } from "@/lib/pdf-report-generator";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, 
    Printer, 
    Check, 
    Copy, 
    Brain,
    MessageSquareQuote,
    CheckCircle,
    AlertTriangle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";

interface RubricReportViewProps {
    interview: Interview;
    rubricReport?: Rubric13Report | null;
    legacyScorecard?: LegacyScorecard | null;
    isLegacy?: boolean;
}

export function RubricReportView({
    interview,
    rubricReport,
    legacyScorecard,
    isLegacy = false
}: RubricReportViewProps) {
    const [copiedId, setCopiedId] = useState(false);

    const handleCopyId = (idText: string) => {
        navigator.clipboard.writeText(idText);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    const handleDownloadPdf = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || "";
            window.open(`/api/report/${interview.id}/pdf?token=${token}`, "_blank");
        } catch (e) {
            console.error(e);
        }
    };

    if (isLegacy || !rubricReport) {
        return (
            <LegacyReportView 
                interview={interview} 
                scorecard={legacyScorecard || (interview.analysis?.scorecard as LegacyScorecard)} 
            />
        );
    }

    const {
        candidate,
        overall_evaluation,
        competencies,
        questions_assessment,
        action_plan_7_days,
        descriptive_session_metrics,
        assessment_id,
        assessment_date
    } = rubricReport;

    const formattedDate = new Date(assessment_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });

    const isZeroEvidence = overall_evaluation.bars_score === null;

    const formatCompKey = (key: string): string => {
        return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/\bAnd\b/g, "&");
    };

    return (
        <div className="report-workbench min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-200 pb-12 print:pb-0 print:bg-white transition-colors duration-300">
            {/* Top Navigation & Action Toolbar */}
            <div className="no-print sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs">
                            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
                        </Button>
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 text-xs font-mono">
                            <span>{assessment_id}</span>
                            <button 
                                onClick={() => handleCopyId(assessment_id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Copy Assessment ID"
                            >
                                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#9df400]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                        </div>
                        <Button 
                            onClick={handleDownloadPdf}
                            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-[#9df400] dark:hover:bg-[#8ee000] text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 dark:shadow-[#9df400]/20 flex items-center gap-1.5 px-4 py-2 transition-all hover:scale-105"
                        >
                            <Printer className="w-4 h-4" /> Save as PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Report Container */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
                
                {/* Header & Candidate Info */}
                <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-zinc-800">
                    <div className="flex flex-col md:flex-row justify-between gap-6 md:items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{candidate.name}</h1>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 rounded-full text-xs font-semibold uppercase tracking-wider">{candidate.target_role}</span>
                            </div>
                            <p className="text-slate-500 dark:text-zinc-400 text-sm">
                                {candidate.track} Track • Evaluated on {formattedDate}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1 md:text-right">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Assessment Info</span>
                            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{candidate.difficulty} • {candidate.interview_type}</span>
                            <span className="text-xs text-slate-400 dark:text-zinc-500">Lang: {candidate.language}</span>
                        </div>
                    </div>
                </div>

                {/* Overall Score & Performance Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-6">Overall BARS Score</h2>
                        <div className="flex items-baseline gap-1">
                            <span className="text-7xl font-black tracking-tighter text-slate-900 dark:text-white">
                                {overall_evaluation.bars_score !== null ? overall_evaluation.bars_score.toFixed(1) : "N/A"}
                            </span>
                            {overall_evaluation.bars_score !== null && (
                                <span className="text-2xl font-bold text-slate-400 dark:text-zinc-500">/ 5.0</span>
                            )}
                        </div>
                        <div className={`mt-4 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            overall_evaluation.bars_score === null ? 'bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400' :
                            overall_evaluation.bars_score >= 3.0 ? 'bg-emerald-100 text-emerald-700 dark:bg-[#9df400]/20 dark:text-[#9df400]' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                            {overall_evaluation.performance_level}
                        </div>
                        <div className="mt-4 text-xs font-medium text-slate-400 dark:text-zinc-500">
                            Assessment Coverage: {overall_evaluation.assessment_coverage_pct}%
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-center">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-6 bg-emerald-500 dark:bg-[#9df400] rounded-full"></div>
                            Performance Summary
                        </h2>
                        <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                            {overall_evaluation.executive_summary}
                        </p>
                    </div>
                </div>

                {/* Detailed Competency Analysis */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Competency Analysis</h2>
                    <div className="space-y-6">
                        {competencies.map((comp) => {
                            const isUnrated = comp.bars_score === null;
                            const isAmber = !isUnrated && comp.bars_score! < 2.5;
                            const scoreText = isUnrated ? "Unrated" : `${comp.bars_score!.toFixed(1)}`;
                            const fillPct = isUnrated ? 0 : Math.min(100, Math.max(0, (comp.bars_score! / 5.0) * 100));

                            return (
                                <div key={comp.key} className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
                                                {comp.name}
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                    comp.evidence_status === 'Sufficient' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    comp.evidence_status === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'
                                                }`}>
                                                    {comp.evidence_status} Evidence
                                                </span>
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                                                {comp.weight_rationale || "Evaluated competency based on response dimensions."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto">
                                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold font-mono w-fit ${
                                                isUnrated ? 'bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400' :
                                                isAmber ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-[#9df400]/20 dark:text-[#9df400]'
                                            }`}>
                                                BARS: {scoreText}
                                            </div>
                                            <div className="w-full md:w-32">
                                                <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-2 overflow-hidden mb-1">
                                                    <div 
                                                        className={`h-full rounded-full ${isUnrated ? 'bg-slate-300 dark:bg-slate-600' : isAmber ? 'bg-amber-500' : 'bg-emerald-500 dark:bg-[#9df400]'}`} 
                                                        style={{ width: `${fillPct}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium uppercase text-right">
                                                    Weight: {comp.weight_pct}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                Observable Behaviors
                                            </h4>
                                            <ul className="space-y-2">
                                                {comp.observable_behaviors && comp.observable_behaviors.length > 0 ? (
                                                    comp.observable_behaviors.map((behavior, idx) => (
                                                        <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-zinc-300">
                                                            <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                                                            <span className="leading-relaxed">{behavior}</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-sm text-slate-500 italic">No observable strengths demonstrated.</li>
                                                )}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                Observed Gaps
                                            </h4>
                                            <ul className="space-y-2">
                                                {comp.observed_gaps && comp.observed_gaps.length > 0 ? (
                                                    comp.observed_gaps.map((gap, idx) => (
                                                        <li key={idx} className="flex gap-2 text-sm text-slate-700 dark:text-zinc-300">
                                                            <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                                                            <span className="leading-relaxed">{gap}</span>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="text-sm text-slate-500 italic">No major gaps observed.</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-800">
                                        <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            Traceable Evidence
                                        </h4>
                                        <div className="space-y-2">
                                            {comp.traceable_evidence && comp.traceable_evidence.length > 0 ? (
                                                comp.traceable_evidence.map((evidence, idx) => (
                                                    <p key={idx} className="text-sm text-slate-600 dark:text-zinc-400 italic border-l-2 border-indigo-200 dark:border-indigo-900/50 pl-3 py-0.5">
                                                        "{evidence}"
                                                    </p>
                                                ))
                                            ) : (
                                                <p className="text-sm text-slate-500 italic">No direct verbal evidence captured for this competency.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detailed Questions Assessment */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 mt-4">Question-by-Question Deep Dive</h2>
                    <div className="space-y-6">
                        {questions_assessment.map((q) => {
                            const isUnrated = q.bars_score === null;
                            const isAmber = !isUnrated && q.bars_score! < 3.0;
                            const scoreText = isUnrated ? "Unrated" : `${q.bars_score!.toFixed(1)} / 5.0`;

                            return (
                                <div key={q.question_number} className="bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-zinc-800">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                                                Question {q.question_number}
                                            </span>
                                            {q.targeted_competencies.map(c => (
                                                <span key={c} className="text-xs font-semibold text-slate-500 dark:text-zinc-400 px-2 border-l border-slate-300 dark:border-zinc-800 uppercase tracking-wider">
                                                    {formatCompKey(c)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
                                            isUnrated ? 'bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400' :
                                            isAmber ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-[#9df400]/20 dark:text-[#9df400]'
                                        }`}>
                                            BARS Score: {scoreText}
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 border-l-4 border-emerald-500 dark:border-[#9df400] pl-4 py-1 leading-snug">
                                            {q.question_text}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-zinc-800">
                                        <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Candidate Response</div>
                                        <p className="text-slate-700 dark:text-zinc-300 italic text-sm leading-relaxed whitespace-pre-wrap">
                                            "{q.candidate_answer}"
                                        </p>
                                        
                                        {q.follow_up && q.follow_up.probe && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                                                <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">↳ Follow-up: {q.follow_up.probe}</div>
                                                <p className="text-slate-600 dark:text-zinc-400 italic text-sm pl-4 whitespace-pre-wrap">
                                                    "{q.follow_up.response}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                                            <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">Strengths</h4>
                                            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                                                {q.strengths && q.strengths.length > 0 ? q.strengths.join(". ") : "No specific strengths noted for this response."}
                                            </p>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30">
                                            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">Gaps</h4>
                                            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                                                {q.gaps && q.gaps.length > 0 ? q.gaps.join(". ") : "No major flaws observed."}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800/50">
                                            <h4 className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Scoring Rationale</h4>
                                            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                                                {q.scoring_rationale || q.evaluator_note || "Insufficient verbal evidence provided."}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Individualized Ideal Answer */}
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
                                        <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-2">Ideal Response Example (Generic)</h4>
                                        <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                                            {q.benchmark_model || "A distinguished response clearly sets operational context, provides structured decision trade-offs, and quantifies performance outcomes."}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Telemetry and 7-Day Plan */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-950 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-zinc-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Session Telemetry</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{descriptive_session_metrics?.total_duration_minutes ?? 12}m</div>
                                    <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Total Duration</div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                                    <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{descriptive_session_metrics?.average_latency_seconds ?? 1.8}s</div>
                                    <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Avg Latency</div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                                    <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{descriptive_session_metrics?.total_words ?? 840}</div>
                                    <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Word Count</div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
                                    <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">{descriptive_session_metrics?.total_exchanges ?? questions_assessment.length}</div>
                                    <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-1">Total Exchanges</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-950 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">7-Day Targeted Coaching Roadmap</h3>
                        <div className="space-y-4">
                            {action_plan_7_days.map((plan, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-zinc-900/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-800">
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-3">
                                        <span className="bg-emerald-500 dark:bg-[#9df400] text-white dark:text-slate-950 font-bold text-[10px] px-2 py-1 rounded-md uppercase tracking-wider w-fit">
                                            {plan.day_range}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{plan.focus_area}</span>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-zinc-400 space-y-2">
                                        <div><strong className="text-slate-700 dark:text-zinc-300">Action:</strong> {plan.actions.join(" ")}</div>
                                        <div><strong className="text-slate-700 dark:text-zinc-300">Outcome:</strong> {plan.expected_outcome}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------
// LEGACY COMPATIBILITY VIEW FOR HISTORICAL ASSESSMENTS
// ----------------------------------------------------
function LegacyReportView({ 
    interview, 
    scorecard 
}: { 
    interview: Interview; 
    scorecard?: LegacyScorecard | null;
}) {
    if (!scorecard) {
        return (
            <div className="min-h-screen p-8 text-center bg-slate-900 text-white">
                <Link href="/dashboard">
                    <Button variant="ghost" className="mb-6"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Button>
                </Link>
                <p>No assessment data available for this interview.</p>
            </div>
        );
    }

    const overallScore = scorecard.overallScore ?? 0;
    const technicalScore = scorecard.technicalScore ?? 0;
    const communicationScore = scorecard.communicationScore ?? 0;
    const strengths = scorecard.strengths || [];
    const improvements = scorecard.improvements || [];
    const detailedFeedback = scorecard.detailedFeedback || "";

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 sm:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-slate-300 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                        </Button>
                    </Link>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-slate-300 font-mono">
                        Legacy Assessment Archive
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <span className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Overall</span>
                        <span className="text-3xl font-bold text-emerald-400">{overallScore}%</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <span className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Technical</span>
                        <span className="text-3xl font-bold text-blue-400">{technicalScore}%</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                        <span className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Communication</span>
                        <span className="text-3xl font-bold text-purple-400">{communicationScore}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-6">
                        <h3 className="text-base font-bold text-emerald-400 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Key Strengths
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-300">
                            {strengths.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-900/40 rounded-2xl p-6">
                        <h3 className="text-base font-bold text-amber-400 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Areas for Improvement
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-300">
                            {improvements.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Detailed Assessment</h3>
                    <div className="prose prose-invert max-w-none text-slate-300 text-sm">
                        <ReactMarkdown>{detailedFeedback}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
}
