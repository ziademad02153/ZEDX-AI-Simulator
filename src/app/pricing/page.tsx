"use client";

import React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, ArrowRight, ShieldCheck, Wallet, Globe, Copy, CheckCircle2, HelpCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import Link from "next/link";
import dynamic from 'next/dynamic';
const AnimatedOrb = dynamic(() => import('@/components/animated-orb').then(mod => mod.AnimatedOrb), { ssr: false });
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePostHog } from 'posthog-js/react';

export default function PricingPage() {
    const router = useRouter();
    const posthog = usePostHog();
    const [isInstapayModalOpen, setIsInstapayModalOpen] = useState(false);
    const [instapayTier, setInstapayTier] = useState<"pro" | "ultra">("pro");
    const [transactionId, setTransactionId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [userTier, setUserTier] = useState<string>("free");
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        posthog.capture('pricing_viewed');
        const fetchTier = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsAuthenticated(true);
                const { data: profile } = await supabase.from('profiles').select('tier').eq('id', session.user.id).single();
                if (profile?.tier) setUserTier(profile.tier);
            }
        };
        fetchTier();
    }, [posthog]);

    const handleInstapaySubmit = async () => {
        if (!transactionId.trim()) return;
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Should probably redirect to login, but let's just alert for now
                alert("Please log in first.");
                setIsSubmitting(false);
                return;
            }

            const response = await fetch('/api/payments/instapay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ transactionId, tier: instapayTier }),
            });

            if (!response.ok) {
                const data = await response.json();
                console.error("Error submitting:", data.error);
                alert("Payment Error: " + data.error);
                setIsSubmitting(false);
                return;
            } else {
                posthog.capture('purchase_completed', { tier: instapayTier, method: 'instapay' });
                setSubmitSuccess(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white selection:bg-emerald-500/30 flex flex-col relative overflow-hidden">
            <Navbar />
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 sm:pt-40 sm:pb-24 relative z-10 w-full">
                <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12 relative z-10">
                    <h1 className="text-[36px] md:text-[44px] lg:text-[48px] font-bold mb-3 md:mb-4 tracking-tight leading-[1.15] bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-zinc-300">
                        Train Like It&apos;s the <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500 whitespace-nowrap">Real Interview</span>
                    </h1>
                    <p className="text-[15px] md:text-[16px] text-gray-600 dark:text-zinc-400 font-normal tracking-normal max-w-2xl mx-auto leading-[1.6]">
                        Practice real interviews with an AI interviewer that listens, speaks, adapts, and evaluates your answers.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row flex-wrap justify-center gap-4 lg:gap-5 w-full mx-auto items-stretch relative z-10 px-2 lg:px-4">
                    {/* Free Plan */}
                    <div className="w-full lg:w-[270px] xl:w-[290px] shrink-0 bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/20 transition-all duration-500 rounded-[2rem] p-5 md:p-7 flex flex-col relative shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="mb-6">
                            <h3 className="text-[20px] md:text-[22px] font-semibold mb-1 text-gray-900 dark:text-white">Free</h3>
                            <p className="text-gray-500 dark:text-zinc-500 text-[12px] font-medium">Try ZEDX, no card required.</p>
                            <div className="mt-5 flex items-baseline gap-1">
                                <span className="text-[36px] font-bold text-gray-900 dark:text-white leading-none">$0</span>
                                <span className="text-[13px] text-gray-400 dark:text-zinc-500 font-medium ml-1">/ forever</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8 flex-1 border-t border-gray-200 dark:border-white/5 pt-6">

                            {/* What you get */}
                            <div className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <span className="text-[14px] font-semibold">4 AI Voice Interviews</span>
                                    <span className="text-[12px] text-gray-400 dark:text-zinc-500 font-normal ml-1.5">/ month</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <span className="text-[14px] font-semibold">4 PDF Performance Reports</span>
                                    <span className="text-[12px] text-gray-400 dark:text-zinc-500 font-normal ml-1.5">/ month</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        <Image src="/icons8-gemini-48.png" alt="Gemini" width={14} height={14} className="object-contain" />
                                    </div>
                                    <span className="text-[14px] font-semibold">Gemini 3.8 Flash</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <span className="text-[14px] font-semibold">English interviews</span>
                            </div>

                            <div className="flex items-start gap-3 text-gray-700 dark:text-zinc-300">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <span className="text-[14px] font-semibold">Training History</span>
                            </div>

                            {/* Upgrade nudge — subtle, not aggressive */}
                            <div className="mt-2 pt-4 border-t border-gray-200 dark:border-white/5">
                                <p className="text-[12px] text-gray-400 dark:text-zinc-600 font-medium leading-relaxed">
                                    ↑ Upgrade for unlimited sessions, 29 languages & premium AI models
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => router.push('/dashboard')}
                            className="w-full mt-auto rounded-full py-6 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-800 dark:text-white font-medium border border-gray-300 dark:border-white/10 transition-all shadow-none text-[16px]"
                        >
                            Continue Free
                        </Button>
                    </div>

                    {/* Pro Plan */}
                    <div className="w-full lg:w-[290px] xl:w-[310px] shrink-0 bg-white dark:bg-white/[0.04] border-0 rounded-[2rem] p-5 md:p-8 flex flex-col relative shadow-[0_8px_40px_rgba(163,230,53,0.18),0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_40px_rgba(163,230,53,0.2),0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-500 hover:shadow-[0_12px_60px_rgba(163,230,53,0.28),0_4px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_16px_80px_rgba(163,230,53,0.3),0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden">

                        {/* Soft Top Glow inside card */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-[#a3e635]/20 blur-[60px] pointer-events-none" />

                        <div className="mb-6 relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[20px] md:text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight">ZEDX Pro</h3>
                                <span className="bg-emerald-100 dark:bg-[#a3e635]/10 text-emerald-700 dark:text-[#a3e635] text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">Most Popular</span>
                            </div>
                            <p className="text-gray-500 dark:text-zinc-400 text-[12px] font-medium mb-5">Master the interview.</p>

                            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1.5">
                                <span className="text-[16px] text-gray-400 dark:text-zinc-500 font-medium line-through">$20</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[40px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">$10</span>
                                    <span className="text-[13px] text-gray-400 dark:text-zinc-500 font-medium">/ month</span>
                                </div>
                                <span className="bg-emerald-100 dark:bg-[#a3e635]/10 text-emerald-700 dark:text-[#a3e635] text-[11px] font-bold px-2 py-0.5 rounded-md">SAVE 50%</span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                                <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium"> Egypt: <strong className="text-emerald-600 dark:text-[#a3e635] font-semibold">300 EGP</strong> <span className="text-[11px]">/ month</span></span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 line-through">1000 EGP</span>
                                    <span className="bg-emerald-100 dark:bg-[#a3e635]/10 text-emerald-700 dark:text-[#a3e635] text-[10px] font-bold px-1.5 py-0.5 rounded-md">SAVE 70%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3.5 mb-8 flex-1 relative z-10 border-t border-gray-200 dark:border-white/5 pt-6">

                            {[
                                { label: "Voice-to-Voice AI Interviewer", sub: "Natural, real-time conversations" },
                                { label: "20 Languages", sub: "Multilingual voice interviews" },
                                { label: "Technical & Behavioral", sub: "Tailored interview scenarios" },
                                { label: "Real-Time Evaluation", sub: "Granular feedback & PDF reports" },
                                { label: "Unlimited Sessions & Questions", sub: "Practice without any limits" },
                                { label: "Training History", sub: "Track and review past interviews" },
                            ].map((f) => (
                                <div key={f.label} className="flex items-start gap-3">
                                    <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-1" strokeWidth={2.5} />
                                    <div>
                                        <div className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight">{f.label}</div>
                                        <div className="text-[12px] text-gray-500 dark:text-zinc-500 font-normal leading-snug">{f.sub}</div>
                                    </div>
                                </div>
                            ))}

                            {/* AI Models — keep logos for brand trust */}
                            <div className="flex items-start gap-3 pt-1">
                                <Check className="w-[17px] h-[17px] text-emerald-500 shrink-0 mt-1" strokeWidth={2.5} />
                                <div className="flex-1">
                                    <div className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight mb-1.5">2 Premium AI Models</div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                <Image src="/icons8-gemini-48.png" alt="Gemini" width={14} height={14} className="object-contain" />
                                            </div>
                                            <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium">Gemini 3.8 Flash</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                <Image src="/icons8-claude-48.png" alt="Claude" width={14} height={14} className="object-contain" />
                                            </div>
                                            <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium">Claude Fable 5.1</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {userTier === 'pro' ? (
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    className="w-full relative overflow-hidden flex flex-col items-center justify-center gap-1.5 rounded-full py-[14px] bg-[#0a0a0a] backdrop-blur-2xl border border-white/5 shadow-lg cursor-default"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#a3e635]/15 blur-[25px] rounded-full pointer-events-none"></div>
                                    
                                    <div className="flex items-center justify-center z-10">
                                        <Image src="/zedx-logo.png" alt="ZEDX" width={85} height={24} className="object-contain opacity-90 -mr-1.5" priority />
                                        <span className="text-white font-bold text-[16px] tracking-tight font-sans leading-none mt-0.5">Pro Active</span>
                                    </div>
                                    
                                    <span className="text-[9px] text-zinc-500 font-bold z-10 tracking-[0.25em] uppercase leading-none">Enjoy unlimited access</span>
                                </motion.div>
                            ) : userTier === 'ultra' ? (
                                <div
                                    className="w-full flex items-center justify-center gap-2 rounded-full py-4 bg-white/5 border border-white/10 opacity-50 cursor-not-allowed"
                                >
                                    <CheckCircle2 className="text-zinc-500 w-5 h-5" />
                                    <span className="text-zinc-400 font-bold text-[15px] tracking-wide">Included in Ultra</span>
                                </div>
                            ) : (
                                <>
                                    {/* Global Payment */}
                                    <div className="space-y-2">
                                        <Button
                                            className="w-full rounded-full py-6 bg-gradient-to-r from-[#22c55e] to-[#a3e635] text-black hover:opacity-90 font-bold text-[15px] transition-all shadow-[0_2px_12px_rgba(34,197,94,0.25)] border-none flex items-center justify-center"
                                            onClick={() => {
                                                if (!isAuthenticated) {
                                                    toast.error("Please create an account first to upgrade.");
                                                    router.push("/login");
                                                    return;
                                                }
                                                posthog.capture('checkout_started', { tier: 'pro', method: 'gumroad' });
                                                window.open('https://ziademad5.gumroad.com/l/hkfdfv', '_blank');
                                            }}
                                        >
                                            <div className="w-[84px] h-7 mr-3 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-black/10">
                                                <Image src="/gumroad.webp" alt="Gumroad" width={84} height={28} className="w-full h-full object-cover object-center scale-110" />
                                            </div>
                                            Go Pro (USD)
                                        </Button>
                                    </div>

                                    {/* Local Payment */}
                                    <Button
                                        className="w-full rounded-full py-6 bg-[#22c55e]/5 border border-[#22c55e]/30 text-[#a3e635] hover:bg-[#22c55e]/15 font-semibold text-[15px] transition-all flex items-center justify-center shadow-none"
                                        onClick={() => {
                                            if (!isAuthenticated) {
                                                toast.error("Please create an account first to upgrade.");
                                                router.push("/login");
                                                return;
                                            }
                                            posthog.capture('checkout_started', { tier: 'pro', method: 'instapay' });
                                            setInstapayTier("pro");
                                            setIsInstapayModalOpen(true);
                                        }}
                                    >
                                        <div className="w-8 h-8 mr-3 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                                            <Image src="/instapay.jpg" alt="Instapay" width={32} height={32} className="w-full h-full object-cover" />
                                        </div>
                                        Go Pro via Instapay (EGP)
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Ultra Plan */}
                    <div className="w-full lg:w-[290px] xl:w-[310px] shrink-0 bg-white dark:bg-white/[0.04] border-0 rounded-[2rem] p-5 md:p-8 flex flex-col relative shadow-[0_8px_40px_rgba(245,158,11,0.18),0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_40px_rgba(245,158,11,0.2),0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-500 hover:shadow-[0_12px_60px_rgba(245,158,11,0.28),0_4px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_16px_80px_rgba(245,158,11,0.3),0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-amber-500/20 blur-[60px] pointer-events-none" />

                        <div className="mb-6 relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[20px] md:text-[22px] font-semibold text-gray-900 dark:text-white tracking-tight">ZEDX Ultra</h3>
                                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">Best Value</span>
                            </div>
                            <p className="text-gray-500 dark:text-zinc-400 text-[12px] font-medium mb-5">3 Months of unlimited power.</p>

                            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1.5">
                                <span className="text-[16px] text-gray-400 dark:text-zinc-500 font-medium line-through">$60</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[40px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">$25</span>
                                    <span className="text-[13px] text-gray-400 dark:text-zinc-500 font-medium">/ 3 months</span>
                                </div>
                                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-md">SAVE 58%</span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                                <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium"> Egypt: <strong className="text-amber-600 dark:text-amber-400 font-semibold">600 EGP</strong> <span className="text-[11px]">/ 3 months</span></span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 line-through">3000 EGP</span>
                                    <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">SAVE 80%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3.5 mb-8 flex-1 relative z-10 border-t border-gray-200 dark:border-white/5 pt-6">

                            {[
                                { label: "Advanced Voice-to-Voice AI", sub: "Zero latency, natural flowing conversations" },
                                { label: "All 29 Languages Unlocked", sub: "Full global language access without limits" },
                                { label: "Technical & Behavioral", sub: "Complete tailored interview scenarios" },
                                { label: "Real-Time Evaluation", sub: "Granular feedback & PDF reports" },
                                { label: "Expert Difficulty Level", sub: "The ultimate FAANG-level challenge" },
                                { label: "Truly Unlimited Sessions", sub: "Practice without any caps or restrictions" },
                                { label: "Training History", sub: "Track and review all past interviews" },
                                { label: "Priority VIP Support", sub: "Direct email assistance & feature requests" },
                            ].map((f) => (
                                <div key={f.label} className="flex items-start gap-3">
                                    <Check className="w-[17px] h-[17px] text-amber-400 shrink-0 mt-1" strokeWidth={2.5} />
                                    <div>
                                        <div className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight">{f.label}</div>
                                        <div className="text-[12px] text-gray-500 dark:text-zinc-500 font-normal leading-snug">{f.sub}</div>
                                    </div>
                                </div>
                            ))}

                            {/* AI Models — keep logos for brand trust */}
                            <div className="flex items-start gap-3 pt-1">
                                <Check className="w-[17px] h-[17px] text-amber-400 shrink-0 mt-1" strokeWidth={2.5} />
                                <div className="flex-1">
                                    <div className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight mb-1.5">3 Premium AI Models</div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                <Image src="/icons8-gemini-48.png" alt="Gemini" width={14} height={14} className="object-contain" />
                                            </div>
                                            <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium">Gemini 3.8 Flash</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                <Image src="/icons8-claude-48.png" alt="Claude" width={14} height={14} className="object-contain" />
                                            </div>
                                            <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium">Claude Fable 5.1</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                <Image src="/openai-logo.png" alt="GPT-6 Astra" width={14} height={14} className="object-contain dark:invert" />
                                            </div>
                                            <span className="text-[12px] text-gray-500 dark:text-zinc-400 font-medium">GPT-6 Astra</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {userTier === 'ultra' ? (
                                <motion.div
                                    whileHover={{ scale: 1.01 }}
                                    className="w-full relative overflow-hidden flex flex-col items-center justify-center gap-1.5 rounded-full py-[14px] bg-white dark:bg-[#0a0a0a] backdrop-blur-2xl border border-black/5 dark:border-white/5 shadow-lg cursor-default"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/15 blur-[25px] rounded-full pointer-events-none"></div>
                                    
                                    <div className="flex items-center justify-center z-10">
                                        <Image src="/zedx-logo.png" alt="ZEDX" width={85} height={24} className="object-contain opacity-90 -mr-1.5" priority />
                                        <span className="text-black dark:text-white font-bold text-[16px] tracking-tight font-sans leading-none mt-0.5">Ultra Active</span>
                                    </div>
                                    
                                    <span className="text-[9px] text-zinc-500 font-bold z-10 tracking-[0.25em] uppercase leading-none">Ultimate access unlocked</span>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Button
                                            className="w-full rounded-full py-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:opacity-90 font-bold text-[15px] transition-all shadow-[0_2px_12px_rgba(245,158,11,0.25)] border-none flex items-center justify-center"
                                            onClick={() => {
                                                if (!isAuthenticated) {
                                                    toast.error("Please create an account first to upgrade.");
                                                    router.push("/login");
                                                    return;
                                                }
                                                // TODO: Update with real Ultra link
                                                posthog.capture('checkout_started', { tier: 'ultra', method: 'gumroad' });
                                                window.open('https://ziademad5.gumroad.com/l/molojy', '_blank');
                                            }}
                                        >
                                            <div className="w-[84px] h-7 mr-3 rounded-md overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-black/10">
                                                <Image src="/gumroad.webp" alt="Gumroad" width={84} height={28} className="w-full h-full object-cover object-center scale-110" />
                                            </div>
                                            Go Ultra (USD)
                                        </Button>
                                    </div>

                                    <Button
                                        className="w-full rounded-full py-6 bg-amber-500/5 border border-amber-500/30 text-amber-500 hover:bg-amber-500/15 font-semibold text-[15px] transition-all flex items-center justify-center shadow-none"
                                        onClick={() => {
                                            if (!isAuthenticated) {
                                                toast.error("Please create an account first to upgrade.");
                                                router.push("/login");
                                                return;
                                            }
                                            posthog.capture('checkout_started', { tier: 'ultra', method: 'instapay' });
                                            setInstapayTier("ultra");
                                            setIsInstapayModalOpen(true);
                                        }}
                                    >
                                        <div className="w-8 h-8 mr-3 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                                            <Image src="/instapay.jpg" alt="Instapay" width={32} height={32} className="w-full h-full object-cover" />
                                        </div>
                                        Go Ultra via Instapay (EGP)
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Enterprise / Institution Plan - 3D Titanium */}
                    <div className="w-full lg:w-[290px] xl:w-[310px] shrink-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-[#0b0f19] dark:to-black border border-slate-300 dark:border-slate-700 rounded-[2rem] p-5 md:p-8 flex flex-col relative shadow-[0_10px_40px_rgba(100,116,139,0.25),inset_0_2px_10px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_3px_rgba(255,255,255,0.15),inset_0_-1px_4px_rgba(0,0,0,0.8),0_10px_50px_rgba(71,85,105,0.25)] transition-all duration-500 hover:shadow-[0_15px_60px_rgba(100,116,139,0.35),inset_0_2px_10px_rgba(255,255,255,0.9)] dark:hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.9),0_15px_60px_rgba(71,85,105,0.4)] overflow-hidden">

                        {/* Titanium Core Glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-32 bg-slate-400/40 dark:bg-slate-300/10 blur-[60px] pointer-events-none" />

                        <div className="mb-5 relative z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[20px] md:text-[22px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Enterprise</h3>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-[12px] font-medium leading-relaxed">
                                For universities & companies. Custom pricing.
                            </p>
                        </div>

                        <div className="space-y-4 mb-6 flex-1 border-t border-slate-300 dark:border-slate-800 pt-5 relative z-10">

                            {/* Universities Section */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-[0.18em] mb-2.5">For Universities</p>
                                <div className="space-y-2.5">
                                    {[
                                        { label: "Graduation Benchmark", sub: "Set a target ZEDX score as a graduation prerequisite" },
                                        { label: "CV-Based Prep", sub: "AI generates questions tailored to each student's major & resume" },
                                        { label: "Build Confidence", sub: "Help students overcome interview anxiety before the real thing" },
                                        { label: "Performance Analytics", sub: "Real-time scoring pushes students to expert-level readiness" },
                                    ].map((f) => (
                                        <div key={f.label} className="flex items-start gap-2.5">
                                            <Check className="w-[15px] h-[15px] text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <div>
                                                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-200 leading-tight">{f.label}</div>
                                                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-snug">{f.sub}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-300 dark:border-slate-800" />

                            {/* Companies Section */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-[0.18em] mb-2.5">For Companies</p>
                                <div className="space-y-2.5">
                                    {[
                                        { label: "AI Candidate Screening", sub: "ZEDX acts as your interviewer — filter applicants at scale" },
                                        { label: "White-Label Branding", sub: "Your company logo replaces ZEDX in the interface" },
                                        { label: "Role-Specific Interviews", sub: "Tailor AI questions for any job title or department" },
                                        { label: "Ranked Applicant Reports", sub: "Scored PDF reports to easily compare candidates" },
                                        { label: "Enterprise Customization", sub: "Custom features and integrations built to your specs" },
                                    ].map((f) => (
                                        <div key={f.label} className="flex items-start gap-2.5">
                                            <Check className="w-[15px] h-[15px] text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" strokeWidth={2.5} />
                                            <div>
                                                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-200 leading-tight">{f.label}</div>
                                                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-snug">{f.sub}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <Button
                            className="w-full rounded-full py-6 bg-gradient-to-b from-slate-600 to-slate-800 dark:from-slate-200 dark:to-slate-400 text-white dark:text-slate-900 hover:opacity-90 font-bold text-[15px] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_15px_rgba(71,85,105,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_15px_rgba(255,255,255,0.15)] border border-slate-900 dark:border-slate-100 flex items-center justify-center relative z-10"
                            onClick={() => router.push('/contact-sales')}
                        >
                            Contact Sales
                        </Button>
                    </div>


                    {/* Global Payment Methods Banner */}

                    <div className="mt-16 pt-8 flex flex-col items-center justify-center relative z-10 w-full mb-8">
                        <p className="text-zinc-500 dark:text-zinc-400 text-[15px] md:text-[16px] font-medium mb-8 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
                            Secured & Supported Payments
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 px-4 max-w-full">

                            <img src="/visa.png" className="h-10 sm:h-16 w-auto object-contain shrink-0" alt="Visa" />

                            <div className="hidden sm:block h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

                            <img src="/master.png" className="h-12 sm:h-20 w-auto object-contain shrink-0" alt="Mastercard" />

                            <div className="hidden sm:block h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

                            {/* Google Pay dynamic component to handle dark mode text color */}
                            <div className="flex items-center gap-1.5 h-10 shrink-0">
                                <FcGoogle className="w-8 h-8 sm:w-10 sm:h-10" />
                                <span className="text-[20px] sm:text-[26px] font-medium tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'sans-serif' }}>Pay</span>
                            </div>

                            <div className="hidden sm:block h-10 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

                            {/* Instapay flex layout because instapay.jpg is just a square circle icon */}
                            <div className="flex items-center gap-2 h-10 shrink-0">
                                <img src="/instapay.jpg" className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-full" alt="Instapay" />
                                <span className="text-[18px] sm:text-[22px] font-bold tracking-tight text-zinc-900 dark:text-white">Instapay</span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Comparison Table - Grok Style */}
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative z-10 w-full">
                <div className="text-center mb-12">
                    <h2 className="text-[28px] md:text-[36px] font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Compare features across plans</h2>
                </div>

                {/* Sticky Plan Headers */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr>
                                <th className="text-left pb-4 pl-4 w-[30%]"></th>
                                {[
                                    { name: "Free", tier: "free" },
                                    { name: "ZEDX Pro", tier: "pro" },
                                    { name: "ZEDX Ultra", tier: "ultra" },
                                ].map((plan) => {
                                    const tierRank: Record<string, number> = { free: 0, pro: 1, ultra: 2 };
                                    const isCurrentOrHigher = tierRank[userTier] >= tierRank[plan.tier];
                                    const isExact = userTier === plan.tier;
                                    return (
                                        <th key={plan.tier} className="pb-4 text-center w-[17%]">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{plan.name}</span>
                                                <button
                                                    disabled={isCurrentOrHigher}
                                                    onClick={() => {
                                                        if (!isAuthenticated) {
                                                            window.location.href = '/login';
                                                        } else if (plan.tier === 'pro') {
                                                            window.open('https://ziademad5.gumroad.com/l/hkfdfv', '_blank');
                                                        } else if (plan.tier === 'ultra') {
                                                            window.open('https://ziademad5.gumroad.com/l/molojy', '_blank');
                                                        }
                                                    }}
                                                    className={`px-4 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
                                                        isExact
                                                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent cursor-default"
                                                            : isCurrentOrHigher
                                                            ? "bg-black/5 dark:bg-white/10 text-zinc-500 border-zinc-200 dark:border-zinc-800 cursor-default"
                                                            : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
                                                    }`}
                                                >
                                                    {isExact
                                                        ? (plan.tier === 'free' ? 'Current' : 'Active')
                                                        : isCurrentOrHigher
                                                        ? 'Included'
                                                        : (plan.tier === 'free' ? 'Get started' : plan.tier === 'pro' ? 'Get Pro' : 'Get Ultra')
                                                    }
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                                {/* Enterprise Column Header */}
                                <th className="pb-4 text-center w-[19%]">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">Enterprise</span>
                                        <button
                                            onClick={() => window.open('mailto:zedx.ai.support@gmail.com?subject=Enterprise%20Inquiry', '_blank')}
                                            className="px-4 py-1.5 rounded-full text-[12px] font-semibold border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-black hover:text-black dark:hover:border-white dark:hover:text-white transition-all cursor-pointer bg-transparent"
                                        >
                                            Contact Sales
                                        </button>
                                    </div>
                                </th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-zinc-800/60">
                            {[
                                {
                                    category: "Core Features",
                                    rows: [
                                        { label: "Voice-to-Voice AI Interviews", free: true, pro: true, ultra: true, ent: true },
                                        { label: "AI-generated questions from your CV", free: true, pro: true, ultra: true, ent: true },
                                        { label: "PDF Performance Report", free: true, pro: true, ultra: true, ent: true },
                                        { label: "Unlimited Sessions & Questions", free: false, pro: true, ultra: true, ent: true },
                                        { label: "Training History", free: true, pro: true, ultra: true, ent: true },
                                    ],
                                },
                                {
                                    category: "Language & Customization",
                                    rows: [
                                        { label: "20 Languages", free: false, pro: true, ultra: true, ent: true },
                                        { label: "All 29 Languages", free: false, pro: false, ultra: true, ent: true },
                                        { label: "Custom difficulty level", free: false, pro: true, ultra: true, ent: true },
                                        { label: "Expert (FAANG) difficulty", free: false, pro: false, ultra: true, ent: true },
                                        { label: "Custom interview length", free: false, pro: true, ultra: true, ent: true },
                                    ],
                                },
                                {
                                    category: "AI Models",
                                    rows: [
                                        { label: "Gemini 3.8 Flash", free: true, pro: true, ultra: true, ent: true },
                                        { label: "Claude Fable 5.1", free: false, pro: true, ultra: true, ent: true },
                                        { label: "GPT-6 Astra", free: false, pro: false, ultra: true, ent: true },
                                        { label: "Custom AI model fine-tuning", free: false, pro: false, ultra: false, ent: true },
                                    ],
                                },
                                {
                                    category: "Analytics & Reports",
                                    rows: [
                                        { label: "Real-time feedback during interview", free: false, pro: true, ultra: true, ent: true },
                                        { label: "Granular scorecard breakdown", free: false, pro: true, ultra: true, ent: true },
                                        { label: "Advanced performance analytics", free: false, pro: false, ultra: true, ent: true },
                                        { label: "Admin analytics dashboard", free: false, pro: false, ultra: false, ent: true },
                                        { label: "Ranked applicant reports", free: false, pro: false, ultra: false, ent: true },
                                    ],
                                },
                                {
                                    category: "Enterprise",
                                    rows: [
                                        { label: "Bulk seat management (50–500+ users)", free: false, pro: false, ultra: false, ent: true },
                                        { label: "Custom question banks", free: false, pro: false, ultra: false, ent: true },
                                        { label: "White-label branding", free: false, pro: false, ultra: false, ent: true },
                                        { label: "AI candidate screening for hiring", free: false, pro: false, ultra: false, ent: true },
                                        { label: "Custom role-based filters", free: false, pro: false, ultra: false, ent: true },
                                        { label: "Graduation requirement integration", free: false, pro: false, ultra: false, ent: true },
                                        { label: "Dedicated onboarding & SLA support", free: false, pro: false, ultra: false, ent: true },
                                    ],
                                },
                                {
                                    category: "Support",
                                    rows: [
                                        { label: "Community support", free: true, pro: true, ultra: true, ent: true },
                                        { label: "Priority email support", free: false, pro: true, ultra: true, ent: true },
                                        { label: "VIP direct support & feature requests", free: false, pro: false, ultra: true, ent: true },
                                        { label: "Dedicated account manager", free: false, pro: false, ultra: false, ent: true },
                                    ],
                                },
                            ].map((section) => (
                                <React.Fragment key={section.category}>
                                    <tr className="border-t border-black/5 dark:border-zinc-800/60">
                                        <td colSpan={5} className="pt-6 pb-2 pl-4">
                                            <span className="text-[13px] font-semibold text-zinc-500 uppercase tracking-wider">{section.category}</span>
                                        </td>
                                    </tr>
                                    {section.rows.map((row) => (
                                        <tr key={row.label} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pl-4 pr-4">
                                                <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{row.label}</span>
                                            </td>
                                            {[row.free, row.pro, row.ultra, row.ent].map((has, i) => (
                                                <td key={i} className="py-3 text-center">
                                                    {has
                                                        ? <span className={`text-[15px] ${i === 3 ? 'text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-200'}`}>✓</span>
                                                        : <span className="text-zinc-300 dark:text-zinc-700 text-[17px]">—</span>
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}

                        </tbody>
                    </table>
                </div>
            </div>

            {/* Instapay Modal - Apple/MacBook Style */}

            <Dialog open={isInstapayModalOpen} onOpenChange={setIsInstapayModalOpen}>
                <DialogContent className="sm:max-w-[420px] bg-zinc-950/70 backdrop-blur-3xl border border-white/10 text-white rounded-[2.5rem] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden p-6 sm:p-8">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-[22px] font-semibold flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shadow-sm">
                                <Image src="/instapay.jpg" alt="Instapay" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            Instapay Payment
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-[14px] leading-relaxed mt-3">
                            To upgrade to <strong className="text-white font-medium">{instapayTier === "ultra" ? "ZEDX Ultra" : "ZEDX Pro"}</strong>, please transfer exactly <strong className={instapayTier === "ultra" ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>{instapayTier === "ultra" ? "600 EGP" : "300 EGP"}</strong> to the account below. Once transferred, provide your handle or transaction ID for verification.
                        </DialogDescription>
                    </DialogHeader>

                    {!submitSuccess ? (
                        <div className="space-y-6">
                            <div className="bg-white/[0.03] p-5 rounded-[1.5rem] border border-white/[0.08] flex flex-col items-center justify-center relative group transition-all hover:bg-white/[0.05]">
                                <p className="text-[12px] text-zinc-500 mb-2 font-medium tracking-wide uppercase">Send to Instapay Address</p>
                                <div className="flex items-center gap-3">
                                    <div className="text-[18px] sm:text-[20px] font-mono font-semibold text-white tracking-wide">
                                        zyad02153@instapay
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText("zyad02153@instapay");
                                                setCopied(true);
                                                toast.success("Instapay address copied to clipboard!");
                                                setTimeout(() => setCopied(false), 2000);
                                            } catch (err) {
                                                toast.error("Failed to copy. Please copy manually.");
                                            }
                                        }}
                                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-zinc-300 hover:text-white flex-shrink-0 cursor-pointer border border-white/5 shadow-sm active:scale-95"
                                        title="Copy address"
                                    >
                                        {copied ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-400" /> : <Copy className="w-[18px] h-[18px]" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[12px] font-medium text-zinc-400 tracking-wide uppercase pl-1">
                                    Your Handle or Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    placeholder="e.g. 01012345678 or handle@instapay"
                                    className="w-full bg-black/50 border border-white/10 rounded-full px-5 py-3.5 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-[22px] font-semibold text-white tracking-tight">Request Submitted!</h3>
                            <p className="text-zinc-400 text-[14px] max-w-[280px] mx-auto leading-relaxed">
                                We are verifying your payment. Your account will be upgraded to Pro within 1-2 minutes.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="sm:justify-end gap-3 mt-8">
                        {!submitSuccess ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsInstapayModalOpen(false)} className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full h-11 px-6 font-medium text-[15px] transition-colors">Cancel</Button>
                                <Button
                                    onClick={handleInstapaySubmit}
                                    disabled={!transactionId.trim() || isSubmitting}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-black rounded-full h-11 px-6 font-semibold shadow-[0_2px_10px_rgba(16,185,129,0.2)] text-[15px] transition-all"
                                >
                                    {isSubmitting ? "Submitting..." : "I have transferred"}
                                </Button>
                            </>
                        ) : (
                            <Button
                                onClick={() => {
                                    setIsInstapayModalOpen(false);
                                    setSubmitSuccess(false);
                                    setTransactionId("");
                                }}
                                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full h-11 font-medium transition-colors"
                            >
                                Done
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Floating Help Center Button (Pro/Ultra Only) */}
            {(userTier === 'pro' || userTier === 'ultra') && (
                <div className="fixed bottom-6 left-6 z-50">
                    <Link
                        href="mailto:zedx.ai.support@gmail.com"
                        className="flex items-center gap-3 bg-white dark:bg-[#111] border border-zinc-200 dark:border-white/10 px-5 py-3.5 rounded-full shadow-2xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] hover:-translate-y-1 transition-all group backdrop-blur-md"
                    >
                        <Image src="/Priority VIP Support.png" alt="Help Center" width={26} height={26} className="object-contain group-hover:scale-110 transition-transform" />
                        <span className="text-[14px] font-semibold text-zinc-700 dark:text-zinc-300">Help Center</span>
                    </Link>
                </div>
            )}
        </div>
    );
}
