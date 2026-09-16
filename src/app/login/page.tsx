"use client";

import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Sparkles, RefreshCw, Zap, Shield, Trophy, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { generateStrongPassword } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
    // const router = useRouter();
    const { signIn, signUp, verifyOtp, signInWithGoogle, resetPassword, signInWithMagicLink } = useAuth();

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [mode, setMode] = useState<"signin" | "signup" | "verify" | "forgot" | "magiclink">("signin");
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        otp: ""
    });

    // Password strength calculation
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

    // Auto-clear success/error on mode switch
    useEffect(() => {
        setError(null);
        setSuccess(null);
    }, [mode]);

    // Check if user is already authenticated (for OAuth redirect)
    useEffect(() => {
        const checkAuth = async () => {
            try {
                setIsCheckingSession(true);
                const { supabase } = await import("@/lib/supabase");
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    // User is already logged in, set cookie and redirect
                    const sessionId = data.session.access_token.slice(0, 32);
                    const isSecure = window.location.protocol === 'https:';
                    document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
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

    // Check for session expiration
    useEffect(() => {
        if (typeof window !== "undefined") {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("reason") === "expired") {
                // Clear it from the URL so it doesn't trigger again on refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                // Show premium toast
                toast.error("انتهت الجلسة لأسباب أمنية. يرجى تسجيل الدخول مرة أخرى.", {
                    description: "Security Protocol: Session Expired",
                    duration: 5000,
                    className: "border border-red-500/20 bg-black/90 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] backdrop-blur-md",
                    position: "top-center"
                });
            }
        }
    }, []);


    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Email validation
        if (mode !== "verify" && !validateEmail(formData.email)) {
            setError("Please enter a valid email address");
            setIsLoading(false);
            return;
        }

        if (mode === "signup" && !agreed) {
            setError("You must agree to the Terms of Service and Privacy Policy to create an account.");
            setIsLoading(false);
            return;
        }

        try {
            if (mode === "signup") {
                try {
                    await signUp(formData.email, formData.password, formData.name);
                    setSuccess("Verification code sent! Check your email.");
                    setMode("verify");
                } catch (err: unknown) {
                    const error = err as Error;
                    setError(error.message || "Signup failed");
                }
            } else if (mode === "verify") {
                // Should not reach here typically due to separate handler
            } else if (mode === "forgot") {
                // First check if the email exists
                const checkRes = await fetch('/api/auth/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                try {
                    const result = await signIn(formData.email, formData.password) as { session?: { access_token: string } };
                    // Generate unique session token using Supabase session ID + timestamp
                    const sessionId = result?.session?.access_token?.slice(0, 32) || crypto.randomUUID();
                    const isSecure = window.location.protocol === 'https:';
                    document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
                    window.location.href = "/dashboard";
                } catch (err: unknown) {
                    const error = err as Error;
                    setError(error.message || "Invalid credentials");
                }
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error("Auth error:", error);
            setError("An unexpected error occurred.");
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
            const result = await verifyOtp(formData.email, formData.otp, 'signup') as { session?: { access_token: string } };
            // Generate unique session token from Supabase response
            const sessionId = result?.session?.access_token?.slice(0, 32) || crypto.randomUUID();
            const isSecure = window.location.protocol === 'https:';
            document.cookie = `auth_token=${sessionId}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
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

    if (isCheckingSession) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6"
                >
                    <div className="relative w-20 h-20">
                        <Image src="/zedx-logo.png" alt="ZEDX-AI" fill className="object-contain animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-medium">
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Verifying Session...</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full grid md:grid-cols-2">

            {/* Left Side - Brand/Marketing Area (Green/Teal Theme) */}
            <div className="hidden md:flex flex-col justify-between bg-zinc-950 relative overflow-hidden p-8 lg:p-12 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 to-teal-950 z-0" />
                {/* Decorative circles */}
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl opacity-50" />

                <div className="relative z-10">
                    {/* Updated Logo Section */}
                    <div className="flex items-center">
                        <Image
                            src="/zedx-logo.png"
                            alt="ZEDX-AI Logo"
                            width={87}
                            height={87}
                            className="object-contain w-16 h-16 md:w-[87px] md:h-[87px]"
                        />
                    </div>
                </div>

                <div className="relative z-10 max-w-xl">
                    <h2 className="text-5xl font-extrabold mb-8 leading-[1.1] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-200">
                        Master Your Next Interview with <br /> Absolute Confidence.
                    </h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 shrink-0 flex items-center justify-center">
                                <Image src="/Instant Transcription.png" alt="Instant Transcription" width={40} height={40} className="object-contain drop-shadow-sm" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Real-Time Intelligence</h3>
                                <p className="text-gray-400 leading-relaxed">Get instant, AI-driven feedback on your tone, pace, and content while you speak.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-16 shrink-0 flex items-center justify-center">
                                <Image src="/zedx-logo-for-v.png" alt="ZEDX Edge" width={64} height={64} className="object-contain drop-shadow-sm" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Competitive Edge</h3>
                                <p className="text-gray-400 leading-relaxed">Access a curated database of top-tier example answers to train and prepare effectively.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-16 shrink-0 flex items-center justify-center">
                                <Image src="/Privacy First.png" alt="Privacy First" width={40} height={40} className="object-contain drop-shadow-sm" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Private & Secure</h3>
                                <p className="text-gray-400 leading-relaxed">Your data is encrypted and your assessment data is completely secure.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-6 text-sm text-gray-500 font-medium">
                    <span>© 2026 ZEDX AI Inc.</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span>Privacy Policy</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span>Terms of Service</span>
                </div>
            </div>

            {/* Right Side — Apple-style Auth Panel */}
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#111111] px-6">
                <div className="w-full max-w-[360px]">

                    {/* Mobile Brand */}
                    <div className="md:hidden text-center mb-8">
                        <div className="relative w-12 h-12 mx-auto mb-3 overflow-hidden rounded-2xl shadow-sm">
                            <Image src="/zedx-logo.png" alt="ZEDX-AI Logo" fill className="object-cover" />
                        </div>
                        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">ZEDX AI</h2>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1
                            className="text-[28px] font-semibold tracking-[-0.5px] text-gray-900 dark:text-white"
                            style={{ fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Inter', sans-serif" }}
                        >
                            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : mode === "magiclink" ? "Sign in with code" : "Check your email"}
                        </h1>
                        <p
                            className="mt-1.5 text-[14px] text-gray-500 dark:text-[#888]"
                            style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                        >
                            {mode === "signin" ? "Enter your email to sign in to your account"
                                : mode === "signup" ? "Create your account in seconds. No credit card required."
                                : mode === "forgot" ? "Enter your email to receive a reset link."
                                : mode === "magiclink" ? "Enter your email to receive a sign-in link."
                                : `We sent a code to ${formData.email}`}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 px-4 py-3 text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl"
                                style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                            >
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl"
                                style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                            >
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={mode === 'verify' ? handleVerifySubmit : handleAuth} className="space-y-4">

                        {mode === 'signup' && (
                            <div className="space-y-1.5">
                                <label
                                    className="block text-[13px] font-medium text-gray-700 dark:text-[#ccc]"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                >
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Mohamed Salah"
                                    className="w-full h-[44px] px-3.5 text-[15px] rounded-xl border border-[#d1d1d6] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366] outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {mode !== 'verify' && (
                            <div className="space-y-1.5">
                                <label
                                    className="block text-[13px] font-medium text-gray-700 dark:text-[#ccc]"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                >
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    className="w-full h-[44px] px-3.5 text-[15px] rounded-xl border border-[#d1d1d6] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366] outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {mode !== 'verify' && mode !== 'forgot' && mode !== 'magiclink' && (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label
                                        className="block text-[13px] font-medium text-gray-700 dark:text-[#ccc]"
                                        style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                    >
                                        Password
                                    </label>
                                    {mode === 'signup' && (
                                        <button
                                            type="button"
                                            onClick={generatePassword}
                                            className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 hover:opacity-70 transition-opacity"
                                            style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                        >
                                            <Sparkles size={11} /> Generate
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full h-[44px] px-3.5 pr-10 text-[15px] rounded-xl border border-[#d1d1d6] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366] outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aeaeb2] hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>

                                {mode === 'signup' && formData.password && (
                                    <div className="space-y-1 pt-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-[3px] flex-1 rounded-full transition-all ${i <= passwordStrength.level ? passwordStrength.color : 'bg-[#e5e5ea] dark:bg-[#3a3a3c]'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-[11px] ${passwordStrength.color.replace('bg-', 'text-')}`}
                                            style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                        >
                                            {passwordStrength.text}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'verify' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label
                                        className="block text-[13px] font-medium text-gray-700 dark:text-[#ccc]"
                                        style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                    >
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        maxLength={8}
                                        inputMode="numeric"
                                        pattern="[0-9]{6,8}"
                                        className="w-full h-[52px] px-3.5 text-[22px] rounded-xl border border-[#d1d1d6] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] text-gray-900 dark:text-white placeholder:text-[#aeaeb2] dark:placeholder:text-[#636366] outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center tracking-[0.4em] font-mono"
                                        value={formData.otp}
                                        onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                                        required
                                    />
                                </div>
                                <p
                                    className="text-[12px] text-center text-[#8e8e93] dark:text-[#636366] px-2"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                >
                                    Sent to <span className="font-medium text-gray-900 dark:text-white">{formData.email}</span>. Check your spam folder if needed.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={isLoading}
                                    className="w-full text-[13px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5 py-2 hover:opacity-70 transition-opacity disabled:opacity-40"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                >
                                    <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                                    Resend code
                                </button>
                            </div>
                        )}

                        {/* Primary CTA */}
                        {mode === 'signup' && (
                            <label className="flex items-start gap-2.5 cursor-pointer mt-4 mb-2 group" onClick={() => setAgreed(!agreed)}>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${agreed ? "bg-emerald-500 border-emerald-500" : "border-[#d1d1d6] dark:border-[#3a3a3c] group-hover:border-emerald-400"}`}>
                                    {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-[13px] text-gray-600 dark:text-gray-400 font-medium select-none leading-tight">
                                    I agree to the <Link href="/terms" target="_blank" className="text-emerald-600 dark:text-emerald-400 hover:underline" onClick={(e) => e.stopPropagation()}>Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-emerald-600 dark:text-emerald-400 hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.
                                </span>
                            </label>
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[44px] mt-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
                            style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                        >
                            {isLoading ? (
                                <RefreshCw className="animate-spin h-4 w-4" />
                            ) : (
                                mode === 'signin' ? "Sign In" : mode === 'signup' ? "Create Account" : mode === 'forgot' ? "Send Reset Link" : mode === 'magiclink' ? "Send Sign-in Link" : "Verify Email"
                            )}
                        </button>

                        {/* Divider & Google */}
                        {mode !== 'verify' && (
                            <>
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-[#e5e5ea] dark:border-[#3a3a3c]" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span
                                            className="bg-white dark:bg-[#111111] px-3 text-[12px] text-[#8e8e93] dark:text-[#636366] uppercase tracking-wider font-medium"
                                            style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                        >
                                            or
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        try { await signInWithGoogle(); }
                                        catch (err: unknown) { setError((err as Error).message || "Google sign-in failed"); }
                                    }}
                                    disabled={isLoading}
                                    className="w-full h-[44px] rounded-xl border border-[#d1d1d6] dark:border-[#3a3a3c] bg-white dark:bg-[#1c1c1e] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] text-gray-800 dark:text-white text-[15px] font-medium flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 shadow-sm"
                                    style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                                >
                                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>
                            </>
                        )}
                    </form>

                    {/* Footer links */}
                    <div
                        className="mt-7 text-center text-[13px] text-[#8e8e93] dark:text-[#636366]"
                        style={{ fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, 'Inter', sans-serif" }}
                    >
                        {mode === 'signin' ? (
                            <div className="space-y-2.5">
                                <div>
                                    Don&apos;t have an account?{" "}
                                    <button onClick={() => setMode('signup')} type="button" className="text-emerald-600 dark:text-emerald-400 font-medium hover:opacity-70 transition-opacity">
                                        Sign up
                                    </button>
                                </div>
                                <div className="flex items-center justify-center gap-4">
                                    <button type="button" onClick={() => setMode('forgot')} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Forgot password?
                                    </button>
                                    <span className="w-1 h-1 rounded-full bg-[#d1d1d6] dark:bg-[#3a3a3c]" />
                                    <button type="button" onClick={() => setMode('magiclink')} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Sign in with Code
                                    </button>
                                </div>
                            </div>
                        ) : mode === 'signup' ? (
                            <div>
                                Already have an account?{" "}
                                <button onClick={() => setMode('signin')} type="button" className="text-emerald-600 dark:text-emerald-400 font-medium hover:opacity-70 transition-opacity">
                                    Sign in
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setMode('signin')} type="button" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                                Back to sign in
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
