"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, AlertCircle, Sparkles, Loader2, Target, Gauge, Mic, Camera, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { resumeService, Resume } from "@/lib/resume-service";
import { ModelChat } from "@/components/dashboard/model-chat";
import { motion } from "framer-motion";
import { AnimatedOrb } from '@/components/animated-orb-wrapper';
import { supabase } from "@/lib/supabase";
import { CustomSelect } from "@/components/ui/custom-select";

// Custom SVG Icons
const BriefcaseIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);

const ResumeIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

const GlobeIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const AI_MODELS = [
    {
        id: "openai/gpt-oss-20b",
        name: "Gemini 3.8 Flash",
        description: "Lightning Fast",
        logo: "/icons8-gemini-48.png",
        gradient: "from-blue-500/20 to-indigo-500/20",
        border: "group-hover:border-blue-500/50",
        tier: "free"
    },
    {
        id: "qwen/qwen3.8-27b",
        name: "Claude Fable 5.1",
        description: "Multilingual Pro",
        logo: "/icons8-claude-48.png",
        gradient: "from-orange-500/20 to-rose-500/20",
        border: "group-hover:border-orange-500/50",
        tier: "pro"
    },
    {
        id: "openai/gpt-oss-120b",
        name: "GPT-6 Astra",
        description: "Ultra Intelligence",
        logo: "/openai-logo.png",
        gradient: "from-amber-500/20 to-yellow-400/20",
        border: "group-hover:border-amber-500/50",
        tier: "ultra"
    }
];

// ParticleWave removed to improve mobile performance/clarity
// import { ParticleWave } from "@/components/ui/particle-wave";

import { usePostHog } from 'posthog-js/react';
import { useInterviewStore } from "@/lib/store";

