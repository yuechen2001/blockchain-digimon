import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login', '/register', '/', '/api/auth'];

export async function middleware(request: NextRequest) {
  const session = await getToken({ req: request });
  const { pathname } = request.nextUrl;

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

export const config = {
  matcher: [
    '/marketplace/:path*',
    '/my-listings/:path*',
    '/login',
    '/register',
  ],
};
