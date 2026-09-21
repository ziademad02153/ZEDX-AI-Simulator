import { NextRequest } from "next/server";
import { getSystemPrompt, PromptType } from "@/lib/prompts";

// CRITICAL FIX: Edge runtime cannot use in-memory Maps across requests (serverless = stateless).
// Rate limiting for generate-stream is now delegated to Supabase RPC (same as /api/generate).
// The old Map-based limiter was silently broken — it reset on every cold start.

export const runtime = "edge"; // Use Edge Runtime for faster streaming

import { createClient } from '@supabase/supabase-js';

const MAX_REQUESTS = 20;

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate Request
        const authHeader = request.headers.get('Authorization');
        let token = authHeader?.split(' ')[1];
        if (token === 'undefined' || token === 'null') token = undefined;

        if (!token) {
            return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), { status: 401 });
        }

        // Use service_role key for auth validation (same as /api/generate for consistency)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid authentication token." }), { status: 401 });
        }

        // 2. Check Usage Limits (Teaser Mode) + Fetch profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('tier, questions_asked, subscription_expires_at')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: "User profile not found. Please re-login." }), { status: 404 });
        }

        // 3. Subscription expiration check (auto-downgrade)
        let currentTier = profile.tier;
        if (profile.subscription_expires_at) {
            const expiryDate = new Date(profile.subscription_expires_at);
            if (new Date() > expiryDate) {
                currentTier = 'free';
                await supabaseAdmin
                    .from('profiles')
                    .update({ tier: 'free', subscription_expires_at: null })
                    .eq('id', user.id);
            }
        }

        // 4. Rate Limit Check using Supabase RPC (atomic, works across all serverless instances)
        const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_rate_limit', {
            p_user_id: user.id,
            p_max: MAX_REQUESTS
        });

        if (rateLimitError) {
            console.error('[Stream Rate Limit Error] Fallback to allow:', rateLimitError.message);
            // Allow if RPC fails so we don't break the app
        } else if (isAllowed === false) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }), { status: 429 });
        }

        const body = await request.json();
        const { model, messages, promptType, promptContext } = body;

        // 5. Paywall check for free users
        if (currentTier === 'free' && promptType !== 'report_evaluator' && profile.questions_asked >= 4) {
            return new Response(JSON.stringify({ error: "PAYWALL_LIMIT_REACHED", code: "PAYWALL_LIMIT_REACHED" }), { status: 403 });
        }

        // 6. Increment question count BEFORE the AI call (atomic, prevent race conditions)
        if (currentTier === 'free' && promptType !== 'report_evaluator') {
            await supabaseAdmin.rpc('increment_questions', { user_id: user.id });
        }

        // 7. Generate secure system prompt on the server
        const systemPrompt = getSystemPrompt(promptType as PromptType, promptContext);

        // 8. Load balance across multiple Groq API keys
        const groqApiKeys = [
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

        if (groqApiKeys.length === 0) {
            return new Response(
                JSON.stringify({ error: "Server AI configuration missing" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Fisher-Yates shuffle for even key distribution
        const shuffledKeys = [...groqApiKeys];
        for (let i = shuffledKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledKeys[i], shuffledKeys[j]] = [shuffledKeys[j], shuffledKeys[i]];
        }

        const finalMessages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;

        // 9. Enforce model tier server-side (mirrors /api/generate logic - SECURITY CRITICAL)
        // Free users are always downgraded to the free model regardless of what the client sends.
        const PRO_MODELS = ["qwen/qwen3.8-27b"];
        const ULTRA_MODELS = ["openai/gpt-oss-120b"];
        let targetModel = model || "openai/gpt-oss-20b";
        if (currentTier === 'free' && (PRO_MODELS.includes(targetModel) || ULTRA_MODELS.includes(targetModel))) {
            targetModel = "openai/gpt-oss-20b";
        } else if (currentTier === 'pro' && ULTRA_MODELS.includes(targetModel)) {
            targetModel = "qwen/qwen3.8-27b"; // pro cap
        }

        // 9. Try each key with fallback
        let lastError: string | null = null;
        for (const apiKey of shuffledKeys) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: targetModel,
                        messages: finalMessages,
                        max_tokens: 4096,
                        temperature: 0.1,
                        stream: true
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errText = await response.text();
                    lastError = `HTTP ${response.status}: ${errText.substring(0, 100)}`;
                    console.warn(`[Stream] Key ***${apiKey.slice(-4)} failed (${response.status}). Trying next...`);
                    continue; // try next key
                }

                // 10. Transform and stream SSE response
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();

                const transformStream = new TransformStream({
                    async transform(chunk, controller) {
                        const text = decoder.decode(chunk);
                        const lines = text.split("\n").filter(line => line.trim() !== "");

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const data = line.slice(6);
                                if (data === "[DONE]") {
                                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                                    return;
                                }

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                    }
                                } catch {
                                    // Ignore parse errors for incomplete chunks
                                }
                            }
                        }
                    }
                });

                const stream = response.body?.pipeThrough(transformStream);

                return new Response(stream, {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                });

            } catch (err: unknown) {
                const error = err as Error;
                lastError = error.message;
                console.warn(`[Stream] Key ***${apiKey.slice(-4)} threw error:`, error.message);
                // continue to next key
            }
        }

        // All keys failed
        console.error("[Stream] All Groq keys exhausted. Last error:", lastError);
        return new Response(
            JSON.stringify({ error: "AI temporarily unavailable. Please try again in a moment." }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );

    } catch (error: unknown) {
        console.error("[Stream API] Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || "Stream failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
