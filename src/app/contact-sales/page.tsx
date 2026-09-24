"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
    { id: "Graduation Benchmark (Universities)", desc: "Integrate ZEDX into your university's curriculum. Establish a minimum AI interview score as a mandatory graduation prerequisite, ensuring that every student is battle-tested and possesses the communication and technical skills required to succeed in the competitive job market." },
    { id: "CV-Based Prep Workflows", desc: "Allow users to upload their resumes and job descriptions. ZEDX's AI will instantly parse the documents and construct a hyper-personalized, dynamic interview environment that challenges candidates precisely on their specific projects, skills, and past experiences." },
    { id: "White-Label Branding", desc: "Offer a fully branded experience. We will strip all ZEDX branding and seamlessly integrate your organization's logo, custom color palettes, and domain, making the AI interviewer look and feel entirely like your own proprietary software." },
    { id: "AI Candidate Screening (HR)", desc: "Eliminate manual first-round interviews. Deploy ZEDX to autonomously conduct voice-to-voice technical and behavioral interviews with thousands of applicants. Receive automated PDF reports ranking candidates based on their performance, saving your HR team hundreds of hours." },
    { id: "Custom AI Models Integration", desc: "Tailor the AI's core brain to your organization. We can ingest your proprietary company guidelines, internal documentation, or specific evaluation rubrics so the AI interviews candidates exactly the way your senior technical leads would." },
    { id: "Volume Employee Access", desc: "Secure discounted, bulk licensing for your entire organization. Grant your employees unrestricted access to ZEDX to continuously sharpen their communication, sales pitching, or technical skills in a safe, private environment without usage limits." },
    { id: "Other (Please specify below)", desc: "Don't see exactly what you're looking for? ZEDX is highly adaptable. Whether you need API access, custom integrations with your existing ATS (Applicant Tracking System), or a completely unique use case, let us know in the message box below." }
];

export default function ContactSalesPage() {
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [otherText, setOtherText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const toggleFeature = (id: string) => {
        setSelectedFeatures(prev => 
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
        if (id.startsWith("Other") && selectedFeatures.includes(id)) {
            setOtherText(""); // Clear text if unchecked
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        
        // Prepare features array, replacing 'Other' with the actual text they typed
        const finalFeatures = selectedFeatures.map(f => 
            f.startsWith("Other") ? `Other: ${otherText || 'Not specified'}` : f
        );

        const data = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            email: formData.get("email"),
            organization: formData.get("organization"),
            volume: formData.get("volume"),
            message: formData.get("message"),
            features: finalFeatures,
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                setIsSuccess(true);
            } else {
                alert("Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050505] font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden selection:bg-slate-300 dark:selection:bg-slate-700">
                <Navbar />
                <main className="flex-grow flex items-center justify-center relative z-10 pt-20">
                    <div className="text-center max-w-lg mx-auto px-4">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Request Sent Successfully!</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                            Thank you for your interest in ZEDX Enterprise. A member of our team will review your inquiry and get back to you shortly.
                        </p>
                        <Button onClick={() => window.location.href = "/"} className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-full px-8 py-6 font-bold text-[15px] shadow-md transition-all">
                            Return Home
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#050505] font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden selection:bg-slate-300 dark:selection:bg-slate-700">
            <Navbar />

            <main className="flex-grow pt-32 pb-24 relative z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-slate-400/10 dark:bg-slate-300/5 blur-[120px] pointer-events-none -z-10" />

                <div className="max-w-2xl mx-auto px-4 w-full">
                    <div className="text-center mb-10 md:mb-14">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 block">Sales</span>
                        <h1 className="text-4xl md:text-[54px] font-extrabold text-slate-900 dark:text-white tracking-tight mb-5 leading-tight">
                            Contact Sales
                        </h1>
                        <p className="text-[17px] text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                            Interested in what ZEDX can do for your organization? Fill out the form and a member of our sales team will be in touch shortly.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2.5">
                                <label className="text-[13px] font-semibold text-slate-900 dark:text-white">First Name *</label>
                                <input required type="text" name="firstName" className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600" />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Last Name *</label>
                                <input required type="text" name="lastName" className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600" />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Work Email *</label>
                            <input 
                                required 
                                type="email" 
                                name="email" 
                                pattern="^[a-zA-Z0-9._%+\-]+@(?!gmail\.com)(?!yahoo\.com)(?!hotmail\.com)(?!outlook\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                                title="Please enter a valid work email address (no public domains like gmail.com)"
                                placeholder="name@company.com"
                                className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600" 
                            />
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Company / University Name *</label>
                            <input required type="text" name="organization" className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600" />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Which ZEDX product area are you interested in? *</label>
                            <div className="space-y-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl p-4 md:p-5">
                                {FEATURES.map((feature) => {
                                    const isSelected = selectedFeatures.includes(feature.id);
                                    const isOther = feature.id.startsWith("Other");
                                    return (
                                        <div key={feature.id} className="flex flex-col group">
                                            <label className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => toggleFeature(feature.id)}
                                                    className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-slate-500 dark:focus:ring-white/20 cursor-pointer" 
                                                />
                                                <div className="flex flex-col gap-1 w-full">
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                        {feature.id}
                                                    </span>
                                                    <AnimatePresence>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                {isOther ? (
                                                                    <input 
                                                                        type="text" 
                                                                        value={otherText}
                                                                        onChange={(e) => setOtherText(e.target.value)}
                                                                        placeholder="Please specify your request..."
                                                                        className="w-full mt-1 bg-white dark:bg-[#111] border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600"
                                                                        onClick={(e) => e.preventDefault()} // Prevent clicking input from toggling checkbox
                                                                    />
                                                                ) : (
                                                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed pr-2">
                                                                        {feature.desc}
                                                                    </p>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Expected Usage Volume (Number of Users) *</label>
                            <input required type="text" name="volume" placeholder="e.g. 50+ students, 200+ employees" className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600" />
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-semibold text-slate-900 dark:text-white">Specific Product Requests or Needs *</label>
                            <textarea required name="message" rows={4} placeholder="Tell us about your organization's specific needs or any integrations you're looking for..." className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-300 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-white/20 transition-all placeholder-slate-400 dark:placeholder-zinc-600 resize-none"></textarea>
                        </div>

                        <div className="pt-2">
                            <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-full px-8 py-6 font-bold text-[15px] shadow-md transition-all disabled:opacity-50">
                                {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
}
