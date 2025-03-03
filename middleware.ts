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

  // Special handling for connect-wallet page
  if (pathname === '/connect-wallet') {
    return NextResponse.next();
  }

  // For all other protected routes, check if wallet is connected
  const user = session.user as { walletAddress?: string } | undefined;
  if (!user?.walletAddress && pathname !== '/connect-wallet') {
    return NextResponse.redirect(new URL('/connect-wallet', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/marketplace/:path*',
    '/my-listings/:path*',
    '/connect-wallet',
    '/login',
    '/register',
  ],
};
