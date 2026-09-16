"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Video, FileText, LogOut, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings-dialog";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { PageTransition } from "@/components/page-transition";



function NavItems({ setMobileMenuOpen }: { setMobileMenuOpen: (open: boolean) => void }) {
    return (
        <div className="flex flex-col h-full justify-between py-2">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-sm font-medium">
                    <LayoutDashboard size={20} />
                    Dashboard
                </Button>
            </Link>
            
            <Link href="/dashboard/new" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-sm font-medium">
                    <Video size={20} />
                    New Interview
                </Button>
            </Link>
            
            <Link href="/dashboard/resumes" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-sm font-medium">
                    <FileText size={20} />
                    My Resumes
                </Button>
            </Link>
            
            <Link href="/dashboard/history" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-4 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 py-6 text-sm font-medium">
                    <Clock size={20} />
                    Interview History
                </Button>
            </Link>

            <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

            <Button
                variant="ghost"
                className="w-full justify-start gap-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 py-6 text-sm font-medium"
                onClick={async () => {
                    await supabase.auth.signOut();
                    document.cookie = "auth_token=; path=/; max-age=0";
                    window.location.href = "/login";
                }}
            >
                <LogOut size={20} />
                Sign Out
            </Button>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [showSettings, setShowSettings] = useState(false);
    const [, setMobileMenuOpen] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                router.push("/login?reason=expired");
                return;
            }

            // Skip onboarding check if user just finished an interview (on report page)
            const isReportPage = pathname === '/dashboard/report' || pathname?.startsWith('/dashboard/report');
            if (!isReportPage) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('profession, country')
                    .eq('id', data.session.user.id)
                    .single();

                if (!profile?.profession || !profile?.country) {
                    router.push("/onboarding");
                    return;
                }
            }

            setIsAuthChecking(false);
        };
        checkAuth();

        const handleOpenSettings = () => setShowSettings(true);
        window.addEventListener('openSettings', handleOpenSettings);
        return () => window.removeEventListener('openSettings', handleOpenSettings);
    }, [router, pathname]);

    if (isAuthChecking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-black flex flex-col transition-colors duration-300 overflow-x-hidden">
            <Navbar />
            <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

            <div className="flex-1 flex flex-col pt-32 pb-12 mt-4 sm:mt-8">
                <div className="flex flex-col w-full max-w-full md:max-w-[75vw] mx-auto px-6 sm:px-6 gap-6 sm:gap-8 items-stretch flex-1">


                    {/* Main Content */}
                    <main className="flex-1 flex flex-col py-4">
                        <PageTransition className="flex-1 flex flex-col">
                            {children}
                        </PageTransition>
                    </main>
                </div>
            </div>
        </div>
    );
}
