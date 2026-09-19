"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, PlayCircle, FolderOpen, History, MonitorSmartphone, Info, LogOut } from "lucide-react";
import { motion, AnimatePresence, useAnimationFrame, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "New Simulation", href: "/dashboard/new" },
    { label: "My Context Files", href: "/dashboard/resumes" },
    { label: "Training History", href: "/dashboard/history" },
    { label: "Pricing", href: "/pricing" },
    { label: "How it Works", href: "/#features" },
    { label: "Desktop App", href: "/download" },
    { label: "About ZEDX", href: "/about" },
];

const NavGroup = () => (
    <div className="flex gap-8 md:gap-12 items-center pr-8 md:pr-12 w-max shrink-0">
        {NAV_LINKS.map((link, idx) => (
            <Link key={idx} href={link.href} className="whitespace-nowrap text-[14px] font-semibold tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors duration-300 shrink-0">
                {link.label}
            </Link>
        ))}
    </div>
);

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
            "fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out print:hidden",
            scrolled
                ? "top-4 w-[90%] max-w-[56.25rem] lg:max-w-[900px]"
                : "top-6 sm:top-8 w-[95%] max-w-[65.625rem] lg:max-w-[1050px]"
        )}>
            <div className={cn(
                "flex items-center justify-between rounded-full border transition-all duration-500 ease-out",
                    scrolled
                        ? "bg-white/90 dark:bg-[#0a0a0a]/85 backdrop-blur-3xl border-zinc-200/80 dark:border-white/15 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.8)] pl-0 pr-4 sm:pl-2 sm:pr-8 h-12 sm:h-14"
                        : "bg-white/70 dark:bg-[#0a0a0a]/60 backdrop-blur-xl border-zinc-200/40 dark:border-white/10 shadow-[0_4px_20px_rgb(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] pl-0 pr-6 sm:pl-2 sm:pr-10 md:pl-3 md:pr-12 h-14 sm:h-[68px]"
            )}>
                
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group shrink-0 -ml-2 sm:-ml-4 md:-ml-6">
                    <Image
                        src="/zedx-logo.png"
                        alt="ZEDX-AI Logo"
                        width={360}
                        height={120}
                        className={cn(
                            "object-contain transition-all duration-500 group-hover:scale-105",
                            scrolled ? "w-32 sm:w-36 md:w-[185px] h-auto" : "w-36 sm:w-44 md:w-[218px] h-auto"
                        )}
                        style={{ height: "auto" }}
                        priority
                    />
                </Link>

                {/* Desktop & Mobile Marquee Links */}
                <div 
                    className="flex flex-1 overflow-hidden relative w-full -ml-2 mr-4 sm:-ml-4 sm:mr-8 md:-ml-6 md:mr-12 h-full items-center justify-start [mask-image:linear-gradient(to_right,transparent,black_60px,black_calc(100%_-_60px),transparent)]"
                >
                    <DraggableMarquee />
                </div>

                {/* Right Side (Auth) */}
                <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                    <div className="block">
                        <AuthButtons scrolled={scrolled} />
                    </div>
                </div>

            </div>
        </nav>
    );
}

