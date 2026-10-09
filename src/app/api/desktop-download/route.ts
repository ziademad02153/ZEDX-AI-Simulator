import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SESSION_COOKIE } from '@/lib/server-session';

const installer = 'https://github.com/ziademad02153/zedx-ai-dist/releases/download/v1.1.5/ZEDX.AI.Setup.1.1.5.exe';
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' };

async function authorize(req: NextRequest) {
    const authorization = req.headers.get('authorization');
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice(7).trim() : req.cookies.get(SERVER_SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Sign in to download the desktop app.' }, { status: 401, headers });
    try {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user }, error } = await client.auth.getUser(token);
        if (error || !user) return NextResponse.json({ error: 'Unable to verify your sign-in.' }, { status: error && error.status && error.status >= 500 ? 503 : 401, headers });
        const { data: profile, error: profileError } = await client.from('profiles')
            .select('tier, subscription_expires_at').eq('id', user.id).single();
        if (profileError || !profile) return NextResponse.json({ error: 'Unable to verify your subscription. Please retry.' }, { status: 503, headers });
        const expiry = profile.subscription_expires_at;
        if (profile.tier !== 'ultra' || (expiry != null && !(Date.parse(expiry) > Date.now()))) {
            return NextResponse.json({ error: 'Desktop downloads require an active Ultra subscription.' }, { status: 403, headers });
        }
        return null;
    } catch {
        return NextResponse.json({ error: 'Unable to verify your subscription. Please retry.' }, { status: 503, headers });
    }
}

export async function GET(req: NextRequest) {
    const denied = await authorize(req);
    if (denied) return denied;
    if (req.nextUrl.searchParams.get('check') === '1') return NextResponse.json({ available: true }, { headers });
    return new NextResponse(null, { status: 307, headers: { ...headers, Location: installer } });
}

export async function POST(req: NextRequest) {
    const denied = await authorize(req);
    return denied || NextResponse.json({ url: installer }, { headers });
}
