"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Download, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";

export function DesktopNavBar() {
    const pathname = usePathname();
    const [isDesktop, setIsDesktop] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [user, setUser] = useState<{ email?: string; user_metadata?: { avatar_url?: string; full_name?: string } } | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [updateVersion, setUpdateVersion] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUpdateReady, setIsUpdateReady] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUser(user);
                    setUserAvatar(user.user_metadata?.avatar_url || null);
                    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || null);
                }
            } catch (error) {
                console.error('Failed to load user:', error);
            }
        };

        if (typeof window !== "undefined" && window.electronAPI?.isElectron) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsDesktop(true);
            loadUser();

            // Update listeners
            const cleanupAvailable = window.electronAPI.onUpdateAvailable((version: string) => {
                setUpdateVersion(version);
            });
            const cleanupReady = window.electronAPI.onUpdateReady(() => {
                setIsUpdateReady(true);
                setIsDownloading(false);
            });

            return () => {
                cleanupAvailable();
                cleanupReady();
            };
        }
    }, []);



    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login?desktop=true';
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    if (!isDesktop || pathname === '/desktop' || pathname === '/desktop/overlay' || pathname?.startsWith('/desktop/overlay') || pathname === '/scanner-frame') return null;

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleClose = () => {
        window.electronAPI?.hideApp();
    };

    const handleDownloadUpdate = () => {
        setIsDownloading(true);
        window.electronAPI?.downloadUpdate();
    };

    const handleInstallUpdate = () => {
        window.electronAPI?.installUpdate();
    };

    return (
        <>
            <div
                className="h-11 bg-gradient-to-r from-emerald-900 to-emerald-800 flex items-center px-3 gap-2 shrink-0"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="w-7 h-7 rounded-md bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    title="Back"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Update Notification */}
                {updateVersion && (
                    <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                        {!isUpdateReady ? (
                            <button
                                onClick={handleDownloadUpdate}
                                disabled={isDownloading}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300",
                                    isDownloading
                                        ? "bg-amber-500/20 text-amber-500 animate-pulse border border-amber-500/30"
                                        : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                                )}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download size={12} />
                                        Update v{updateVersion} Available
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleInstallUpdate}
                                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-500/30 transition-all duration-300 animate-bounce"
                            >
                                <CheckCircle2 size={12} />
                                Update Ready! Restart Now
                            </button>
                        )}
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Account Actions */}
                {user ? (
                    <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/40 hover:border-white/70 transition-colors shadow-md"
                        >
                            {userAvatar ? (
                                <Image src={userAvatar} alt="User" width={36} height={36} className="w-full h-full object-cover" style={{ height: 'auto' }} />
                            ) : (
                                <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                                    {userName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </button>

                        {/* Dropdown */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 rounded-lg shadow-xl border border-zinc-700 py-1 z-50">
                                <div className="px-3 py-2 border-b border-zinc-700">
                                    <p className="text-white text-sm font-medium truncate">{userName}</p>
                                    <p className="text-zinc-400 text-xs truncate">{user.email}</p>
                                </div>
                                    <button
                                        onClick={() => { window.location.href = '/desktop-assistant'; setIsDropdownOpen(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                    >
                                        Simulation Setup
                                    </button>
                                <button
                                    onClick={() => { window.location.href = '/dashboard'; setIsDropdownOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={handleRefresh}
                                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                >
                                    Refresh
                                </button>
                                <div className="border-t border-zinc-700 mt-1 pt-1">
                                    <button
                                        onClick={handleClose}
                                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                                    >
                                        Background Mode
                                    </button>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="px-3 py-1.5 rounded-md bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors"
                        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    >
                        Sign In
                    </button>
                )}
            </div>

            {/* Click outside to close dropdown */}
            {isDropdownOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}
        </>
    );
}
