import { NextRequest } from "next/server";
import { getSystemPrompt, PromptType } from "@/lib/prompts";

// Simple in-memory rate limiter (20 requests per minute per user)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20;

// Streaming AI Generation using Groq
// This endpoint returns Server-Sent Events (SSE) for real-time word-by-word responses

export const runtime = "edge"; // Use Edge Runtime for faster streaming

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate Request
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid authentication token." }), { status: 401 });
        }

        // 2. Check Usage Limits (Teaser Mode)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tier, questions_asked')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: "User profile not found. Please re-login." }), { status: 404 });
        }

        // Rate Limiter Check (Applies to all users, even Pro)
        const now = Date.now();
        const userRateData = rateLimitMap.get(user.id);
        if (userRateData) {
            if (now > userRateData.resetTime) {
                rateLimitMap.set(user.id, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
            } else if (userRateData.count >= MAX_REQUESTS) {
                return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a minute." }), { status: 429 });
            } else {
                userRateData.count += 1;
            }
        } else {
            rateLimitMap.set(user.id, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        }

        if (profile.tier === 'free' && profile.questions_asked >= 4) {
            return new Response(JSON.stringify({ error: "PAYWALL_LIMIT_REACHED", code: "PAYWALL_LIMIT_REACHED" }), { status: 403 });
        }

        const body = await request.json();
        const { model, messages, promptType, promptContext } = body;
        
        // Generate secure system prompt on the server
        const systemPrompt = getSystemPrompt(promptType as PromptType, promptContext);

        const groqApiKey = process.env.GROQ_API_KEY;

        if (!groqApiKey) {
            return new Response(
                JSON.stringify({ error: "Server AI configuration missing" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const finalMessages = systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
                model: model || "qwen/qwen3.8-27b",
                messages: finalMessages,
                max_tokens: 4096,
                temperature: 0.1,
                stream: true
            })
        });

        // 3. Increment Questions Count for Free Users (Fixes Race Condition via RPC)
        if (response.ok && profile.tier === 'free') {
            await supabase.rpc('increment_questions', { user_id: user.id });
        }

        if (!response.ok) {
            const errorData = await response.text();
            console.error("[Stream API] Groq Error:", errorData);
            return new Response(
                JSON.stringify({ error: "AI temporarily unavailable" }),
                { status: response.status, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create a TransformStream to process the SSE data
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
                                // Send each token as SSE
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                            }
                        } catch {
                            // Ignore parse errors for incomplete chunks
                        }
                    }
                }
            }
        });

        // Pipe the response through our transform
        const stream = response.body?.pipeThrough(transformStream);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        });

    } catch (error: unknown) {
        console.error("[Stream API] Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || "Stream failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
