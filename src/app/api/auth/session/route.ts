import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SESSION_COOKIE } from '@/lib/server-session';

function sameOrigin(request: NextRequest) {
    const origin = request.headers.get('origin');
    return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token || token.length > 8192) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await client.auth.getUser(token);
        if (error || !data.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // Decode expiry only after Supabase has authenticated this token.
        const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        const maxAge = Math.max(0, Math.min(3600, Math.floor(Number(claims.exp) - Date.now() / 1000)));
        if (!Number.isFinite(maxAge) || maxAge <= 0) return NextResponse.json({ error: 'Expired session' }, { status: 401 });
        const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
        response.cookies.set(SERVER_SESSION_COOKIE, token, {
            httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge,
        });
        return response;
    } catch {
        return NextResponse.json({ error: 'Unable to verify session' }, { status: 503 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.delete(SERVER_SESSION_COOKIE);
    response.cookies.delete('auth_token');
    return response;
}
