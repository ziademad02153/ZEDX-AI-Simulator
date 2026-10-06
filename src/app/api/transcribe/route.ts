import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const authHeader = request.headers.get('Authorization');
        let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
        if (token === 'undefined' || token === 'null') token = undefined;

        let user: any = null;
        if (token) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && data?.user) {
                user = data.user;
            } else {
                console.warn('[Transcribe API] Token validation warning:', error?.message);
            }
        }

        if (!user && !isDev) {
            return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Missing file" }, { status: 400 });
        }

        const API_KEYS = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_1,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
            process.env.GROQ_API_KEY_4,
            process.env.GROQ_API_KEY_5,
            process.env.GROQ_API_KEY_6,
            process.env.GROQ_API_KEY_7,
            process.env.GROQ_API_KEY_8,
            process.env.GROQ_API_KEY_9,
            process.env.GROQ_API_KEY_10,
            process.env.GROQ_API_KEY_11,
            process.env.GROQ_API_KEY_12,
            process.env.GROQ_API_KEY_13,
            process.env.GROQ_API_KEY_14,
            process.env.GROQ_STT_KEY_1,
            process.env.GROQ_STT_KEY_2,
            process.env.GROQ_STT_KEY_3,
            process.env.GROQ_STT_KEY_4,
            process.env.GROQ_STT_KEY_5,
            process.env.GROQ_STT_KEY_6,
            process.env.GROQ_STT_KEY_7,
            process.env.GROQ_STT_KEY_8,
            process.env.GROQ_STT_KEY_9,
            process.env.GROQ_STT_KEY_10,
            process.env.GROQ_STT_KEY_11,
            process.env.GROQ_STT_KEY_12,
            process.env.GROQ_STT_KEY_13,
            process.env.GROQ_STT_KEY_14
        ].filter(Boolean) as string[];

        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength < 500) {
            return NextResponse.json({ text: "" });
        }
        console.log(`[Transcribe API] Processing audio: ${arrayBuffer.byteLength} bytes`);

        if (API_KEYS.length === 0) {
            console.error("[Transcribe API] No keys found! Check .env.local");
            return NextResponse.json({ error: "Server configuration error: No keys available" }, { status: 500 });
        }

        // Shuffle keys once to start randomly but consistently
        const shuffledKeys = [...API_KEYS].sort(() => Math.random() - 0.5);

        let lastError = null;

        // TRY MULTIPLE KEYS AUTOMATICALLY (Robustness)
        for (const apiKey of shuffledKeys) {
            try {
                const maskedKey = apiKey.substring(0, 8) + '...';

                const groqFormData = new FormData();
                const audioBlob = new Blob([arrayBuffer], { type: "audio/webm" });
                groqFormData.append("file", audioBlob, "audio.webm");
                groqFormData.append("model", formData.get("model")?.toString() || "whisper-large-v3-turbo");
                groqFormData.append("temperature", "0");

                if (formData.get("language")) {
                    const fullLang = formData.get("language") as string;
                    const iso6391 = fullLang.split('-')[0]; // e.g. "en-US" -> "en"
                    groqFormData.append("language", iso6391);
                }

                const userPrompt = formData.get("prompt")?.toString();
                if (userPrompt) {
                    groqFormData.append("prompt", userPrompt);
                }

                const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                    },
                    body: groqFormData,
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json({ text: data.text });
                }

                const errorBody = await response.text();
                lastError = { status: response.status, body: errorBody };
                console.warn(`[Transcribe API] Key ${maskedKey} returned status ${response.status}`);

                // If Groq indicates corrupt/unreadable audio format (400), don't return 503 to break UI
                if (response.status === 400) {
                    console.warn(`[Transcribe API] Invalid or unreadable audio format from client: ${errorBody.substring(0, 150)}`);
                    return NextResponse.json({ text: "" });
                }

                if (response.status === 413) {
                    break;
                }

            } catch (err: unknown) {
                const error = err as Error;
                lastError = error;
                console.error(`[Transcribe API] Fetch failed for key:`, error.message);
            }
        }

        // If we reach here, ALL keys failed or were rate limited
        return NextResponse.json({
            error: "All transcription servers failed or rate limited.",
            details: lastError
        }, { status: 503 });

    } catch (error: unknown) {
        const err = error as Error;
        console.error("[Transcribe API] Internal Error:", err);
        const isDev = process.env.NODE_ENV === 'development';
        return NextResponse.json({
            error: isDev ? err.message : "An error occurred. Please try again."
        }, { status: 500 });
    }
}
