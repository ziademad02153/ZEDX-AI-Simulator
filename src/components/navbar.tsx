"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, PlayCircle, FolderOpen, History, MonitorSmartphone, Info, LogOut, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "New Interview", href: "/dashboard/new" },
    { label: "My Context Files", href: "/dashboard/resumes" },
    { label: "Training History", href: "/dashboard/history" },
    { label: "Pricing", href: "/pricing" },
    { label: "How it Works", href: "/#features" },
    { label: "Desktop App", href: "/download" },
    { label: "About ZEDX", href: "/about" },
    { label: "Contact Sales", href: "/contact-sales" },
];



export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).electronAPI?.isElectron) {
            setIsDesktop(true);
        }
    }, []);
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (isDesktop) return null;


    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out print:hidden",
            scrolled
                ? "bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 shadow-sm"
                : "bg-transparent border-b border-transparent"
        )}>
            <div className="w-full">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between h-16 sm:h-20 px-6 md:px-10">

                    <Link href="/" className="flex items-center gap-2 group shrink-0 -ml-[39px] sm:-ml-[44px]">
                        <Image
                            src="/zedx-logo.png"
                            alt="ZEDX-AI Logo"
                            width={400}
                            height={133}
                            className="object-contain object-left transition-all duration-300 group-hover:opacity-80 w-52 sm:w-64 h-auto drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:drop-shadow-none"
                            priority
                        />
                    </Link>

                    {/* Desktop Static Links */}
                    <div className="hidden xl:flex flex-1 items-center justify-center gap-7 2xl:gap-10 px-6">
                        {NAV_LINKS.map((link, idx) => (
                            <Link key={idx} href={link.href} className="whitespace-nowrap text-[14px] md:text-[15px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors duration-200">
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <div className="hidden xl:flex items-center gap-3">
                            <AuthButtons scrolled={scrolled} />
                        </div>
                        <div className="xl:hidden">
                            <MobileMenu />
                        </div>
                    </div>

                </div>
            </div>
        </nav>
    );
}

function MobileMenu() {
    const [open, setOpen] = useState(false);
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <Menu className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                </Button>
            </SheetTrigger>
            <SheetContent side="top" className="w-full h-[100dvh] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-none p-6 pt-24 flex flex-col items-center gap-8">
                <div className="absolute top-4 left-4 h-[36px] flex items-center gap-2 -ml-[24px]">
                    <Image src="/zedx-logo.png" alt="ZEDX-AI Logo" width={140} height={45} className="object-contain object-left drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] dark:drop-shadow-none" />
                </div>
                <div className="flex flex-col items-center justify-start mt-4 gap-8 overflow-y-auto w-full max-w-sm flex-1 pb-4">
                    {NAV_LINKS.map((link, idx) => (
                        <Link 
                            key={idx} 
                            href={link.href} 
                            onClick={() => setOpen(false)}
                            className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
                <div className="w-full max-w-sm pb-8">
                    <AuthButtons isMobile onSheetClose={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}



function AuthButtons({ isMobile, scrolled, onSheetClose }: { isMobile?: boolean, scrolled?: boolean, onSheetClose?: () => void }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [userTier, setUserTier] = useState<string>('free');
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const hasToken = document.cookie.split(';').some((item) => item.trim().startsWith('auth_token='));
            if (hasToken) setIsLoggedIn(true);

            try {
                const { supabase } = await import("@/lib/supabase");
                const { data } = await supabase.auth.getSession();

                if (data.session) {
                    setIsLoggedIn(true);
                    setUserName(data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || null);
                    setUserEmail(data.session.user.email || null);
                    setUserAvatar(data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture || null);
                    
                    const { data: profile } = await supabase.from('profiles').select('tier').eq('id', data.session.user.id).single();
                    if (profile?.tier) setUserTier(profile.tier);
                }
            } catch (e) {
                console.error("Auth check error:", e);
            }
        };

        checkAuth();
        const interval = setInterval(checkAuth, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        try {
            const { supabase } = await import("@/lib/supabase");
            await supabase.auth.signOut();
        } catch (e) {
            console.error("Logout error:", e);
        }
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    if (isLoggedIn) {
        if (isMobile) {
            return (
                <div className="w-full flex flex-col gap-4">
                    <div className="flex flex-col items-center gap-3 p-4">
                        <div className="relative shrink-0 flex items-center justify-center">
                            <div className={cn(
                                "w-20 h-20 rounded-full overflow-hidden shrink-0 transition-all",
                                userTier === 'pro' ? "ring-[3px] ring-[#a3e635] ring-offset-4 ring-offset-transparent dark:ring-offset-transparent" : 
                                userTier === 'ultra' ? "ring-[3px] ring-amber-400 ring-offset-4 ring-offset-transparent dark:ring-offset-transparent" : 
                                "border border-zinc-200 dark:border-zinc-700"
                            )}>
                                {userAvatar ? (
                                    <Image src={userAvatar} alt="Avatar" width={80} height={80} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-3xl">
                                        {userName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            {(userTier === 'pro' || userTier === 'ultra') && (
                                <div className={cn(
                                    "absolute -bottom-3 left-1/2 -translate-x-1/2 text-black text-[9px] tracking-[0.1em] font-black px-2.5 py-0.5 rounded-full shadow-md z-10 uppercase whitespace-nowrap pointer-events-none",
                                    userTier === 'ultra' ? "bg-gradient-to-r from-amber-500 to-yellow-300" : "bg-gradient-to-r from-emerald-500 to-[#a3e635]"
                                )}>
                                    {userTier.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="text-center w-full mt-2">
                            <p className="font-bold text-2xl text-gray-900 dark:text-white truncate">{userName || 'User'}</p>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">{userEmail}</p>
                        </div>
                    </div>
                    <button onClick={() => { handleLogout(); onSheetClose?.(); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:text-red-600 transition-colors font-semibold text-lg mt-1">
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-3">
                <DesktopUserDropdown 
                    userAvatar={userAvatar}
                    userName={userName}
                    userEmail={userEmail}
                    userTier={userTier}
                    handleLogout={handleLogout}
                    scrolled={scrolled}
                />
            </div>
        );
    }

    return (
        <div className={cn("flex gap-3", isMobile ? "flex-col w-full" : "items-center")}>
            <Button asChild className={cn(
                "font-semibold transition-all border-none shadow-none",
                isMobile 
                    ? "w-full bg-[#84cc16] hover:bg-[#65a30d] text-white rounded-full h-14 text-lg shadow-lg shadow-[#84cc16]/25" 
                    : "text-[14px] bg-white text-black hover:bg-zinc-200 px-5 rounded-full h-10"
            )}>
                <Link href="/login" onClick={onSheetClose}>
                    Try for free
                </Link>
            </Button>
        </div>
    );
}

interface DesktopUserDropdownProps {
    userAvatar: string | null;
    userName: string | null;
    userEmail: string | null;
    userTier: string;
    handleLogout: () => void;
    scrolled?: boolean;
}

function DesktopUserDropdown({ userAvatar, userName, userEmail, userTier, handleLogout, scrolled }: DesktopUserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative shrink-0 flex items-center justify-center">
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "rounded-full overflow-hidden cursor-pointer transition-all duration-300 shadow-sm shrink-0",
                        userTier === 'pro' ? "ring-2 ring-[#a3e635] ring-offset-2 ring-offset-white dark:ring-offset-[#0a0a0a]" : 
                        userTier === 'ultra' ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0a0a0a]" : "border border-zinc-200 dark:border-zinc-700 hover:ring-2 hover:ring-emerald-500/50",
                        scrolled ? "w-7 h-7 sm:w-9 sm:h-9" : "w-9 h-9 sm:w-11 sm:h-11"
                    )}
                >
                    {userAvatar ? (
                        <Image src={userAvatar} alt="Avatar" width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-base">
                            {userName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    )}
                </div>
                {(userTier === 'pro' || userTier === 'ultra') && (
                    <div className={cn(
                        "absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-black text-[6.5px] tracking-[0.1em] font-black px-1.5 py-[2px] rounded-full shadow-sm z-10 uppercase whitespace-nowrap pointer-events-none",
                        userTier === 'ultra' ? "bg-gradient-to-r from-amber-500 to-yellow-300" : "bg-gradient-to-r from-emerald-500 to-[#a3e635]"
                    )}>
                        {userTier.toUpperCase()}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-[#111111]/95 backdrop-blur-3xl border border-zinc-200/80 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col z-50 p-2"
                    >
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/5 mb-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{userName || 'User'}</p>
                                {(userTier === 'pro' || userTier === 'ultra') && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                        userTier === 'ultra' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    )}>
                                        {userTier.toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                        </div>

                        <button 
                            onClick={() => { setIsOpen(false); handleLogout(); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors w-full text-left"
                        >
                            <LogOut size={18} /> Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
