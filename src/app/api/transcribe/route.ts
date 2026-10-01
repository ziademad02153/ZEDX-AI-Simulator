import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        // SECURITY CHECK: Verify user authentication (30X Audit Fix)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
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
            process.env.GROQ_API_KEY_14
        ].filter(Boolean) as string[];

        // Use the received file directly as a Blob/File
        const audioFile = file;
        console.log(`[Transcribe API] Processing file: ${audioFile.name}, Type: ${audioFile.type}, Size: ${audioFile.size} bytes`);

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
                console.log(`[Transcribe API] Attempting with Key: ${maskedKey}`);

                const groqFormData = new FormData();
                // Use the file directly. Filename is important for Groq to detect format.
                groqFormData.append("file", audioFile, "audio.webm");
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

                // If not ok, capture error and try next key
                const errorBody = await response.text();
                lastError = { status: response.status, body: errorBody };
                console.warn(`[Transcribe API] Key ${maskedKey} failed (${response.status}). Body: ${errorBody.substring(0, 200)}`);

                // If it's a 413 (File too large) or 400 (Bad Request/Invalid File), don't retry.
                // Retrying a bad file with a different key won't fix it and just wastes limits.
                if (response.status === 413 || response.status === 400) {
                    console.warn(`[Transcribe API] Aborting retry for status ${response.status}`);
                    break;
                }

            } catch (err: unknown) {
                const error = err as Error;
                lastError = error;
                console.error(`[Transcribe API] Fetch failed for key. Trying next...`, error.message);
            }
        }

        // If we reach here, ALL keys failed
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
