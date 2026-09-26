"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, ChevronDown, Check, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COUNTRIES = [
    "Egypt", "Saudi Arabia", "United Arab Emirates", "Jordan", "Iraq",
    "Kuwait", "Bahrain", "Qatar", "Oman", "Yemen", "Syria", "Lebanon",
    "Libya", "Tunisia", "Algeria", "Morocco", "Sudan", "Mauritania",
    "Somalia", "Comoros", "Djibouti", "Palestine",
    "United States", "United Kingdom", "Canada", "Australia",
    "Spain", "France", "Germany", "Italy", "Netherlands", "Portugal", "Poland",
    "Sweden", "Denmark", "Finland", "Romania", "Bulgaria", "Czech Republic",
    "Greece", "Croatia", "Slovakia", "Ukraine",
    "China", "Japan", "South Korea", "India", "Turkey", "Indonesia",
    "Malaysia", "Philippines", "Taiwan",
    "Brazil", "Other"
];

const PROFESSIONS = [
    "Software Engineer", "Mechanical Engineer", "Civil Engineer", "Electrical Engineer",
    "Teacher", "Pharmacist", "Accountant", "Sales Representative", "HR Specialist",
    "Customer Service Agent", "Project Manager", "Marketing Specialist", "Doctor",
    "Nurse", "Lawyer", "Student", "Other"
];

function CustomSelect({ value, onChange, options, placeholder, label }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder: string;
    label: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Auto-focus search when opened
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 30);
    }, [open]);

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-[12px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 tracking-widest uppercase">
                {label}
            </label>
            <div
                onClick={() => { setOpen(o => !o); if (open) setSearch(""); }}
                className={`flex items-center justify-between w-full h-[50px] px-4 bg-gray-100 dark:bg-white/5 rounded-2xl cursor-pointer transition-all duration-200 border ${open ? 'border-emerald-500/60' : 'border-transparent'}`}
            >
                <span className={`text-[14px] font-medium truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 4, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 z-50 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] border border-black/5 dark:border-white/8 overflow-hidden"
                        style={{ top: "calc(100% + 4px)" }}
                    >
                        {/* Search input */}
                        <div className="p-2 border-b border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl">
                                <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <input
                                    ref={searchRef}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="bg-transparent text-[13px] text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none w-full"
                                />
                            </div>
                        </div>

                        {/* Options list */}
                        <div className="overflow-y-auto max-h-[220px] py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                            {filtered.length === 0 ? (
                                <div className="text-center py-5 text-[13px] text-gray-400">No results</div>
                            ) : (
                                filtered.map((opt) => (
                                    <div
                                        key={opt}
                                        onMouseDown={e => {
                                            e.preventDefault(); // prevent blur on search
                                            onChange(opt);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                        className={`flex items-center justify-between px-4 py-2.5 mx-1.5 rounded-xl cursor-pointer text-[14px] transition-colors ${value === opt ? 'bg-emerald-500/10 text-emerald-500 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        {opt}
                                        {value === opt && <Check className="w-4 h-4 flex-shrink-0" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function OnboardingPage() {
    const router = useRouter();
    const [profession, setProfession] = useState("");
    const [country, setCountry] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const check = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                // router.push("/login");
                // return;
            }
            if (data.session) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("profession, country")
                    .eq("id", data.session.user.id)
                    .single();

                if (profile?.profession && profile?.country) {
                    router.push("/dashboard");
                    return;
                }
            }
            setIsChecking(false);
        };
        check();
    }, [router]);

    const handleSave = async () => {
        if (!profession || !country) return;
        setIsSaving(true);
        setError("");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({ profession, country })
                .eq("id", session.user.id);

            // Log full error details for debugging
            if (updateError) {
                console.error("Update error details:", JSON.stringify(updateError, null, 2));
            }

            // Only block redirect if there's a real error with a message or code
            // Empty {} error objects are often false positives from Supabase
            const hasRealError = updateError && (updateError.message || updateError.code);
            if (hasRealError) {
                setError(`Failed to save: ${updateError.message || updateError.code}`);
                return;
            }

            // Success or empty error — redirect
            router.push("/dashboard");
        } catch (err) {
            console.error("Onboarding save failed:", err);
            setError("Unexpected error. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[400px] bg-[#0f0f11] border border-white/8 rounded-[28px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]"
            >
                <div className="h-[1px] w-full rounded-t-[28px]"
                    style={{ background: 'linear-gradient(to right, transparent, #10b981, #bef264, transparent)' }} />

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-5 mb-6 bg-white py-4 px-8 rounded-2xl border border-gray-200 shadow-sm mx-auto w-fit">
                            <span className="text-[24px] font-black tracking-tighter" style={{ background: 'linear-gradient(to right, #047857, #10b981, #bef264)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZEDX</span>
                            <span className="text-gray-300 font-light text-xl">✕</span>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/AUC_English_Logo_2021.png" alt="AUC Logo" className="h-[42px] object-contain" />
                        </div>
                        <h1 className="text-[26px] font-bold tracking-tight mb-2">
                            <span className="text-white">
                                Welcome AUC Students
                            </span>
                        </h1>
                        <p className="text-[13px] text-gray-500 leading-relaxed">
                            Tell us a bit about yourself to personalize your AUC career experience.
                        </p>
                    </div>

                    <div className="space-y-4 mb-7">
                        <CustomSelect
                            label="Your Profession"
                            placeholder="Select your profession"
                            value={profession}
                            onChange={setProfession}
                            options={PROFESSIONS}
                        />
                        <CustomSelect
                            label="Your Country"
                            placeholder="Select your country"
                            value={country}
                            onChange={setCountry}
                            options={COUNTRIES}
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-[12px] text-center mb-4">{error}</p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving || !profession || !country}
                        className="w-full h-[50px] rounded-2xl font-bold text-[15px] text-gray-900 transition-all duration-300 disabled:opacity-40 flex items-center justify-center shadow-lg shadow-emerald-500/20 outline-none border-none"
                        style={{ background: 'linear-gradient(to right, #059669, #10b981, #bef264)' }}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Continue to Dashboard →"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