export default function NewInterviewPage() {
    const router = useRouter();
    const posthog = usePostHog();
    const [jobDescription, setJobDescription] = useState("");
    const [resume, setResume] = useState("");
    const [interviewType, setInterviewType] = useState("Technical");
    const [language, setLanguage] = useState("en-US");
    const [difficulty, setDifficulty] = useState("Intermediate");
    const [questionCount, setQuestionCount] = useState("4");
    const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-20b");
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
    const [isPremium, setIsPremium] = useState(false);
    const [isLoadingPremium, setIsLoadingPremium] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [userTier, setUserTier] = useState<"free" | "pro" | "ultra">("free");

    // Prevent accidental reload if the user has entered some data
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (jobDescription.length > 5 || resume) {
                e.preventDefault();
                e.returnValue = ''; // Standard way to trigger browser warning
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [jobDescription, resume]);

    // Load saved resumes
    useEffect(() => {
        setIsDesktop(typeof window !== 'undefined' && !!(window as any).electronAPI);
        const loadResumes = async () => {
            try {
                const data = await resumeService.getUserResumes();
                setSavedResumes(data);
            } catch {
                // Silent catch
            }
        };
        loadResumes();

        const checkProStatus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('tier')
                        .eq('id', session.user.id)
                        .single();
                    if (profile?.tier) {
                        setUserTier(profile.tier as "free" | "pro" | "ultra");
                        if (profile.tier === 'pro' || profile.tier === 'ultra') setIsPro(true);
                        // Security: reset model if free user has a pro/ultra model in state (e.g. from localStorage)
                        if (profile.tier === 'free') {
                            setSelectedModel((current) => {
                                const modelData = AI_MODELS.find(m => m.id === current);
                                if (modelData && modelData.tier !== 'free') {
                                    return "openai/gpt-oss-20b";
                                }
                                return current;
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile status", err);
            }
        };
        checkProStatus();

        try {
            const savedModel = localStorage.getItem("selected_ai_model");
            if (savedModel && AI_MODELS.some(m => m.id === savedModel)) {
                setSelectedModel(savedModel);
            } else {
                setSelectedModel("openai/gpt-oss-20b");
            }
        } catch { }
    }, [router]);

    const isValid = jobDescription.trim().length > 10 && resume.trim().length > 10 && AI_MODELS.some(m => m.id === selectedModel);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            const res = await fetch("/api/parse-resume", {
                method: "POST",
                headers: token ? { "Authorization": `Bearer ${token}` } : undefined,
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to parse PDF");

            setResume(data.text);
            setError(null);
            setSuccessMessage(`Resume "${file.name}" uploaded successfully!`);
            
            posthog.capture('cv_uploaded', { file_type: file.type });

            try {
                const fileName = file.name.replace('.pdf', '').replace('.PDF', '');
                await resumeService.createResume(fileName, data.text);
                const updatedResumes = await resumeService.getUserResumes();
                setSavedResumes(updatedResumes);
            } catch (saveErr) { console.warn(saveErr); }
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Upload Failed. Please try converting to .txt");
        }
    };

    const handleStart = () => {
        if (!isValid) {
            setError("Please fill in Job Description and Resume to proceed.");
            return;
        }

        setIsLoading(true);
        posthog.capture('interview_started', {
            mode: interviewType,
            language: language,
            difficulty: difficulty,
            questions: questionCount,
            model: selectedModel
        });
        
        try {
            useInterviewStore.getState().setInterviewContext({
                interviewType,
                jobDescription,
                resumeText: resume,
                language,
                difficulty,
            });
            localStorage.setItem("selected_ai_model", selectedModel); // Keep model in localstorage since it's a preference
            localStorage.setItem("interview_context_question_count", questionCount); // Question count is small
        } catch (e) {
            console.warn(e);
        }

        setTimeout(() => {
            router.push("/dashboard/new/how-to-use");
        }, 800);
    };

    const currentModelData = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];



    return (
        <div className="min-h-screen bg-white dark:bg-black text-foreground selection:bg-emerald-500/30 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[150px]"></div>
            </div>

            <div className="relative z-10 w-full mx-auto px-6 py-8 sm:py-12 pb-32">
                {/* Header */}
                <div className="flex flex-col items-start gap-4 mb-8 sm:mb-12">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full w-10 h-10 sm:w-14 sm:h-14">
                                <ArrowLeft size={20} className="sm:size-[28px]" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 mb-1 sm:mb-2 tracking-tight">
                                Setup Interview
                            </h1>
                            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 font-medium tracking-wide">Configure your AI simulator for the perfect session.</p>
                        </div>
                    </div>
                </div>



                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[calc(100vh-250px)]">
                    {/* Left Column: Configuration (8 cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-8 h-full">

                        {/* Job Description Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="group relative bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-1.5 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden flex-1 flex flex-col"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none"></div>
                            <div className="relative bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md rounded-[2.2rem] p-6 sm:p-10 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-6 sm:mb-8">
                                    <div className="flex items-center gap-4 sm:gap-5">
                                        <div className="flex items-center justify-center shrink-0">
                                            <Image src="/Job description.png" alt="Job Description" width={56} height={56} className="object-contain dark:invert drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-xl sm:text-2xl text-gray-900 dark:text-white mb-0.5 sm:mb-1 tracking-tight">Job Description</h3>
                                            <p className="text-base sm:text-lg text-gray-500 font-medium">Paste the target role details.</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] sm:text-sm font-bold font-mono text-[#84cc16] dark:text-[#a3e635] bg-[#84cc16]/10 dark:bg-[#84cc16]/20 border border-[#84cc16]/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl tracking-wider uppercase">REQUIRED</span>
                                </div>
                                <textarea
                                    className="w-full flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 text-base sm:text-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#84cc16]/50 focus:ring-1 focus:ring-[#84cc16]/50 resize-none transition-all min-h-[180px] sm:min-h-[220px] leading-relaxed"
                                    placeholder="e.g. Senior React Developer at Netflix..."
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                />
                            </div>
                        </motion.div>

                        {/* Resume Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden shadow-xl shadow-zinc-200/20 dark:shadow-none flex-1 flex flex-col"
                        >
                            <div className="flex flex-col gap-6 mb-8">
                                <div className="flex items-center gap-4 sm:gap-5">
                                    <div className="flex items-center justify-center shrink-0">
                                        <Image src="/cv.png" alt="Resume CV" width={56} height={56} className="object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-xl sm:text-2xl text-gray-900 dark:text-white tracking-tight">Resume</h3>
                                        <p className="text-base sm:text-lg text-gray-500 font-medium">Add your CV for tailored context and better results.</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <label className="h-11 sm:h-12 px-6 flex items-center justify-center gap-2 bg-[#84cc16] hover:bg-[#65a30d] text-white sm:text-gray-900 font-bold rounded-xl cursor-pointer transition-colors w-full sm:w-auto shadow-lg shadow-[#84cc16]/20 order-1">
                                        <Upload size={18} />
                                        Upload New CV
                                        <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                                    </label>
                                    <div className="w-full sm:w-56 order-2">
                                        <CustomSelect
                                            options={savedResumes.map(r => ({ label: r.name, value: r.id }))}
                                            value={selectedResumeId}
                                            onChange={(id) => {
                                                const r = savedResumes.find(sr => sr.id === id);
                                                if (r) { setResume(r.content); setSelectedResumeId(id); }
                                            }}
                                            placeholder="Saved Resumes"
                                            triggerClassName="h-11 sm:h-12"
                                        />
                                    </div>
                                </div>
                            </div>
                            <textarea
                                className="w-full flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 text-base sm:text-lg text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#84cc16]/50 focus:ring-1 focus:ring-[#84cc16]/50 resize-none transition-all min-h-[180px] sm:min-h-[220px]"
                                placeholder="Paste resume text or upload PDF..."
                                value={resume}
                                onChange={(e) => setResume(e.target.value)}
                            />
                            {successMessage && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">✓</span>
                                    {successMessage}
                                </div>
                            )}
                        </motion.div>

                        {/* Settings Row */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                        >
                            <div className="relative z-[60] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                                <label className="flex items-center gap-3 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 tracking-tight">
                                    <div className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        <Image src="/Interview-Logo.png" alt="Interview Type" width={28} height={28} className="object-contain dark:invert transition-all" />
                                    </div>
                                    Interview Type
                                </label>
                                <CustomSelect
                                    options={[
                                        { label: "Technical", value: "Technical" },
                                        { label: "Behavioral", value: "Behavioral" },
                                        { label: "Project Deep Dive", value: "Project Deep Dive" },
                                    ]}
                                    value={interviewType}
                                    onChange={(v) => setInterviewType(v)}
                                />
                            </div>
                            <div className="relative z-[50] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                                <label className="flex items-center gap-3 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 tracking-tight">
                                    <div className="text-emerald-600 dark:text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        <Image src="/Multi-Language.png" alt="Language Globe" width={28} height={28} className="object-contain" />
                                    </div> 
                                    Language
                                </label>
                                <CustomSelect
                                    options={SUPPORTED_LANGUAGES.map((lang, idx) => {
                                        const isUltraLang = idx >= 20;
                                        const isProLang = idx >= 2 && idx < 20;
                                        let label = lang.native;
                                        if (isUltraLang && userTier !== 'ultra' && !isDesktop) label += ' 🔒 ULTRA';
                                        if (isProLang && userTier === 'free' && !isDesktop) label += ' 🔒 PRO';
                                        return { label, value: lang.code };
                                    })}
                                    value={language}
                                    onChange={(val) => {
                                        const idx = SUPPORTED_LANGUAGES.findIndex(l => l.code === val);
                                        const isUltraLang = idx >= 20;
                                        const isProLang = idx >= 2 && idx < 20;
                                        if (isUltraLang && userTier !== 'ultra' && !isDesktop) { router.push("/pricing"); return; }
                                        if (isProLang && userTier === 'free' && !isDesktop) { router.push("/pricing"); return; }
                                        setLanguage(val);
                                    }}
                                />
                            </div>
                            {!isDesktop && (
                                <>
                                <div className="relative z-[40] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                                    <label className="flex items-center gap-3 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 tracking-tight">
                                        <div className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                            <Image src="/Granular Scorecards.png" alt="Difficulty Scorecard" width={28} height={28} className="object-contain" />
                                        </div> 
                                    Difficulty
                                </label>
                                <CustomSelect
                                    options={[
                                        { label: "Beginner", value: "Beginner" },
                                        { label: "Intermediate", value: "Intermediate" },
                                        { label: `Expert${userTier !== 'ultra' && !isDesktop ? ' 🔒 ULTRA' : ''}`, value: "Expert" },
                                    ]}
                                    value={difficulty}
                                    onChange={(val) => {
                                        if (val === "Expert" && userTier !== 'ultra' && !isDesktop) { router.push("/pricing"); return; }
                                        setDifficulty(val);
                                    }}
                                />
                            </div>
                            <div className="relative z-[30] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                                <label className="flex items-center gap-3 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 tracking-tight">
                                    <div className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                        <Image src="/question.png" alt="Questions" width={36} height={36} className="object-contain scale-110" />
                                    </div> 
                                    Questions
                                </label>
                                <CustomSelect
                                    options={[
                                        { label: "4 Questions (Free)", value: "4" },
                                        { label: `10 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "10" },
                                        { label: `15 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "15" },
                                        { label: `20 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "20" },
                                        { label: `25 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "25" },
                                        { label: `30 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "30" },
                                        { label: `35 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "35" },
                                        { label: `40 Questions${!isPro && !isDesktop ? ' 🔒 PRO' : ''}`, value: "40" },
                                    ]}
                                    value={questionCount}
                                    onChange={(val) => {
                                        if (parseInt(val) > 4 && !isPro && !isDesktop) { router.push("/pricing"); return; }
                                        setQuestionCount(val);
                                    }}
                                />
                            </div>
                                </>
                            )}
                        </motion.div>

                    </div>


                    {/* Right Column: Model Selection & Chat (5 cols) */}
                    <div className="lg:col-span-5 relative flex flex-col h-full">

                        {/* Model Selection Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] p-6 sm:p-10 shadow-xl shadow-zinc-200/20 dark:shadow-none flex-grow flex flex-col h-full"
                        >
                            {/* AI Model Header with AI.jpg */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/10">
                                    <Image src="/AI.jpg" alt="AI Model" width={48} height={48} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-xl sm:text-2xl tracking-tight">AI Model</h3>
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">Choose the brain behind ZEDX</p>
                                </div>
                            </div>

                            {/* Models List */}
                            <div className="space-y-3 sm:space-y-4 mb-8">
                                {AI_MODELS.map((model) => {
                                    const isLocked = (model.tier === 'ultra' && userTier !== 'ultra' && !isDesktop) || 
                                                     (model.tier === 'pro' && userTier === 'free' && !isDesktop);
                                    
                                    return (
                                    <div
                                        key={model.id}
                                        onClick={() => {
                                            if (isLocked) {
                                                router.push("/pricing");
                                                return;
                                            }
                                            setSelectedModel(model.id);
                                        }}
                                        className={cn(
                                            "relative p-3.5 sm:p-5 rounded-2xl border-2 transition-all flex items-center gap-4 sm:gap-5 group/item overflow-hidden",
                                            selectedModel === model.id
                                                ? "bg-white dark:bg-white/5 border-[#84cc16] shadow-sm"
                                                : "bg-gray-50 dark:bg-black/20 border-transparent hover:bg-gray-100 dark:hover:bg-white/5",
                                            isLocked ? "cursor-pointer" : "cursor-pointer"
                                        )}
                                    >
                                        {isLocked && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-end pr-5 backdrop-blur-[2.5px] bg-white/5 dark:bg-black/20">
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5",
                                                    model.tier === 'ultra' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                                )}>
                                                    {model.tier === 'ultra' ? 'ULTRA' : 'PRO'}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-black p-1.5 sm:p-2 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-center relative z-0", isLocked && "opacity-50 blur-[1px]")}>
                                            <Image
                                                src={model.logo}
                                                alt={model.name}
                                                width={40}
                                                height={40}
                                                className={cn("w-full h-full object-contain", model.logo.includes('openai') && "dark:invert")}
                                            />
                                        </div>
                                        <div className={cn("flex-1 relative z-0", isLocked && "opacity-60 blur-[1px]")}>
                                            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                                <h4 className={cn("font-bold text-sm sm:text-base flex items-center gap-2", selectedModel === model.id ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400")}>
                                                    {model.name}
                                                </h4>
                                                {selectedModel === model.id && !isLocked && (
                                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#84cc16] shadow-[0_0_12px_rgba(132,204,22,0.5)]"></div>
                                                )}
                                            </div>
                                            <p className="text-[10px] sm:text-sm text-gray-400 dark:text-gray-500">{model.description}</p>
                                        </div>
                                    </div>
                                )})}
                            </div>

                            {/* Chat Preview */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="flex-1 flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-3 tracking-tight">
                                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center">
                                            <Image src="/AI2.png" alt="AI" width={24} height={24} className="w-full h-full object-cover" />
                                        </div>
                                        Test Drive Model
                                    </h3>
                                </div>
                                <div className="flex-1 min-h-[400px] mb-6">
                                    <ModelChat
                                        modelId={selectedModel}
                                        modelName={currentModelData.name}
                                        modelLogo={currentModelData.logo}
                                    />
                                </div>

                                {/* Static Start Interview Button */}
                                <div className="mt-auto pt-6">
                                    {error && (
                                        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-bottom-2">
                                            <AlertCircle size={18} />
                                            {error}
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleStart}
                                        disabled={isLoading || !isValid}
                                        className={cn(
                                            "w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-2xl transition-all duration-300 shadow-xl",
                                            isValid
                                                ? "bg-[#84cc16] hover:bg-[#65a30d] text-white dark:text-gray-900 shadow-[#84cc16]/25 hover:shadow-[#84cc16]/35 hover:-translate-y-0.5 active:translate-y-0"
                                                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        )}
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <Loader2 size={20} className="animate-spin sm:size-[24px]" />
                                                Preparing...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-3">
                                                Start Interview
                                                <ArrowLeft className="rotate-180 sm:size-[24px]" size={20} />
                                            </span>
                                        )}
                                    </Button>

                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Premium Floating Action Bar */}

        </div>
    );
}

