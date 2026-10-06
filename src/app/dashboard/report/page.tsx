"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { interviewService } from "@/lib/interview-service";
import { motion } from "framer-motion";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function ReportRedirectPage() {
    const router = useRouter();
    const [statusMessage, setStatusMessage] = useState("Locating your assessment report...");

    useEffect(() => {
        let isMounted = true;

        const resolveReportTarget = async () => {
            try {
                // 1. Check if current_db_id was saved from an active interview
                const currentDbId = typeof window !== "undefined" ? localStorage.getItem("current_db_id") : null;
                if (currentDbId) {
                    if (isMounted) router.replace(`/dashboard/report/${currentDbId}`);
                    return;
                }

                // 2. Fetch the most recent interview session for the user
                setStatusMessage("Retrieving recent interview sessions...");
                const interviews = await interviewService.getUserInterviews();
                
                if (interviews && interviews.length > 0) {
                    if (isMounted) router.replace(`/dashboard/report/${interviews[0].id}`);
                    return;
                }

                // 3. If no sessions exist, route to start a new interview
                if (isMounted) router.replace("/dashboard/new");

            } catch (err) {
                console.warn("[Report Redirect] Error resolving interview target:", err);
                if (isMounted) router.replace("/dashboard/history");
            }
        };

        resolveReportTarget();

        return () => {
            isMounted = false;
        };
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070708] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse" />
            </div>

            <div className="z-10 flex flex-col items-center gap-6 text-center">
                <div className="relative w-28 h-28">
                    <motion.svg 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }} 
                        className="absolute inset-0 w-full h-full" 
                        viewBox="0 0 100 100"
                    >
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="3" />
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="3" 
                            strokeLinecap="round" 
                            strokeDasharray="70 212" 
                        />
                    </motion.svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 relative">
                            <Image 
                                src="/icon.jpg" 
                                alt="ZEDX" 
                                fill 
                                className="object-contain rounded-2xl shadow-lg shadow-emerald-500/30" 
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Executive Assessment
                    </h2>
                    <p className="text-xs font-mono text-slate-400">
                        {statusMessage}
                    </p>
                </div>

                <div className="w-48 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-emerald-500 rounded-full" 
                        initial={{ x: "-100%" }} 
                        animate={{ x: "100%" }} 
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} 
                    />
                </div>
            </div>
        </div>
    );
}
