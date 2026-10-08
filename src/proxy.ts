import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVER_SESSION_COOKIE } from '@/lib/server-session';

export default async function middleware(request: NextRequest) {
    // Define protected routes
    const protectedPaths = ['/dashboard', '/interview', '/mock-interview', '/desktop-assistant', '/onboarding', '/desktop'];
    const publicPaths = ['/scanner-frame', '/desktop/overlay'];
    if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-is-scanner', 'true');
        requestHeaders.set('x-url', request.url);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtected) {
        // Check for auth_token cookie
        const token = request.cookies.get(SERVER_SESSION_COOKIE);

        if (!token || !token.value) {
            // Redirect to login if no token found
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', request.nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }

        try {
            const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data, error } = await client.auth.getUser(token.value);
            if (!error && data.user) return NextResponse.next();
            if (error && (error.status && error.status >= 500 || error.name === 'AuthRetryableFetchError')) {
                return new NextResponse('Unable to verify your session. Please retry.', { status: 503 });
            }
        } catch {
            return new NextResponse('Unable to verify your session. Please retry.', { status: 503 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', request.nextUrl.pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(SERVER_SESSION_COOKIE);
        response.cookies.delete('auth_token');
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/interview/:path*',
        '/mock-interview/:path*',
        '/onboarding/:path*',
        '/desktop/:path*',
        '/desktop-assistant/:path*',
        '/desktop/overlay/:path*',
        '/scanner-frame/:path*',
    ],
};
