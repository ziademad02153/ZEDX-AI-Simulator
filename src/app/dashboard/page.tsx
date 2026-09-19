"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle, Calendar, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { interviewService, Interview } from "@/lib/interview-service";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { StartButton } from "@/components/start-button";

export default function DashboardPage() {
    const router = useRouter();
    const { confirm } = useConfirmDialog();
    const [stats, setStats] = useState({ totalInterviews: 0, totalMinutes: 0 });
    const [recentSessions, setRecentSessions] = useState<Interview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const interviews = await interviewService.getUserInterviews();
                setIsAuthChecking(false); // Auth passed
                setRecentSessions(interviews.slice(0, 3)); // Get top 3

                // Calculate total minutes from actual durations, fallback to 1 min per interview
                const totalMins = interviews.reduce((sum, iv) => {
                    const duration = iv.analysis?.duration_minutes || 1;
                    return sum + duration;
                }, 0);

                setStats({
                    totalInterviews: interviews.length,
                    totalMinutes: totalMins
                });
            } catch (e: unknown) {
                const err = e as Error;
                if (err.message?.includes("User not authenticated")) {
                    router.push("/login");
                    return;
                }
                setIsAuthChecking(false);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
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
            setRecentSessions(prev => prev.filter(s => s.id !== id));
            setStats(prev => ({ ...prev, totalInterviews: prev.totalInterviews - 1 }));
        } catch (e: unknown) {
            const err = e as Error;
            console.error(err);
            // FIX: Show user-facing error message when delete fails
            alert("Failed to delete interview:" + (err.message || "Try again"));
        }
    };

    // Show loading while checking auth
    if (isAuthChecking) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Dashboard <span className="inline-block origin-bottom-right hover:animate-wave">👋</span>
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                        Welcome back! Ready for your next interview?
                    </p>
                </div>
                <StartButton variant="dashboard" className="w-full sm:w-auto" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl shadow-zinc-200/20 dark:shadow-none border border-zinc-200/50 dark:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Clock size={20} className="sm:size-[24px]" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Total Time</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMinutes}m</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl shadow-zinc-200/20 dark:shadow-none border border-zinc-200/50 dark:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                            <CheckCircle size={20} className="sm:size-[24px]" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Interviews Completed</p>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInterviews}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-zinc-200/20 dark:shadow-none border border-zinc-200/50 dark:border-white/10 p-6 sm:p-10 transition-colors flex-1 flex flex-col mt-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent History</h3>
                    {recentSessions.length > 0 && (
                        <Link href="/dashboard/history">
                            <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400">
                                View All
                            </Button>
                        </Link>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                <div className="flex items-center gap-4 w-full">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="space-y-2 w-full max-w-[200px]">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-2/3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentSessions.length === 0 ? (
                    <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No interviews yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">Start your first mock interview to see your history and analytics here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recentSessions.map((session) => (
                            <Link href="/dashboard/history" key={session.id}>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{session.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(session.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
                                            onClick={(e) => handleDelete(session.id, e)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                        <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
