"use client";

import { syncServerSession } from "@/lib/session-sync";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, User, LogOut, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useConfirmDialog } from "@/components/confirm-dialog";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { confirm, showToast } = useConfirmDialog();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            // Load user info when dialog opens
            const loadUser = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                setUserEmail(user?.email || null);
            };
            loadUser();
        }
    }, [open]);

    const handleSignOut = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            await syncServerSession(null);
            // Clear auth cookie
            document.cookie = "auth_token=; path=/; max-age=0";
            window.location.href = "/login";
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetAppData = async () => {
        const confirmed = await confirm({
            title: "Reset App Data",
            message: "Are you sure? This will clear your local data (Resume, Interview settings). This cannot be undone.",
            confirmText: "Reset Data",
            variant: "danger"
        });
        if (confirmed) {
            const keysToRemove = [
                "interview_context_jd",
                "interview_context_resume",
                "interview_context_type",
                "interview_context_lang",
                "selected_ai_model"
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            showToast("App data cleared. Page will reload.", "success");
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className={cn("p-6 rounded-2xl shadow-xl w-full max-w-sm transition-colors border bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-200 dark:border-zinc-700")}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Settings className="text-gray-500 dark:text-gray-400" size={20} /> Settings
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="dark:text-white dark:hover:bg-zinc-800">X</Button>
                </div>

                <div className="space-y-6">
                    {/* Account Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center">
                                <User className="text-white" size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {userEmail || "Not signed in"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Account</p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={handleSignOut}
                            disabled={isLoading}
                        >
                            <LogOut size={16} />
                            {isLoading ? "Signing out..." : "Sign Out"}
                        </Button>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
                        <Button
                            variant="ghost"
                            className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={resetAppData}
                        >
                            <Trash2 size={16} />
                            Reset App Data
                        </Button>
                        <p className="text-[10px] text-center mt-2 text-gray-400">
                            Clears local data (Resume, Settings)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