function DraggableMarquee() {
    const baseX = useMotionValue(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const initialized = useRef(false);

    useAnimationFrame((t, delta) => {
        if (contentRef.current) {
            const singleGroupWidth = contentRef.current.scrollWidth / 16;
            
            // Initialize position in the exact middle to ensure content exists on both left and right
            if (!initialized.current && singleGroupWidth > 0) {
                baseX.set(-singleGroupWidth * 8);
                initialized.current = true;
                return;
            }

            if (!isHovered) {
                // Speed of auto scroll: 40px per second to the left
                const moveBy = -40 * (delta / 1000);
                let newX = baseX.get() + moveBy;
                
                // Keep the value perfectly bounded between group 7 and 9
                // to guarantee endless scrolling on ultra-wide monitors
                if (newX <= -singleGroupWidth * 9) {
                    newX += singleGroupWidth;
                } else if (newX > -singleGroupWidth * 7) {
                    newX -= singleGroupWidth;
                }
                baseX.set(newX);
            }
        }
    });

    return (
        <motion.div
            ref={contentRef}
            className="flex w-max items-center cursor-grab active:cursor-grabbing"
            style={{ x: baseX }}
            drag="x"
            dragConstraints={{ left: -100000, right: 100000 }} // virtually unbounded for infinite dragging
            dragElastic={0} // no bouncing
            onDrag={(e, info) => {
                if (contentRef.current) {
                    const singleGroupWidth = contentRef.current.scrollWidth / 16;
                    let newX = baseX.get(); // drag="x" automatically updates baseX
                    
                    // Seamlessly wrap during manual drag
                    if (newX <= -singleGroupWidth * 9) {
                        baseX.set(newX + singleGroupWidth);
                    } else if (newX > -singleGroupWidth * 7) {
                        baseX.set(newX - singleGroupWidth);
                    }
                }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
        >
            {Array.from({ length: 16 }).map((_, i) => (
                <NavGroup key={i} />
            ))}
        </motion.div>
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
                <div className="w-full flex flex-col gap-2">
                    <div className="flex items-center gap-3 p-2 mb-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                        <div className="relative shrink-0 flex items-center justify-center">
                            <div className={cn(
                                "w-12 h-12 rounded-full overflow-hidden shrink-0 transition-all",
                                userTier === 'pro' ? "ring-2 ring-[#a3e635] ring-offset-2 ring-offset-white dark:ring-offset-zinc-800" : "border border-zinc-200 dark:border-zinc-700"
                            )}>
                                {userAvatar ? (
                                    <Image src={userAvatar} alt="Avatar" width={48} height={48} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold text-xl">
                                        {userName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            {(userTier === 'pro' || userTier === 'ultra') && (
                                <div className={cn(
                                    "absolute -bottom-3.5 text-black text-[9px] tracking-wider font-extrabold px-2 py-0.5 rounded-full border-[1.5px] shadow-md z-10 uppercase",
                                    userTier === 'ultra' ? "bg-gradient-to-r from-amber-500 to-yellow-300 border-white dark:border-zinc-800" : "bg-gradient-to-r from-emerald-500 to-[#a3e635] border-white dark:border-zinc-800"
                                )}>
                                    {userTier.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 pl-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{userName || 'User'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                        </div>
                    </div>
                    <Button onClick={() => { router.push('/dashboard'); onSheetClose?.(); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
                        Go to Dashboard
                    </Button>
                    <button onClick={() => { handleLogout(); onSheetClose?.(); }} className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium">
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
        <div className={cn("flex gap-1.5 sm:gap-2", isMobile ? "flex-col" : "items-center")}>
            <Button asChild variant="ghost" className="text-[11px] sm:text-[12px] font-medium text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white px-2 sm:px-4 rounded-full">
                <Link href="/login" onClick={onSheetClose}>Sign in</Link>
            </Button>
            <Button asChild className="text-[11px] sm:text-[12px] font-semibold bg-gradient-to-r from-[#047857] to-[#bef264] text-white px-3 sm:px-4 rounded-full transition-all hover:scale-105 border-none shadow-none">
                <Link href="/login" onClick={onSheetClose}>Try Free</Link>
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
                        "absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-black text-[9px] tracking-wider font-extrabold px-2 py-0.5 rounded-full border-[1.5px] shadow-md z-10 uppercase whitespace-nowrap pointer-events-none",
                        userTier === 'ultra' ? "bg-gradient-to-r from-amber-500 to-yellow-300 border-white dark:border-[#0a0a0a]" : "bg-gradient-to-r from-emerald-500 to-[#a3e635] border-white dark:border-[#0a0a0a]"
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
