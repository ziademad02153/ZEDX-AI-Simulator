"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Option {
    label: string;
    value: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    /** Extra classes applied to the trigger button */
    triggerClassName?: string;
}

export function CustomSelect({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    triggerClassName,
}: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, triggerTop: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            // Check if click is outside trigger AND outside portal panel
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node) &&
                panelRef.current &&
                !panelRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Position calculation and scroll tracking
    useEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                const requiredHeight = Math.min(options.length * 44 + 16, 256);
                const shouldDropUp = spaceBelow < requiredHeight && spaceAbove > spaceBelow;
                
                setDropUp(shouldDropUp);
                setCoords({
                    top: rect.bottom,
                    triggerTop: rect.top,
                    left: rect.left,
                    width: rect.width,
                });
            }
        };

        updatePosition();
        
        // Use capture phase to catch scroll events from any scrollable container
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open, options.length]);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <div className={cn("relative z-10", className)} ref={containerRef}>
            {/* ── Trigger ─────────────────────────────────────────────── */}
            <div
                onClick={() => setOpen((prev) => !prev)}
                className={cn(
                    "flex items-center justify-between w-full h-12 px-4",
                    "bg-gray-50 dark:bg-zinc-800/80",
                    "border border-gray-200 dark:border-white/10",
                    "rounded-xl cursor-pointer transition-all duration-200 select-none",
                    open
                        ? "ring-2 ring-emerald-500/50 border-emerald-500/50"
                        : "hover:border-emerald-500/30",
                    triggerClassName
                )}
            >
                <span
                    className={cn(
                        "text-sm font-medium truncate",
                        selectedLabel
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-400 dark:text-zinc-500"
                    )}
                >
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 flex-shrink-0 ml-2 text-gray-400 dark:text-zinc-500",
                        "transition-transform duration-200",
                        open && "rotate-180"
                    )}
                />
            </div>

            {/* ── Dropdown panel via Portal ───────────────────────────── */}
            {typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {open && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
                            animate={{ opacity: 1, y: dropUp ? -6 : 6, scale: 1 }}
                            exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            style={{
                                position: "fixed",
                                left: coords.left,
                                width: coords.width,
                                // If dropUp, pin bottom of panel just above the trigger
                                ...(dropUp 
                                    ? { bottom: window.innerHeight - coords.triggerTop + 4 }
                                    : { top: coords.top + 4 }
                                )
                            }}
                            className={cn(
                                "z-[99999]",
                                "bg-white dark:bg-zinc-800",
                                "border border-gray-100 dark:border-white/10",
                                "rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40",
                                "max-h-64 overflow-y-auto overflow-x-hidden py-1.5",
                                "outline-none",
                                // Webkit scrollbar
                                "[&::-webkit-scrollbar]:w-1.5",
                                "[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:border-none [&::-webkit-scrollbar-track]:shadow-none",
                                "[&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:border-none [&::-webkit-scrollbar-thumb]:shadow-none",
                                "hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600",
                                "[&::-webkit-scrollbar-thumb]:rounded-full"
                            )}
                        >
                            {options.map((opt) => (
                                <div
                                    key={opt.value}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center justify-between",
                                        "px-4 py-2.5 mx-1.5 rounded-xl",
                                        "cursor-pointer text-sm transition-colors",
                                        value === opt.value
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                    )}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && (
                                        <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
