"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, AlertCircle, Sparkles, Loader2, Target, Gauge, Mic, Camera, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { preloadAmySpeech, getAmySpeechState, subscribeAmySpeech, canStartWithEnglishVoice, setEnglishSpeechPreference, disposeAmySpeech } from "@/lib/piper-amy";
import { loadWebSpeechVoices, selectWebSpeechVoice } from "@/lib/web-interview-language";
import { resumeService, Resume } from "@/lib/resume-service";
import { ModelChat } from "@/components/dashboard/model-chat";
import { PaywallModal } from "@/components/paywall-modal";
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
    const [targetRole, setTargetRole] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [resume, setResume] = useState("");
    const [interviewType, setInterviewType] = useState("Role-Specific");
    const [language, setLanguage] = useState("en-US");
    const [languageRestored, setLanguageRestored] = useState(false);
    const [amyState, setAmyState] = useState(getAmySpeechState);
    const [englishVoice, setEnglishVoice] = useState<'amy' | 'browser'>('amy');
    const [voiceRetry, setVoiceRetry] = useState(0);
    const [checkingBrowserVoice, setCheckingBrowserVoice] = useState(false);
    const [browserVoiceError, setBrowserVoiceError] = useState('');
    useEffect(() => {
        if (languageRestored && language !== 'en-US' && getAmySpeechState().status === 'loading' && !(window as unknown as { electronAPI?: unknown }).electronAPI) disposeAmySpeech();
        if (!languageRestored || language !== 'en-US' || englishVoice !== 'amy' || (window as unknown as { electronAPI?: unknown }).electronAPI) return;
        const unsubscribe = subscribeAmySpeech(() => setAmyState(getAmySpeechState()));
        setAmyState(getAmySpeechState());
        void preloadAmySpeech().catch(() => { /* The setup panel shows retry and an explicit alternative. */ });
        return unsubscribe;
    }, [language, languageRestored, englishVoice, voiceRetry]);
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
    const [showPaywall, setShowPaywall] = useState(false);
    const englishVoiceReady = canStartWithEnglishVoice(language, isDesktop, amyState, englishVoice);

    const useBrowserEnglishVoice = async () => {
        setCheckingBrowserVoice(true);
        setBrowserVoiceError('');
        try {
            if (!window.speechSynthesis) throw new Error('unsupported');
            const voices = await loadWebSpeechVoices(window.speechSynthesis);
            if (!selectWebSpeechVoice(voices, 'en-US')) throw new Error('unavailable');
            setEnglishVoice('browser');
            disposeAmySpeech();
        } catch {
            setBrowserVoiceError('No English browser voice is available. Please retry Amy or use another supported browser.');
        } finally { setCheckingBrowserVoice(false); }
    };

    const retryAmyVoice = () => {
        setBrowserVoiceError('');
        setEnglishVoice('amy');
        setVoiceRetry(value => value + 1);
    };

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
            const savedRole = localStorage.getItem("interview_context_target_role");
            if (savedRole && savedRole.trim()) {
                setTargetRole(savedRole);
            }
            const savedLang = localStorage.getItem("interview_context_lang");
            if (savedLang && SUPPORTED_LANGUAGES.some(l => l.code === savedLang)) {
                setLanguage(savedLang);
                useInterviewStore.getState().setInterviewContext({ language: savedLang });
            } else {
                setLanguage("en-US");
                useInterviewStore.getState().setInterviewContext({ language: "en-US" });
                localStorage.setItem("interview_context_lang", "en-US");
            }
            const savedDifficulty = localStorage.getItem("interview_context_difficulty");
            if (savedDifficulty && ["Beginner", "Intermediate", "Expert"].includes(savedDifficulty)) {
                setDifficulty(savedDifficulty);
            }
            const savedType = localStorage.getItem("interview_context_type");
            if (savedType && ["Role-Specific", "Behavioral", "Technical", "Project Deep Dive"].includes(savedType)) {
                setInterviewType(savedType);
            }
            const savedCount = localStorage.getItem("interview_context_question_count");
            if (savedCount && ["4", "10", "15", "20", "25", "30", "35", "40"].includes(savedCount)) {
                setQuestionCount(savedCount);
            }
        } catch { }
        setLanguageRestored(true);
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

    const handleStart = async () => {
        // Guard the action as well as the button, including a worker failure after rendering.
        if (!isDesktop && !(window as unknown as { electronAPI?: unknown }).electronAPI &&
            !canStartWithEnglishVoice(language, false, getAmySpeechState(), englishVoice)) {
            setError('Please wait until the English voice is ready, or select an available browser voice.');
            return;
        }
        if (!isValid) {
            setError("Please fill in Job Description and Resume to proceed.");
            return;
        }

        setIsLoading(true);

        // Check Rate Limits (4 interviews per month for Free tier)
        if (userTier === "free") {
            try {
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { count, error } = await supabase
                        .from('interviews')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', session.user.id)
                        .gte('created_at', startOfMonth.toISOString());

                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('questions_asked')
                        .eq('id', session.user.id)
                        .single();

                    if ((count !== null && count >= 4) || (profileData && profileData.questions_asked >= 16)) {
                        setShowPaywall(true);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Failed to check rate limits", err);
            }
        }

        posthog.capture('interview_started', {
            mode: interviewType,
            language: language,
            difficulty: difficulty,
            questions: questionCount,
            model: selectedModel
        });

        try {
            if (!isDesktop) setEnglishSpeechPreference(language === 'en-US' ? englishVoice : 'amy');
            useInterviewStore.getState().setInterviewContext({
                targetRole,
                interviewType,
                jobDescription,
                resumeText: resume,
                language,
                difficulty,
            });
            localStorage.setItem("interview_context_target_role", targetRole);
            localStorage.setItem("interview_context_lang", language);
            localStorage.setItem("interview_context_jd", jobDescription);
            localStorage.setItem("interview_context_resume", resume);
            localStorage.setItem("interview_context_difficulty", difficulty);
            localStorage.setItem("interview_context_type", interviewType);
            localStorage.setItem("selected_ai_model", selectedModel);
            localStorage.setItem("interview_context_question_count", questionCount.toString());
            // Clear previous interview pointers so new session never redirects to old report
            localStorage.removeItem("current_db_id");
            localStorage.removeItem("interview_results");
            localStorage.removeItem("session_exchanges");
            localStorage.removeItem("interview_completed_at");
        } catch (e) {
            console.warn(e);
        }

        setTimeout(() => {
            if (isDesktop || (typeof window !== "undefined" && !!(window as any).electronAPI?.isElectron)) {
                router.push("/desktop-assistant");
            } else {
                router.push("/dashboard/new/how-to-use");
            }
        }, 800);
    };

    const currentModelData = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

    return (
        <div className="min-h-screen bg-white dark:bg-black text-foreground selection:bg-emerald-500/30 overflow-x-hidden">
            <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[150px]"></div>
            </div>

            <div className="relative z-10 w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-8 max-w-[1520px] antialiased font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text','Inter',sans-serif]">
                {/* macOS / iOS Style Header */}
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
                    <div className="flex items-center gap-3 sm:gap-3.5">
                        <Link href="/dashboard">
                            <button className="w-[38px] h-[38px] rounded-full bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] active:scale-95 text-zinc-600 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08] transition-all flex items-center justify-center shrink-0">
                                <ArrowLeft size={16} />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                                Setup Interview
                            </h1>
                            <p className="text-[12px] sm:text-[13px] text-zinc-500 dark:text-[#86868b] font-normal">Configure role details and AI interview parameters.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
                    {/* Left Section (8 cols on desktop): Job Description + Resume side-by-side, with Settings panel below */}
                    <div className="lg:col-span-8 flex flex-col gap-3.5">
                        {/* Side-by-Side Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 items-stretch">

                            {/* Job Description Card (macOS Window Material) */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-black/10 dark:border-white/[0.12] rounded-[20px] p-4.5 sm:p-5 shadow-lg shadow-black/20 ring-1 ring-inset ring-white/50 dark:ring-white/[0.08] flex flex-col justify-between flex-1"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                                            <Image src="/job-desc-icon.png" alt="Job Description" width={20} height={20} className="object-contain dark:invert" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white tracking-tight">Job Description</h3>
                                            <p className="text-[12px] text-zinc-500 dark:text-[#86868b] whitespace-nowrap">Position requirements & role</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold font-mono text-[#84cc16] dark:text-[#a3e635] bg-[#84cc16]/10 dark:bg-[#84cc16]/15 border border-[#84cc16]/20 px-2 py-0.5 rounded-full tracking-wider uppercase shrink-0">REQUIRED</span>
                                </div>
                                <div className="flex flex-col gap-2.5 flex-1">
                                    <input
                                        type="text"
                                        className="w-full h-[42px] bg-black/[0.03] dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14] focus:bg-white dark:focus:bg-[#2c2c2e] focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 rounded-xl px-3.5 text-[16px] sm:text-[14px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-[#636366] transition-all outline-none"
                                        placeholder="Target Role (e.g. Senior Frontend Engineer)"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                    />
                                    <textarea
                                        className="w-full bg-black/[0.03] dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14] focus:bg-white dark:focus:bg-[#2c2c2e] focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 rounded-xl p-3.5 text-[16px] sm:text-[13px] font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-[#636366] resize-none transition-all flex-1 min-h-[190px] leading-relaxed outline-none"
                                        placeholder="Paste the job description for the role you're applying to..."
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                    />
                                </div>
                            </motion.div>

                            {/* Resume Card (macOS Window Material) */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.05 }}
                                className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-black/10 dark:border-white/[0.12] rounded-[20px] p-4.5 sm:p-5 shadow-lg shadow-black/20 ring-1 ring-inset ring-white/50 dark:ring-white/[0.08] flex flex-col justify-between flex-1"
                            >
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                                            <Image src="/cv-icon.png" alt="Resume" width={20} height={20} className="object-contain" />
                                        </div>
                                        <div className="shrink-0">
                                            <h3 className="font-semibold text-[15px] sm:text-[16px] text-zinc-900 dark:text-white tracking-tight">Resume</h3>
                                            <p className="text-[12px] text-zinc-500 dark:text-[#86868b] whitespace-nowrap">Your CV & experience</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <label className="h-[30px] px-2.5 flex items-center justify-center gap-1.5 bg-[#84cc16] hover:bg-[#72b012] active:scale-[0.98] text-zinc-950 font-semibold rounded-lg cursor-pointer transition-all shadow-xs text-[12px] shrink-0">
                                            <Upload size={12} />
                                            Upload
                                            <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                                        </label>
                                        <div className="w-32 sm:w-40 min-w-0">
                                            <CustomSelect
                                                options={savedResumes.map(r => ({ label: r.name, value: r.id }))}
                                                value={selectedResumeId}
                                                onChange={(id) => {
                                                    const r = savedResumes.find(sr => sr.id === id);
                                                    if (r) { setResume(r.content); setSelectedResumeId(id); }
                                                }}
                                                placeholder="Saved Resumes"
                                                triggerClassName="h-[30px] text-[12px] px-2 bg-black/[0.03] dark:bg-[#2c2c2e]/60 border-black/[0.06] dark:border-white/[0.08] rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col flex-1">
                                    <textarea
                                        className="w-full bg-black/[0.03] dark:bg-[#2c2c2e]/60 border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.14] focus:bg-white dark:focus:bg-[#2c2c2e] focus:border-[#84cc16] focus:ring-2 focus:ring-[#84cc16]/20 rounded-xl p-3.5 text-[16px] sm:text-[13px] font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-[#636366] resize-none transition-all flex-1 min-h-[230px] sm:min-h-[242px] leading-relaxed outline-none"
                                        placeholder="Paste resume text or upload PDF..."
                                        value={resume}
                                        onChange={(e) => setResume(e.target.value)}
                                    />
                                    {successMessage && (
                                        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px]">✓</span>
                                            <span className="truncate">{successMessage}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Settings Panel (Apple Inset Grouped Control Panel - Perfectly matches the combined width of both cards above) */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="w-full bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-black/10 dark:border-white/[0.12] rounded-[20px] p-3.5 sm:p-4 shadow-lg shadow-black/20 ring-1 ring-inset ring-white/50 dark:ring-white/[0.08]"
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                <div className="flex flex-col gap-1.5 relative z-[60]">
                                    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 tracking-tight truncate">
                                        <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                            <Image src="/Interview-Logo.png" alt="Interview Type" width={12} height={12} className="object-contain dark:invert" />
                                        </div>
                                        <span className="truncate">Interview Type</span>
                                    </label>
                                    <CustomSelect
                                        options={[
                                            { label: "Role-Specific", value: "Role-Specific" },
                                            { label: "Behavioral", value: "Behavioral" },
                                            { label: "Technical", value: "Technical" },
                                            { label: "Project Deep Dive", value: "Project Deep Dive" },
                                        ]}
                                        value={interviewType}
                                        onChange={(v) => {
                                            setInterviewType(v);
                                            useInterviewStore.getState().setInterviewContext({ interviewType: v });
                                            try { localStorage.setItem("interview_context_type", v); } catch {}
                                        }}
                                        triggerClassName="h-[38px] text-[13px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] rounded-xl"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 relative z-[50]">
                                    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 tracking-tight truncate">
                                        <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                            <Image src="/Multi-Language.png" alt="Language" width={12} height={12} className="object-contain" />
                                        </div>
                                        <span className="truncate">Language</span>
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
                                            useInterviewStore.getState().setInterviewContext({ language: val });
                                            try { localStorage.setItem("interview_context_lang", val); } catch {}
                                        }}
                                        triggerClassName="h-[38px] text-[13px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] rounded-xl"
                                    />
                                    {language === 'en-US' && !isDesktop && (
                                        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-2">
                                            <p role="status" aria-live="polite" className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                                {englishVoice === 'browser' ? 'Browser English voice selected ✓' :
                                                    amyState.status === 'ready' ? 'Amy is ready ✓' :
                                                    amyState.status === 'error' ? 'Amy could not be prepared. Retry or choose an English browser voice.' :
                                                    amyState.cached ? 'Starting your saved Amy voice — no model download…' :
                                                    amyState.progress === 100 ? 'Initializing the English voice…' :
                                                    amyState.progress !== null ? `Downloading the English voice… ${amyState.progress}%` : 'Preparing the English voice…'}
                                            </p>
                                            {englishVoice === 'amy' && (amyState.status === 'loading' || amyState.status === 'idle') && (
                                                <>
                                                    <progress aria-label="English voice preparation" value={amyState.progress ?? undefined} max={100} className="w-full h-1.5 accent-lime-500" />
                                                    <p className="text-[11px] text-zinc-500">First use downloads the voice (about 63 MB) and playback files. Saved in this browser. You can finish your setup while it prepares.</p>
                                                </>
                                            )}
                                            {englishVoice === 'browser' || amyState.status === 'error' ? (
                                                <button type="button" onClick={retryAmyVoice} className="text-xs font-semibold underline text-zinc-700 dark:text-zinc-200">
                                                    {englishVoice === 'browser' ? 'Use Amy instead' : 'Retry Amy'}
                                                </button>
                                            ) : null}
                                            {englishVoice === 'amy' && amyState.status !== 'ready' && (
                                                <button type="button" disabled={checkingBrowserVoice} onClick={useBrowserEnglishVoice} className="block text-xs font-semibold underline text-zinc-700 dark:text-zinc-200 disabled:opacity-50">
                                                    {checkingBrowserVoice ? 'Checking browser voice…' : 'Use browser voice instead'}
                                                </button>
                                            )}
                                            {browserVoiceError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{browserVoiceError}</p>}
                                        </div>
                                    )}
                                </div>

                                {!isDesktop && (
                                    <>
                                        <div className="flex flex-col gap-1.5 relative z-[40]">
                                            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 tracking-tight truncate">
                                                <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                                    <Image src="/Granular Scorecards.png" alt="Difficulty" width={12} height={12} className="object-contain" />
                                                </div>
                                                <span className="truncate">Difficulty</span>
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
                                                    useInterviewStore.getState().setInterviewContext({ difficulty: val });
                                                    try { localStorage.setItem("interview_context_difficulty", val); } catch {}
                                                }}
                                                triggerClassName="h-[38px] text-[13px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] rounded-xl"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5 relative z-[30]">
                                            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 tracking-tight truncate">
                                                <div className="w-5 h-5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                                                    <Image src="/question.png" alt="Questions" width={12} height={12} className="object-contain" />
                                                </div>
                                                <span className="truncate">Questions</span>
                                            </label>
                                            <CustomSelect
                                                options={[
                                                    { label: "4 Questions", value: "4" },
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
                                                    try { localStorage.setItem("interview_context_question_count", val); } catch {}
                                                }}
                                                triggerClassName="h-[38px] text-[13px] bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.06] dark:border-white/[0.08] rounded-xl"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: AI Model Selection & Test Drive & Start CTA (4 cols on desktop) */}
                    <div className="lg:col-span-4 relative flex flex-col">
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-black/10 dark:border-white/[0.12] rounded-[20px] p-4.5 sm:p-5 shadow-lg shadow-black/20 ring-1 ring-inset ring-white/50 dark:ring-white/[0.08] flex flex-col justify-between h-full"
                        >
                            <div>
                                {/* AI Model Header */}
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08] shrink-0">
                                        <Image src="/AI.jpg" alt="AI Model" width={32} height={32} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-900 dark:text-white text-[15px] sm:text-[16px] tracking-tight">Interview Engine</h3>
                                        <p className="text-[12px] text-zinc-500 dark:text-[#86868b]">Select your preferred AI interviewer.</p>
                                    </div>
                                </div>

                                {/* Models List */}
                                <div className="space-y-1.5 mb-3">
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
                                                    "relative p-2 rounded-xl border transition-all flex items-center gap-2.5 group/item overflow-hidden",
                                                    selectedModel === model.id
                                                        ? "bg-white dark:bg-white/[0.09] border-[#84cc16] shadow-xs ring-1 ring-[#84cc16]/30"
                                                        : "bg-black/[0.02] dark:bg-[#2c2c2e]/40 border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-[#2c2c2e]/80",
                                                    isLocked ? "cursor-pointer" : "cursor-pointer"
                                                )}
                                            >
                                                {isLocked && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-end pr-2.5 backdrop-blur-[2px] bg-white/20 dark:bg-black/30">
                                                        <div className={cn(
                                                            "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1",
                                                            model.tier === 'ultra' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                                        )}>
                                                            {model.tier === 'ultra' ? 'ULTRA' : 'PRO'}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={cn("w-7.5 h-7.5 rounded-lg bg-white dark:bg-zinc-800 p-0.5 shadow-xs border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-center shrink-0 relative z-0", isLocked && "opacity-50 blur-[1px]")}>
                                                    <Image
                                                        src={model.logo}
                                                        alt={model.name}
                                                        width={24}
                                                        height={24}
                                                        className={cn("w-full h-full object-contain", model.logo.includes('openai') && "dark:invert")}
                                                    />
                                                </div>
                                                <div className={cn("flex-1 min-w-0 relative z-0", isLocked && "opacity-60 blur-[1px]")}>
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={cn("font-semibold text-[13px] sm:text-[14px] truncate flex items-center gap-1.5", selectedModel === model.id ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-300")}>
                                                            {model.name}
                                                        </h4>
                                                        {selectedModel === model.id && !isLocked && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#84cc16] shadow-[0_0_8px_rgba(132,204,22,0.6)] shrink-0"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-zinc-400 dark:text-[#86868b] truncate">{model.description}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Chat Preview (macOS Subwindow) */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="flex flex-col"
                                >
                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                        <h3 className="text-[12px] font-semibold text-zinc-500 dark:text-[#86868b] flex items-center gap-1.5 tracking-tight">
                                            <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex items-center justify-center">
                                                <Image src="/AI2.png" alt="AI" width={14} height={14} className="w-full h-full object-cover" />
                                            </div>
                                            Test Drive Model
                                        </h3>
                                    </div>
                                    <div className="h-[140px] sm:h-[150px] mb-2">
                                        <ModelChat
                                            modelId={selectedModel}
                                            modelName={currentModelData.name}
                                            modelLogo={currentModelData.logo}
                                        />
                                    </div>
                                </motion.div>
                            </div>

                            {/* macOS Primary Action Button */}
                            <div className="pt-1">
                                {error && (
                                    <div className="mb-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[12px] font-medium flex items-center gap-1.5 backdrop-blur-md animate-in slide-in-from-bottom-2">
                                        <AlertCircle size={14} />
                                        <span className="truncate">{error}</span>
                                    </div>
                                )}
                                <Button
                                    onClick={handleStart}
                                    disabled={isLoading || !isValid || !englishVoiceReady || (language === 'en-US' && !isDesktop && checkingBrowserVoice)}
                                    className={cn(
                                        "w-full h-[44px] text-[14px] sm:text-[15px] font-bold rounded-xl transition-all duration-200 shadow-sm",
                                        isValid
                                            ? "bg-[#84cc16] hover:bg-[#72b012] text-zinc-950 shadow-[0_4px_16px_rgba(132,204,22,0.25)] active:scale-[0.985]"
                                            : "bg-black/[0.04] dark:bg-white/[0.08] text-zinc-400 dark:text-zinc-400/90 border border-black/[0.06] dark:border-white/[0.08] cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            Preparing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            {!englishVoiceReady ? 'Preparing English voice…' : 'Start Interview'}
                                            <ArrowLeft className="rotate-180" size={16} />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Premium Floating Action Bar */}

        </div>
    );
}

