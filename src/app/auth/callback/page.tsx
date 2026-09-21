"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const [status, setStatus] = useState("Processing login...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processAuth = async () => {
            try {
                // Check URL for error params first
                const urlParams = new URLSearchParams(window.location.search);
                const urlError = urlParams.get('error');
                const urlErrorDescription = urlParams.get('error_description');

                if (urlError) {
                    setError(urlErrorDescription || urlError);
                    setTimeout(() => {
                        window.location.href = "/login?error=" + encodeURIComponent(urlError);
                    }, 3000);
                    return;
                }

                // Check for hash fragment (implicit flow tokens)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');

                if (accessToken) {
                    // We have tokens in the hash, set session
                    const { data, error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: hashParams.get('refresh_token') || '',
                    });

                    if (sessionError) {
                        setError(sessionError.message);
                        setTimeout(() => {
                            window.location.href = "/login?error=session_failed";
                        }, 3000);
                        return;
                    }

                    if (data.session) {
                        const sessionId = data.session.access_token.slice(0, 32);
                        document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax`;
                        setStatus("Login successful!");
                        window.location.href = "/dashboard";
                        return;
                    }
                }

                // Check for code (PKCE flow)
                const code = urlParams.get('code');
                if (code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        setError(exchangeError.message);
                        setTimeout(() => {
                            window.location.href = "/login?error=exchange_failed";
                        }, 3000);
                        return;
                    }

                    if (data.session) {
                        const sessionId = data.session.access_token.slice(0, 32);
                        document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax`;
                        setStatus("Login successful!");
                        window.location.href = "/dashboard";
                        return;
                    }
                }

                // Fallback: check if session already exists
                const { data: sessionData } = await supabase.auth.getSession();

                if (sessionData.session) {
                    const sessionId = sessionData.session.access_token.slice(0, 32);
                    document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax`;
                    setStatus("Session found! Redirecting...");
                    window.location.href = "/dashboard";
                } else {
                    setError("No session or auth code found");
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 3000);
                }
            } catch (e: unknown) {
                const err = e as Error;
                console.error("Auth callback error:", err);
                setError(err.message || "An unexpected error occurred");
                setTimeout(() => {
                    window.location.href = "/login?error=unknown";
                }, 3000);
            }
        };

        processAuth();
    }, []);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4 py-8 relative overflow-hidden">
            
            {/* Apple-style background blur elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#a3e635]/10 dark:bg-[#a3e635]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-[420px] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/5 p-8 text-center z-10 relative">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-red-500 text-2xl font-bold">✕</span>
                        </div>
                        <p className="text-red-600 dark:text-red-400 text-[20px] font-semibold mb-2 tracking-tight">Login Failed</p>
                        <p className="text-gray-500 dark:text-gray-400 text-[15px]">{error}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-[13px] mt-6 font-medium">Redirecting to login page...</p>
                    </>
                ) : (
                    <>
                        <div className="w-14 h-14 border-[3px] border-gray-200 dark:border-zinc-700 border-t-[#a3e635] dark:border-t-[#a3e635] rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-gray-900 dark:text-white text-[20px] font-semibold tracking-tight">{status}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-[15px] mt-3 leading-relaxed">Please wait while we securely log you in...</p>
                    </>
                )}
            </div>
        </div>
    );
}
