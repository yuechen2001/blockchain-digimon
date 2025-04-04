import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { applyRateLimit } from './middleware/rateLimit/rateLimitMiddleware';

const PUBLIC_PATHS = ['/login', '/register', '/', '/api/auth/[...nextauth]'];
const API_PATHS = ['/api/'];

/**
 * Middleware for the blockchain Digimon application
 * Implements rate limiting, CSRF protection, and authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply rate limiting only to API paths
  if (API_PATHS.some(path => pathname.startsWith(path))) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  const session = await getToken({ req: request });

  // Check for CSRF protection on API routes (excluding NextAuth route)
  if (pathname.startsWith('/api/') && !pathname.includes('/api/auth/[...nextauth]')) {
    // Skip CSRF check for GET requests
    if (request.method !== 'GET') {
      const csrfToken = request.headers.get('csrf-token');
      const nextAuthCsrfCookie = request.cookies.get('next-auth.csrf-token');
      
      // If no CSRF token in header or no cookie, reject the request
      if (!csrfToken || !nextAuthCsrfCookie) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
      
      // Verify the token matches the one in the cookie
      // NextAuth stores the token as value.token format
      const [cookieValue] = nextAuthCsrfCookie.value.split('.');
      if (cookieValue !== csrfToken) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }
  }

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Allow access to all protected routes if authenticated
  return NextResponse.next();
}

/**
 * Matcher for the middleware
 * Specifies which routes the middleware applies to
 */
export const config = {
  matcher: [
    '/marketplace/:path*',
    '/my-listings/:path*',
    '/login',
    '/register',
    '/api/:path*', // Add all API routes to the matcher
  ],
};
