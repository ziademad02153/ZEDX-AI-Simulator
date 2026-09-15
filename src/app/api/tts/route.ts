import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

export async function POST(req: Request) {
    try {
        // 1. Authenticate Request
        const authHeader = req.headers.get('Authorization');
        let token = authHeader?.split(' ')[1];
        if (token === 'undefined' || token === 'null') token = undefined;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Rate Limiting for TTS (15 requests per minute)
        const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_rate_limit', {
            p_user_id: user.id,
            p_max: 15
        });

        if (rateLimitError || !isAllowed) {
            return NextResponse.json({ error: 'Rate limit exceeded for TTS' }, { status: 429 });
        }

        const { text, language = 'en-US' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // 1. Arabic -> ElevenLabs (Premium Natural Voice)
        if (language.startsWith('ar')) {
            const elevenLabsKeys = [
                process.env.ELEVENLABS_API_KEY,
                process.env.ELEVENLABS_API_KEY_1,
                process.env.ELEVENLABS_API_KEY_2,
                process.env.ELEVENLABS_API_KEY_3,
                process.env.ELEVENLABS_API_KEY_4,
                process.env.ELEVENLABS_API_KEY_5,
                process.env.ELEVENLABS_API_KEY_6,
                process.env.ELEVENLABS_API_KEY_7,
                process.env.ELEVENLABS_API_KEY_8,
                process.env.ELEVENLABS_API_KEY_9
            ].filter(Boolean) as string[];

            if (elevenLabsKeys.length === 0) {
                return NextResponse.json({ error: 'ELEVENLABS_API_KEY is missing' }, { status: 500 });
            }

            const voiceId = "pNInz6obpgDQGcFmaJgB"; // Adam (Professional Male)
            const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

            let lastError = null;
            // Proper Fisher-Yates shuffle to distribute keys evenly
            const shuffledKeys = [...elevenLabsKeys];
            for (let i = shuffledKeys.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
            }

            for (const apiKey of shuffledKeys) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'xi-api-key': apiKey,
                        },
                        body: JSON.stringify({
                            text: text,
                            model_id: 'eleven_multilingual_v2',
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                        }),
                    });

                    if (response.ok) {
                        return new NextResponse(response.body, {
                            headers: { 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked' },
                        });
                    }

                    // If failed (e.g., rate limit, out of quota), log and move to next key
                    lastError = await response.json().catch(() => null);
                    console.warn(`ElevenLabs Key failed (Status ${response.status}). Trying next key...`, lastError);
                } catch (e) {
                    lastError = e;
                    console.warn(`ElevenLabs fetch error. Trying next key...`, e);
                }
            }

            console.error("All ElevenLabs keys failed/exhausted:", lastError);
            return NextResponse.json({ error: 'Failed to generate audio from ElevenLabs (All keys exhausted)' }, { status: 500 });
        }

        // If it reaches here, it means it's a non-Arabic language that was incorrectly sent to the API
        // Because the client now handles non-Arabic Edge TTS directly in the browser.
        return NextResponse.json({ error: "Non-Arabic languages should be handled by the client using EdgeTTS directly." }, { status: 400 });

    } catch (error: any) {
        console.error('Error generating TTS:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
    }
}
