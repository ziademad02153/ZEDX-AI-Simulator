"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";

const COUNTRIES = [
    // 🇦🇪 Arab Countries (All 22 Arab League members)
    "Egypt", "Saudi Arabia", "United Arab Emirates", "Jordan", "Iraq",
    "Kuwait", "Bahrain", "Qatar", "Oman", "Yemen", "Syria", "Lebanon",
    "Libya", "Tunisia", "Algeria", "Morocco", "Sudan", "Mauritania",
    "Somalia", "Comoros", "Djibouti", "Palestine",
    // 🌍 English-speaking
    "United States", "United Kingdom", "Canada", "Australia",
    // 🌍 European
    "Spain", "France", "Germany", "Italy", "Netherlands", "Portugal", "Poland",
    "Sweden", "Denmark", "Finland", "Romania", "Bulgaria", "Czech Republic",
    "Greece", "Croatia", "Slovakia", "Ukraine",
    // 🌏 Asian
    "China", "Japan", "South Korea", "India", "Turkey", "Indonesia",
    "Malaysia", "Philippines", "Taiwan",
    // 🌎 Other
    "Brazil", "Other"
];

const PROFESSIONS = [
    "Software Engineer", "Mechanical Engineer", "Civil Engineer", "Electrical Engineer",
    "Teacher", "Pharmacist", "Accountant", "Sales Representative", "HR Specialist",
    "Customer Service Agent", "Project Manager", "Marketing Specialist", "Doctor",
    "Nurse", "Lawyer", "Student", "Other"
];

const CustomSelect = ({ value, onChange, options, placeholder, label }: any) => {
    const [open, setOpen] = useState(false);
    
    return (
        <div className="relative">
            <label className="block text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2 ml-1 tracking-wide">{label}</label>
            <div 
                onClick={() => setOpen(!open)}
                className={`flex items-center justify-between w-full h-[56px] px-5 bg-gray-100 dark:bg-[#1a1a1c] hover:dark:bg-[#202022] ${open ? 'ring-2 ring-emerald-500/50' : ''} !rounded-[20px] cursor-pointer transition-all duration-300 !border-none`}
            >
                <span className={`text-[15px] font-medium ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 dark:text-zinc-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </div>
            
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 5, scale: 0.98 }}
                            animate={{ opacity: 1, y: 10, scale: 1 }}
                            exit={{ opacity: 0, y: 5, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute z-50 w-full bg-white dark:bg-[#1c1c1e] !border-none !rounded-[24px] shadow-2xl max-h-[260px] overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
                        >
                            {options.map((opt: string) => (
                                <div 
                                    key={opt}
                                    onClick={() => { onChange(opt); setOpen(false); }}
                                    className={`flex items-center justify-between px-5 py-3.5 mx-2 !rounded-[16px] cursor-pointer text-[15px] transition-colors ${value === opt ? 'bg-emerald-500/10 text-emerald-500 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    {opt}
                                    {value === opt && <Check className="w-5 h-5" />}
                                </div>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export function OnboardingModal() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [profession, setProfession] = useState<string>("");
    const [country, setCountry] = useState<string>("");

    useEffect(() => {
        const checkProfile = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('profession, country')
                    .eq('id', user.id)
                    .single();
                
                if (error) throw error;

                if (!data?.profession || !data?.country) {
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Failed to check profile for onboarding", err);
            } finally {
                setIsLoading(false);
            }
        };

        checkProfile();
    }, [user]);

    const handleSave = async () => {
        if (!profession || !country || !user?.id) return;
        setIsSaving(true);
        try {
            // Use update since the profile row is guaranteed to exist (created on signup)
            await supabase
                .from('profiles')
                .update({ profession, country })
                .eq('id', user.id);

            // Always close modal — don't block user even if DB write fails
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to save onboarding data:", error);
            setIsOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent 
                className="sm:max-w-[460px] !p-0 overflow-visible bg-white dark:bg-[#0c0c0e] !border-none shadow-[0_30px_100px_-15px_rgba(0,0,0,0.7)] !rounded-[36px]" 
                hideCloseButton
            >
                <div className="p-8 sm:p-10 relative z-10">
                    <DialogHeader className="mb-10 flex flex-col items-center !text-center">
                        <DialogTitle className="text-[32px] font-bold tracking-tight mb-3 w-full !text-center">
                            <span className="text-gradient-fusion">Welcome to ZEDX</span>
                        </DialogTitle>
                        <DialogDescription className="text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-[320px] mx-auto !text-center">
                            To craft the perfect interview experience, we need to know a little bit about you.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mb-12">
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
                    
                    <DialogFooter>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving || !profession || !country} 
                            className="w-full h-[56px] bg-fusion-gradient relative overflow-hidden text-white dark:text-black font-bold !rounded-[20px] text-[17px] transition-all duration-300 disabled:opacity-40 flex items-center justify-center !border-none shadow-xl shadow-emerald-500/20 outline-none"
                            style={{ background: 'linear-gradient(to right, #047857, #10b981, #bef264)' }}
                        >
                            <span className="relative z-10 flex items-center text-white dark:text-gray-900 drop-shadow-sm">
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                                Continue to Interview
                            </span>
                        </button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
