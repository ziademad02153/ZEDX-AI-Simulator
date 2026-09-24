"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartButtonProps {
  variant: "landing" | "dashboard";
  className?: string;
}

export function StartButton({ variant, className }: StartButtonProps) {
  const [showDot, setShowDot] = useState(false);

  useEffect(() => {
    // Check if user has started an interview before
    const hasStarted = localStorage.getItem("has_started_interview");
    if (!hasStarted) {
      setShowDot(true);
    }
  }, []);

  const handleClick = () => {
    localStorage.setItem("has_started_interview", "true");
    setShowDot(false);
  };

  if (variant === "landing") {
    return (
      <Link href="/dashboard/new" onClick={handleClick} className={cn("relative group block w-full sm:w-auto", className)}>
        {showDot && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-[#050505]"></span>
          </span>
        )}
        <Button className="w-full sm:w-auto text-base md:text-lg px-8 py-4 md:px-10 md:py-7 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 transition-all duration-300 hover:scale-105 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold tracking-wide flex items-center justify-center cursor-pointer shadow-xl overflow-hidden relative border-none">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <span className="relative z-10 flex items-center">
            Start Practicing Now <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/dashboard/new" onClick={handleClick} className={cn("relative group block w-full sm:w-auto", className)}>
      {showDot && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 z-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-white dark:border-[#050505]"></span>
        </span>
      )}
      <Button className="w-full sm:w-auto px-6 py-5 rounded-2xl bg-[#a3e635] hover:bg-[#84cc16] text-black shadow-none border-none transition-all duration-300 font-bold tracking-wide flex items-center justify-center cursor-pointer">
        <Plus className="mr-2 h-5 w-5" />
        Start New Interview
      </Button>
    </Link>
  );
}
