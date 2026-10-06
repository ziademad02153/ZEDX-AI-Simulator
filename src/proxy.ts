import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
    // Define protected routes
    const protectedPaths = ['/dashboard', '/interview', '/desktop-assistant'];
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
        const token = request.cookies.get('auth_token');

        if (!token || !token.value) {
            // Redirect to login if no token found
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', request.nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }

        // SECURITY FIX: Stricter token format validation
        // Token must be exactly 32 alphanumeric characters (from Supabase JWT slice)
        const tokenRegex = /^[A-Za-z0-9_-]{32,36}$/;
        if (!tokenRegex.test(token.value)) {
            // Invalid token format, clear it and redirect
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('auth_token');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/interview/:path*',
        '/desktop-assistant/:path*',
        '/desktop/overlay/:path*',
        '/scanner-frame/:path*',
    ],
};
