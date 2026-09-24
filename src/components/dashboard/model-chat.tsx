"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ModelChatProps {
    modelId: string;
    modelName: string;
    modelLogo: string;
}

import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export function ModelChat({ modelId, modelName, modelLogo }: ModelChatProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: `Hello! I'm ${modelName}. Ask me anything to test my capabilities before your interview.` }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        setMessages([
            { role: "assistant", content: `Hello! I'm ${modelName}. Ask me anything to test my capabilities before your interview.` }
        ]);
    }, [modelId, modelName]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: "user" as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    model: modelId,
                    promptType: 'chatbot',
                    prompt: input
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error?.code === "PAYWALL_LIMIT_REACHED" || data.error?.message === "PAYWALL_LIMIT_REACHED") {
                    setShowPaywall(true);
                    return;
                }
                throw new Error(data.error?.message || "Failed to generate response");
            }

            const aiMessage = { role: "assistant" as const, content: data.content };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered a connection error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Include the Paywall Dialog at the bottom of the component
    const paywallDialog = (
        <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
            <DialogContent className="sm:max-w-md bg-white/95 dark:bg-black/95 backdrop-blur-xl border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl">
                <DialogHeader className="text-center sm:text-center space-y-4 pt-4">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Free Limit Reached
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                        You've reached your free 3-question limit. To continue testing AI models and ace your interviews, upgrade to ZEDX Pro.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-6">
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Unlimited AI model testing
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Advanced technical deep-dives
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <Sparkles className="w-4 h-4 text-emerald-500" /> Full interview analytics & PDFs
                    </div>
                </div>
                <DialogFooter className="sm:justify-center">
                    <Button 
                        onClick={() => router.push('/pricing')}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl px-8 py-6 h-auto shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                    >
                        Upgrade to Pro
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="flex flex-col h-full min-h-[250px] border border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-black/40 backdrop-blur-xl overflow-hidden shadow-xl dark:shadow-2xl">
            {paywallDialog}
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-black p-1 flex items-center justify-center border border-gray-100 dark:border-white/10">
                        <Image
                            src={modelLogo}
                            alt={modelName}
                            width={32}
                            height={32}
                            className={cn("w-full h-full object-contain", modelLogo.includes('openai') && "dark:invert")}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Test {modelName}
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </h3>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setMessages([{ role: "assistant", content: `Hello! I'm ${modelName}. Ready to help.` }])}
                >
                    <RefreshCw size={14} />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex items-start gap-3 max-w-[85%]",
                                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                msg.role === "user" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/70"
                            )}>
                                {msg.role === "user" ? <User size={14} /> : <Image src="/Instant Transcription.png" alt="AI" width={20} height={20} className="object-contain" />}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl text-sm leading-relaxed",
                                msg.role === "user"
                                    ? "bg-[#84cc16] text-white sm:text-gray-900 rounded-tr-sm"
                                    : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-100 rounded-tl-sm"
                            )}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-xs text-gray-400 ml-12"
                        >
                            <Loader2 size={12} className="animate-spin" />
                            {modelName} is typing...
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={`Message ${modelName}...`}
                        className="w-full bg-white dark:bg-black/20 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[#84cc16]/50 focus:ring-1 focus:ring-[#84cc16]/50 transition-all"
                    />
                    <Button
                        size="icon"
                        className="absolute right-1.5 h-8 w-8 bg-[#84cc16] hover:bg-[#65a30d] text-white sm:text-gray-900 rounded-lg transition-colors"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
