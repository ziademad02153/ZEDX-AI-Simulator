"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Award, ChevronRight, BarChart2, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ReportItem {
    question: string;
    answer: string;
    score: number;
    feedback: string;
    ideal_answer: string;
}

function ScoreRing({ score, size = 180, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 10) * circumference;
    const getColor = (s: number) => {
        if (s >= 9) return { stroke: "#10b981", glow: "rgba(16,185,129,0.6)", text: "#10b981" };
        if (s >= 7) return { stroke: "#14b8a6", glow: "rgba(20,184,166,0.6)", text: "#14b8a6" };
        if (s >= 5) return { stroke: "#f59e0b", glow: "rgba(245,158,11,0.6)", text: "#f59e0b" };
        return { stroke: "#f43f5e", glow: "rgba(244,63,94,0.6)", text: "#f43f5e" };
    };
    const colors = getColor(score);
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: `0 0 60px 10px ${colors.glow}`, opacity: 0.3 }} />
            <svg width={size} height={size} className="absolute inset-0 -rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
                <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - progress }} transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }} style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 1.2 }} className="font-thin leading-none" style={{ fontSize: size * 0.28, color: colors.text }}>{score}</motion.span>
                <span className="text-white/30 font-light" style={{ fontSize: size * 0.1 }}>/10</span>
            </div>
        </div>
    );
}

function ScoreMiniRing({ score }: { score: number }) {
    const getColor = (s: number) => {
        if (s >= 9) return { stroke: "#10b981", glow: "rgba(16,185,129,0.8)", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };
        if (s >= 7) return { stroke: "#14b8a6", glow: "rgba(20,184,166,0.8)", bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-400" };
        if (s >= 5) return { stroke: "#f59e0b", glow: "rgba(245,158,11,0.8)", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
        return { stroke: "#f43f5e", glow: "rgba(244,63,94,0.8)", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" };
    };
    const c = getColor(score);
    const circumference = 2 * Math.PI * 18;
    const progress = (score / 10) * circumference;
    return (
        <div className="relative w-12 h-12 shrink-0">
            <svg width="48" height="48" className="absolute inset-0 -rotate-90">
                <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                <motion.circle cx="24" cy="24" r="18" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} whileInView={{ strokeDashoffset: circumference - progress }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }} />
            </svg>
            <span className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] font-bold z-10", c.text)}>{score}</span>
        </div>
    );
}

