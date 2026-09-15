"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Check, Download, Monitor, Shield, Info } from "lucide-react";
import Link from "next/link";
import dynamic from 'next/dynamic';
const AnimatedOrb = dynamic(() => import('@/components/animated-orb').then(mod => mod.AnimatedOrb), { ssr: false });

export default function DownloadPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-x-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "ZEDX AI Desktop",
                        "operatingSystem": "Windows 10, Windows 11",
                        "applicationCategory": "BusinessApplication",
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.9",
                            "ratingCount": "150"
                        },
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        },
                        "downloadUrl": "https://github.com/ziademad02153/zedx-ai-dist/releases/download/v1.1.5/ZEDX.AI.Setup.1.1.5.exe",
                        "featureList": "Real-time Meeting Simulation, Internal Audio Routing, Context Analysis, Practice Interface, AI Simulator",
                        "author": {
                            "@type": "Organization",
                            "name": "ZEDX AI"
                        }
                    })
                }}
            />
            <Navbar />

            <main className="flex-grow pt-32 pb-20 relative">
                {/* Background Glow */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center mb-16">

                        <h1 className="text-5xl md:text-7xl font-semibold mb-6 tracking-tight text-zinc-900 dark:text-white">
                            Choose Your Path <br />
                            <span className="text-gradient-fusion font-bold">To Mastery.</span>
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                            Whether you want a strict <strong className="text-gradient-fusion">testing environment</strong> or an <strong className="text-gradient-fusion">assisted training sandbox</strong>, we have the perfect tool for your level.
                        </p>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20 items-stretch">
                        {/* Web Version Card */}
                        <div className="p-8 rounded-[2.5rem] border border-sky-200/50 dark:border-sky-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-indigo-500/10 flex flex-col group relative overflow-hidden bg-white/80 dark:bg-sky-950/40">
                            {/* Animated Sand Gradient */}
                            <style>
                                {`
                                @keyframes sandWave {
                                    0% { transform: scale(1.4) translate(0%, 0%) rotate(0deg); }
                                    33% { transform: scale(1.4) translate(-2%, 2%) rotate(1deg); }
                                    66% { transform: scale(1.4) translate(2%, -1%) rotate(-1deg); }
                                    100% { transform: scale(1.4) translate(0%, 0%) rotate(0deg); }
                                }
                                .sand-wave-gradient {
                                    animation: sandWave 10s ease-in-out infinite;
                                }
                                `}
                            </style>
                            <div className="absolute inset-0 z-0 mix-blend-overlay opacity-30 dark:opacity-10 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/50 via-emerald-400/30 to-blue-500/50 dark:from-indigo-500/40 dark:via-emerald-400/20 dark:to-blue-500/40 opacity-100 dark:opacity-80 blur-3xl z-0 sand-wave-gradient pointer-events-none"></div>
                            
                            <div className="flex items-center justify-between mb-8 mt-2 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                                        <AnimatedOrb className="w-16 h-16" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">AI Interviewer Robot</h3>
                                        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">Web Simulator</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
                                Designed for advanced candidates. Experience a strict, hyper-realistic interview environment powered by our most advanced autonomous models.
                            </p>
                            <ul className="space-y-4 mb-10 text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-grow relative z-10">
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0"></div>
                                    <span><strong>Voice-to-Voice AI:</strong> True conversational partner</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0"></div>
                                    <span><strong>Groq™ LPU:</strong> Instant, zero-latency processing</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0"></div>
                                    <span><strong>Deep Analytics:</strong> Granular post-interview scorecard</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] shrink-0"></div>
                                    <span><strong>Unfiltered:</strong> No hints, simulating real pressure</span>
                                </li>
                            </ul>
                            <Link href="/dashboard" className="block mt-auto relative z-10">
                                <Button variant="ghost" className="w-full rounded-2xl py-7 text-xl hover:bg-indigo-500/10 transition-all font-extrabold border-0 shadow-none">
                                    <span className="relative z-10 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                                        Launch Web Simulator
                                    </span>
                                </Button>
                            </Link>
                        </div>

                        {/* Desktop App Card */}
                        <div className="p-8 rounded-[2.5rem] border border-emerald-200/50 dark:border-emerald-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-emerald-500/10 flex flex-col group relative overflow-hidden bg-[#eefadc] dark:bg-[#1a2f1c]">
                            {/* Animated Emerald Glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-teal-500/10 to-emerald-500/20 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-emerald-500/20 animate-pulse opacity-80 blur-3xl z-0"></div>
                            
                            <div className="flex items-center justify-between mb-8 mt-2 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                        <CommandIcon />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">AI Interview Mentor</h3>
                                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Desktop Sandbox</p>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8 relative z-10">
                                Designed for skill improvement. The AI acts as your copilot, analyzing your screen and providing suggested answers in real-time to build your confidence.
                            </p>
                            
                            <ul className="space-y-4 mb-10 text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-grow relative z-10">
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"></div>
                                    <span><strong>Live AI Copilot:</strong> Get real-time answer suggestions</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"></div>
                                    <span><strong>Screen Capture (OCR):</strong> AI analyzes shared code/screens</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"></div>
                                    <span><strong>Internal Audio Routing:</strong> Flawless system audio capture</span>
                                </li>
                                <li className="flex gap-3 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0"></div>
                                    <span><strong>Manual Chat:</strong> Ask follow-up questions anytime</span>
                                </li>
                            </ul>

                            <div className="space-y-4 mt-auto relative z-10">
                                <Link
                                    href="https://github.com/ziademad02153/zedx-ai-dist/releases/download/v1.1.5/ZEDX.AI.Setup.1.1.5.exe"
                                    className="block"
                                >
                                    <Button variant="ghost" className="w-full rounded-2xl py-7 text-xl hover:bg-emerald-500/10 transition-all font-extrabold border-0 shadow-none">
                                        <span className="relative z-10 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                                            <Download size={22} strokeWidth={2.5} />
                                            Download for Windows
                                        </span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                    {/* Mac Coming Soon */}
                    <div className="max-w-md mx-auto text-center p-6 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                        <div className="flex items-center justify-center gap-3 mb-2 opacity-50">
                            <AppleIcon />
                            <span className="font-semibold text-gray-900 dark:text-white">macOS Version</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            We are currently polishing the Mac version.
                            <span className="block mt-1 font-medium text-emerald-500 cursor-pointer hover:underline">soon</span>
                        </p>
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}

function GlobeIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
}

function MonitorIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    )
}

function AppleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.8">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.82 3.8-.74 2.07.11 3.2.74 4.1 1.74-2.86 1.83-2.3 4.8.46 6.08a4.12 4.12 0 0 1-.95 2.15l-.01.01c-.13.16-.16.2-.24.28l-.24.27zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
    )
}

function CommandIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
    )
}
