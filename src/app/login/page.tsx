"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Sparkles, RefreshCw, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { generateStrongPassword } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const { signIn, signUp, verifyOtp, signInWithGoogle, resetPassword, signInWithMagicLink } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [mode, setMode] = useState<"signin" | "signup" | "verify" | "forgot" | "magiclink">("signin");
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({ name: "", email: "", password: "", otp: "" });

    const getPasswordStrength = (password: string): { level: number; text: string; color: string } => {
        if (!password) return { level: 0, text: "", color: "" };
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        if (score <= 1) return { level: 1, text: "Weak", color: "bg-red-500" };
        if (score <= 2) return { level: 2, text: "Fair", color: "bg-orange-500" };
        if (score <= 3) return { level: 3, text: "Good", color: "bg-yellow-500" };
        if (score <= 4) return { level: 4, text: "Strong", color: "bg-green-500" };
        return { level: 5, text: "Very Strong", color: "bg-emerald-600" };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    useEffect(() => { setError(null); setSuccess(null); }, [mode]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                setIsCheckingSession(true);
                const { supabase } = await import("@/lib/supabase");
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    const sessionId = data.session.access_token.slice(0, 32);
                    const isSecure = window.location.protocol === "https:";
                    document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                    window.location.href = "/dashboard";
                } else {
                    setIsCheckingSession(false);
                }
            } catch (e) {
                console.error("Auth check error:", e);
                setIsCheckingSession(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("reason") === "expired") {
                window.history.replaceState({}, document.title, window.location.pathname);
                toast.error("انتهت الجلسة لأسباب أمنية. يرجى تسجيل الدخول مرة أخرى.", {
                    description: "Security Protocol: Session Expired",
                    duration: 5000,
                    className: "border border-red-500/20 bg-black/90 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] backdrop-blur-md",
                    position: "top-center"
                });
            }
        }
    }, []);

    const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        if (mode !== "verify" && !validateEmail(formData.email)) {
            setError("Please enter a valid email address");
            setIsLoading(false);
            return;
        }
        if (mode === "signup" && !agreed) {
            setError("You must agree to the Terms of Service and Privacy Policy.");
            setIsLoading(false);
            return;
        }

        try {
            if (mode === "signup") {
                await signUp(formData.email, formData.password, formData.name);
                setSuccess("Verification code sent! Check your email.");
                setMode("verify");
            } else if (mode === "forgot") {
                const checkRes = await fetch("/api/auth/check-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: formData.email })
                });
                const checkData = await checkRes.json();
                if (checkRes.ok && !checkData.exists) {
                    setError("This account does not exist. Please sign up first.");
                    setTimeout(() => setMode("signup"), 3000);
                    setIsLoading(false);
                    return;
                }
                await resetPassword(formData.email);
                setSuccess("Password reset link sent! Check your email.");
            } else if (mode === "magiclink") {
                await signInWithMagicLink(formData.email);
                setSuccess("Sign-in link sent! Check your email.");
            } else {
                const result = await signIn(formData.email, formData.password) as { session?: { access_token: string } };
                const sessionId = result?.session?.access_token?.slice(0, 32) || crypto.randomUUID();
                const isSecure = window.location.protocol === "https:";
                document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
                window.location.href = "/dashboard";
            }
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signUp(formData.email, formData.password, formData.name);
            setSuccess("Verification code resent! Check your email.");
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Failed to resend code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const result = await verifyOtp(formData.email, formData.otp, "signup") as { session?: { access_token: string } };
            const sessionId = result?.session?.access_token?.slice(0, 32) || crypto.randomUUID();
            const isSecure = window.location.protocol === "https:";
            document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? "; Secure" : ""}`;
            window.location.href = "/dashboard";
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Invalid code");
        } finally {
            setIsLoading(false);
        }
    };

    const generatePassword = () => {
        const newPass = generateStrongPassword(16);
        setFormData(prev => ({ ...prev, password: newPass }));
        setShowPassword(true);
    };

    // Loading screen
    if (isCheckingSession) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16 dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                        <Image src="/zedx-logo.png" alt="ZEDX AI" fill className="object-contain animate-pulse dark:brightness-[10]" />
                    </div>
                    <div className="flex items-center gap-2 text-[#16a34a] text-sm font-medium">
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Verifying session...</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4 py-8 relative overflow-hidden">
            
            {/* Apple-style background blur elements (optional soft ambient light) */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#a3e635]/10 dark:bg-[#a3e635]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8 z-10"
            >
                <Link href="/">
                    <Image 
                        src="/zedx-logo.png" 
                        alt="ZEDX AI" 
                        width={200} 
                        height={60} 
                        className="object-contain transition-all" 
                    />
                </Link>
            </motion.div>

            {/* Card - Glassmorphism Apple Style */}
            <motion.div
                key={mode}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="w-full max-w-[420px] bg-white/70 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/5 px-8 py-10 z-10 relative"
            >
                {/* Back arrow for sub-modes */}
                {(mode === "forgot" || mode === "magiclink" || mode === "verify") && (
                    <button
                        onClick={() => setMode("signin")}
                        className="absolute top-8 left-8 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft size={16} />
                    </button>
                )}

                {/* Header */}
                <div className="mb-8 mt-2">
                    {mode === "verify" && (
                        <div className="flex justify-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-[#a3e635]/10 dark:bg-[#a3e635]/20 flex items-center justify-center">
                                <Mail size={24} className="text-[#a3e635]" />
                            </div>
                        </div>
                    )}
                    <h1 className="text-[24px] font-semibold text-gray-900 dark:text-white text-center tracking-tight">
                        {mode === "signin" ? "Sign in to ZEDX AI"
                            : mode === "signup" ? "Create your account"
                            : mode === "forgot" ? "Reset your password"
                            : mode === "magiclink" ? "Sign in with code"
                            : "Check your email"}
                    </h1>
                    {mode === "verify" && (
                        <p className="text-center text-[15px] text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                            We sent a login link to <span className="font-semibold text-gray-900 dark:text-gray-200">{formData.email}</span>.<br />
                            Open it on this device, or type the code below.
                        </p>
                    )}
                </div>

                {/* Error / Success */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-5">
                            <div className="px-4 py-3 text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-2xl">
                                {error}
                            </div>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-5">
                            <div className="px-4 py-3 text-[13px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 rounded-2xl">
                                {success}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Google Sign-In */}
                {mode !== "verify" && (
                    <>
                        <button
                            type="button"
                            onClick={async () => {
                                try { await signInWithGoogle(); }
                                catch (err: unknown) { setError((err as Error).message || "Google sign-in failed"); }
                            }}
                            disabled={isLoading}
                            className="w-full h-[52px] rounded-2xl bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-[15px] font-medium flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 mb-5 shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-[#fcfcfc] dark:bg-[#18181b] px-4 text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium rounded-full">or</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Form */}
                <form onSubmit={mode === "verify" ? handleVerifySubmit : handleAuth} className="space-y-4">

                    {/* Name (signup only) */}
                    {mode === "signup" && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full h-[52px] px-4 text-[15px] rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[#a3e635] dark:focus:border-[#a3e635] focus:ring-4 focus:ring-[#a3e635]/10 dark:focus:ring-[#a3e635]/20 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    )}

                    {/* Email */}
                    {mode !== "verify" && (
                        <input
                            type="email"
                            placeholder="Email address"
                            className="w-full h-[52px] px-4 text-[15px] rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[#a3e635] dark:focus:border-[#a3e635] focus:ring-4 focus:ring-[#a3e635]/10 dark:focus:ring-[#a3e635]/20 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    )}

                    {/* Password */}
                    {(mode === "signin" || mode === "signup") && (
                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Password"
                                    className="w-full h-[52px] px-4 pr-12 text-[15px] rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-[#a3e635] dark:focus:border-[#a3e635] focus:ring-4 focus:ring-[#a3e635]/10 dark:focus:ring-[#a3e635]/20 transition-all font-mono"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {mode === "signup" && (
                                        <button type="button" onClick={generatePassword} className="text-[#a3e635] hover:opacity-70 transition-opacity p-1">
                                            <Sparkles size={16} />
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {mode === "signup" && formData.password && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className={`h-[4px] flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.level ? passwordStrength.color : "bg-gray-200 dark:bg-zinc-800"}`} />
                                        ))}
                                    </div>
                                    <p className={`text-[12px] font-medium ${passwordStrength.color.replace("bg-", "text-")}`}>{passwordStrength.text}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OTP Input */}
                    {mode === "verify" && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="000000"
                                maxLength={8}
                                inputMode="numeric"
                                pattern="[0-9]{6,8}"
                                className="w-full h-[64px] px-4 text-[28px] rounded-2xl border border-gray-200 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:border-[#a3e635] dark:focus:border-[#a3e635] focus:ring-4 focus:ring-[#a3e635]/10 dark:focus:ring-[#a3e635]/20 transition-all text-center tracking-[0.5em] font-mono"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                                required
                            />
                            <button type="button" onClick={handleResendCode} disabled={isLoading}
                                className="w-full text-[14px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-center py-2 font-medium">
                                {isLoading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : "Didn't receive code? Resend"}
                            </button>
                        </div>
                    )}

                    {/* Terms (signup) */}
                    {mode === "signup" && (
                        <label className="flex items-start gap-3 cursor-pointer py-2 group" onClick={() => setAgreed(!agreed)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${agreed ? "bg-[#a3e635] border-[#a3e635]" : "border-gray-300 dark:border-zinc-600 group-hover:border-[#a3e635] dark:group-hover:border-[#a3e635]"}`}>
                                {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                            </div>
                            <span className="text-[13px] text-gray-500 dark:text-gray-400 select-none leading-relaxed">
                                I agree to the{" "}
                                <Link href="/terms" target="_blank" className="text-[#a3e635] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>Terms of Service</Link>
                                {" "}and{" "}
                                <Link href="/privacy" target="_blank" className="text-[#a3e635] hover:underline font-medium" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.
                            </span>
                        </label>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-[52px] mt-2 bg-[#a3e635] hover:bg-[#84cc16] active:bg-[#65a30d] disabled:opacity-50 disabled:cursor-not-allowed text-black text-[15px] font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm shadow-[#a3e635]/20 hover:shadow-md hover:shadow-[#a3e635]/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {isLoading ? (
                            <RefreshCw className="animate-spin h-5 w-5" />
                        ) : (
                            mode === "signin" ? "Continue with Email"
                            : mode === "signup" ? "Create Account"
                            : mode === "forgot" ? "Send Reset Link"
                            : mode === "magiclink" ? "Send Sign-in Link"
                            : "Verify Email"
                        )}
                    </button>
                </form>

                {/* Footer links inside card */}
                <div className="mt-8 text-center text-[14px] text-gray-500 dark:text-gray-400">
                    {mode === "signin" ? (
                        <div className="space-y-4">
                            <div>
                                Don&apos;t have an account?{" "}
                                <button onClick={() => setMode("signup")} type="button" className="text-[#a3e635] font-medium hover:underline transition-all">
                                    Sign up
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-4 text-gray-400 dark:text-gray-500">
                                <button type="button" onClick={() => setMode("forgot")} className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                                    Forgot password?
                                </button>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                                <button type="button" onClick={() => setMode("magiclink")} className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                                    Sign in with code
                                </button>
                            </div>
                        </div>
                    ) : mode === "signup" ? (
                        <div>
                            Already have an account?{" "}
                            <button onClick={() => setMode("signin")} type="button" className="text-[#a3e635] font-medium hover:underline transition-all">
                                Sign in
                            </button>
                        </div>
                    ) : mode !== "verify" ? (
                        <button onClick={() => setMode("signin")} type="button" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium">
                            Back to sign in
                        </button>
                    ) : null}
                </div>
            </motion.div>

            {/* Bottom legal text */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-10 text-[13px] text-gray-400 dark:text-gray-500 text-center max-w-xs leading-relaxed z-10"
            >
                By continuing, you agree to ZEDX AI&apos;s{" "}
                <Link href="/terms" className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms & Conditions</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy Policy</Link>.
            </motion.p>
        </div>
    );
}