export default function ReportPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [report, setReport] = useState<ReportItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        const generateReport = async () => {
            try {
                const historyRaw = localStorage.getItem("interview_results");
                if (!historyRaw) { router.push("/dashboard"); return; }
                const history = JSON.parse(historyRaw);
                const model = localStorage.getItem("selected_ai_model") || "qwen/qwen3.8-27b";
                const { supabase } = await import("@/lib/supabase");
                let { data: { session } } = await supabase.auth.getSession();
                
                // Silent refresh if available
                if (session) {
                    try {
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                        if (!refreshError && refreshData.session) {
                            session = refreshData.session;
                        }
                    } catch (e) {
                        console.warn("Silent refresh failed", e);
                    }
                }

                const lang = localStorage.getItem("interview_context_lang") || "en-US";
                
                // Send a SINGLE request to the backend with the full history. 
                // The backend will chunk and parallelize it to prevent Supabase Auth rate limits (401 errors).
                const res = await fetch("/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ 
                        model, 
                        promptType: "report_evaluator", 
                        promptContext: { language: lang }, 
                        history: history // Pass history array directly for backend chunking
                    })
                });
                
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to generate report: ${res.status} - ${errorText}`);
                }
                
                const data = await res.json();
                let parsedReport = data.parsedReport || [];
                
                if (parsedReport.length === 0) {
                     throw new Error("Could not extract any valid data from AI response.");
                }
                
                setReport(parsedReport);
                try {
                    const { interviewService } = await import("@/lib/interview-service");
                    const currentDbId = localStorage.getItem("current_db_id");
                    const title = "Mock Interview Session";
                    const transcript = history.map((h: any) => `Q: ${h.q}\nA: ${h.a}`).join("\n\n");
                    const analysis = { scorecard: parsedReport };
                    
                    if (currentDbId) {
                        await interviewService.updateInterview(currentDbId, { title, transcript, analysis });
                        localStorage.removeItem("current_db_id");
                    } else {
                        await interviewService.saveInterview(title, transcript, analysis);
                    }
                } catch (e) { console.warn("Failed to save to DB"); }
            } catch (err: any) {
                // Log message only to prevent Next.js Error Overlay in Dev mode
                console.warn("REPORT GENERATION ERROR:", err?.message || err);
                setError(err?.message || "Failed to generate report. The AI is temporarily unavailable or timed out.");
            } finally { setIsLoading(false); }
        };
        generateReport();
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/15 rounded-full blur-[60px]" />
                </div>
                <div className="z-10 flex flex-col items-center gap-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="relative w-32 h-32">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth="2" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round" strokeDasharray="70 212" />
                            <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" stopOpacity="0" /><stop offset="100%" stopColor="#10b981" stopOpacity="1" /></linearGradient></defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 relative"><Image src="/zedx-logo.png" alt="ZEDX" fill className="object-contain filter drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]" /></div>
                        </div>
                    </motion.div>
                    <div className="text-center">
                        <motion.h2 animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="text-2xl font-light tracking-[0.3em] uppercase text-white mb-2">Analyzing Performance</motion.h2>
                        <p className="text-white/30 text-sm tracking-widest">AI is reviewing your interview...</p>
                    </div>
                    <div className="w-72 h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)", boxShadow: "0 0 20px rgba(16,185,129,0.8)" }} initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6"><AlertTriangle className="w-10 h-10 text-rose-400" /></div>
                <h2 className="text-3xl font-light mb-3">Analysis Interrupted</h2>
                <p className="text-white/40 mb-10 max-w-md text-center font-light">{error}</p>
                <Link href="/dashboard"><Button className="h-12 px-8 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">Return to Dashboard</Button></Link>
            </div>
        );
    }

    const averageScore = Math.round(report.reduce((acc, curr) => acc + curr.score, 0) / report.length);

    const getTier = (score: number) => {
        if (score >= 9) return { label: "Exceptional", emoji: "🏆", color: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10", glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]", ringColor: "#10b981", ringGlow: "rgba(16,185,129,0.5)" };
        if (score >= 7) return { label: "Proficient", emoji: "⭐", color: "text-teal-400", border: "border-teal-500/40", bg: "bg-teal-500/10", glow: "shadow-[0_0_60px_rgba(20,184,166,0.12)]", ringColor: "#14b8a6", ringGlow: "rgba(20,184,166,0.5)" };
        if (score >= 5) return { label: "Developing", emoji: "📈", color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10", glow: "shadow-[0_0_60px_rgba(245,158,11,0.12)]", ringColor: "#f59e0b", ringGlow: "rgba(245,158,11,0.5)" };
        return { label: "Needs Focus", emoji: "🎯", color: "text-rose-400", border: "border-rose-500/40", bg: "bg-rose-500/10", glow: "shadow-[0_0_60px_rgba(244,63,94,0.12)]", ringColor: "#f43f5e", ringGlow: "rgba(244,63,94,0.5)" };
    };

    const overall = getTier(averageScore);

    return (
        <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden print:bg-white print:text-black">
            {/* Ambient BG */}
            <div className="fixed inset-0 pointer-events-none print:hidden">
                <div className="absolute top-[-30%] right-[-10%] w-[70vw] h-[70vw] rounded-full opacity-40" style={{ background: `radial-gradient(circle, ${overall.ringGlow} 0%, transparent 70%)`, filter: "blur(80px)" }} />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
            </div>

            <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-8 py-8 sm:py-14">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center justify-between mb-16 print:mb-8">
                    <div className="flex items-center gap-5">
                        <Link href="/dashboard" className="print:hidden">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </motion.button>
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extralight tracking-tight text-white print:text-black">Performance Analysis <span className="font-semibold">Report</span></h1>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                <p className="text-[11px] text-emerald-500/60 uppercase tracking-[0.25em] font-medium">ZEDX AI Assessment</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-2.5 print:hidden">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="text-xs text-white/40 tracking-wider">{report.length} Questions Analyzed</span>
                    </div>
                </motion.div>

                {/* Hero Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className={cn("relative rounded-[2rem] p-8 sm:p-14 mb-12 overflow-hidden border border-white/[0.08] backdrop-blur-3xl print:border print:border-gray-200", overall.glow)}
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}
                >
                    <div className="absolute inset-0 rounded-[2rem] pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)" }} />
                    <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${overall.ringColor}80, transparent)` }} />
                    <div className="absolute left-8 sm:left-14 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] opacity-20 print:hidden" style={{ background: overall.ringColor }} />
                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-12 sm:gap-16">
                        <div className="shrink-0"><ScoreRing score={averageScore} size={180} strokeWidth={10} /></div>
                        <div className="flex-1 text-center sm:text-left">
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 }} className={cn("inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[11px] font-semibold tracking-[0.18em] uppercase mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-md", overall.bg, overall.color)}>
                                <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ background: overall.ringColor }} />
                                {overall.label} Performance
                            </motion.div>
                            <p className="text-white/50 text-base sm:text-xl leading-relaxed max-w-xl font-light print:text-gray-700">
                                You completed <strong className="text-white font-medium">{report.length} questions</strong>. Your technical articulation and response structures have been mapped against ideal industry benchmarks.
                            </p>
                            <div className="flex flex-wrap gap-8 mt-8 justify-center sm:justify-start">
                                {[{ label: "Avg Score", value: `${averageScore}/10` }, { label: "Top Score", value: `${Math.max(...report.map(r => r.score))}/10` }, { label: "Questions", value: report.length }].map((s, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 + i * 0.1 }} className="flex flex-col items-center sm:items-start">
                                        <span className="text-2xl font-light text-white">{s.value}</span>
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-0.5">{s.label}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Section Label */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-4 mb-8">
                    <span className="text-[11px] uppercase tracking-[0.3em] text-white/20 font-medium">Detailed Breakdown</span>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
                </motion.div>

                {/* Question Cards */}
                <div className="space-y-6">
                    {report.map((item, index) => {
                        const tier = getTier(item.score);
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.07 }}
                                className={cn("relative rounded-3xl border transition-all duration-500 overflow-hidden group print:border-gray-200 print:break-inside-avoid border-white/10", tier.glow)}
                                style={{ background: "rgba(255,255,255,0.03)" }}
                            >
                                <div className="absolute top-0 left-0 right-0 h-[1px] opacity-100" style={{ background: `linear-gradient(90deg, transparent, ${tier.ringColor}80, transparent)` }} />
                                <div className="p-6 sm:p-7 border-b border-white/[0.04]">
                                    <div className="flex items-center gap-4 mb-4">
                                        <ScoreMiniRing score={item.score} />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-semibold text-white/30 tracking-[0.25em] uppercase bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/[0.06]">Q{index + 1}</span>
                                            <span className={cn("text-[10px] font-semibold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-md", tier.bg, tier.color)}>{tier.label}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-white/90 text-base sm:text-lg font-light leading-snug print:text-black">{item.question}</h3>
                                </div>
                                <div className="px-6 sm:px-7 py-7 space-y-6">
                                                <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full" style={{ background: `linear-gradient(to bottom, ${tier.ringColor}80, transparent)` }} />
                                                    <div className="p-5 pl-6">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <MessageSquareQuote className="w-3.5 h-3.5 text-white/25" />
                                                            <span className="text-[10px] font-bold text-white/25 uppercase tracking-[0.25em]">Your Answer</span>
                                                        </div>
                                                        <p className="text-white/60 font-light text-sm sm:text-base leading-relaxed italic print:text-gray-700">
                                                            {item.answer ? `"${item.answer}"` : <span className="text-white/20 not-italic">(No audio was captured)</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="rounded-2xl p-5 bg-emerald-500/[0.04] border border-emerald-500/[0.1]">
                                                        <div className="flex items-center gap-2.5 mb-4">
                                                            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><BarChart2 className="w-3.5 h-3.5 text-emerald-400" /></div>
                                                            <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-[0.25em]">ZEDX Analysis</span>
                                                        </div>
                                                        <p className="text-white/55 font-light text-sm leading-relaxed print:text-gray-700">{item.feedback}</p>
                                                    </div>
                                                    <div className="rounded-2xl p-5 bg-blue-500/[0.04] border border-blue-500/[0.1]">
                                                        <div className="flex items-center gap-2.5 mb-4">
                                                            <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.2)]"><Award className="w-3.5 h-3.5 text-blue-400" /></div>
                                                            <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-[0.25em]">Ideal Benchmark</span>
                                                        </div>
                                                        <p className="text-white/55 font-light text-sm leading-relaxed print:text-gray-700">{item.ideal_answer}</p>
                                                    </div>
                                                </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16 mb-24 flex flex-col sm:flex-row justify-center items-center gap-4 print:hidden">
                    <motion.button whileHover={{ scale: 1.02, boxShadow: "0 0 50px rgba(16,185,129,0.4)" }} whileTap={{ scale: 0.98 }} onClick={() => window.print()} className="h-14 px-10 text-base font-medium tracking-wide rounded-2xl text-white transition-all" style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 0 30px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                        Export PDF Report
                    </motion.button>
                    <Link href="/dashboard">
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-14 px-10 text-base font-medium tracking-wide rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white hover:bg-white/[0.08] transition-all flex items-center gap-3">
                            Return to Dashboard <ChevronRight className="w-4 h-4 opacity-50" />
                        </motion.button>
                    </Link>
                </motion.div>

            </div>
        </div>
    );
}
