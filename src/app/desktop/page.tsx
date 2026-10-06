"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DesktopEntryPage() {
    const router = useRouter();
    const [status, setStatus] = useState("جاري فحص تسجيل الدخول...");

    useEffect(() => {
        const checkAndRedirect = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // User is logged in -> Go directly to CV & Job setup
                    setStatus("تم تسجيل الدخول! جاري فتح صفحة إعداد المقابلة...");
                    router.replace("/dashboard/new");
                } else {
                    // User not logged in -> Go to login
                    setStatus("يرجى تسجيل الدخول...");
                    router.replace("/login?desktop=true");
                }
            } catch (error) {
                console.error("Auth check error:", error);
                router.replace("/login?desktop=true");
            }
        };

        checkAndRedirect();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white select-none">
            <div className="text-center">
                <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-zinc-300 text-sm font-medium">{status}</p>
            </div>
        </div>
    );
}
