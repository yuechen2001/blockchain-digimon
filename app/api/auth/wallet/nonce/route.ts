import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth-options';
import { randomBytes } from 'crypto';
import { prisma } from '../../../../../lib/prisma';

// Generate a new nonce for wallet authentication
export async function GET() {
  try {
    // Generate a random nonce
    const nonce = randomBytes(32).toString('hex');
    
    // Get the current session (if any)
    const session = await getServerSession(authOptions);
    
    // Store the nonce with an expiration time (5 minutes)
    // This will either be associated with the session user or stored temporarily
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    if (session?.user?.id) {
      // Store nonce for logged-in user
      await prisma.user.update({
        where: {
          id: session.user.id
        },
        data: {
          walletNonce: nonce,
          walletNonceExpires: expiresAt
        }
      });
    }
    
    // For now, also store the nonce in the response as a cookie
    // This is a fallback for users without a session
    const response = NextResponse.json({ nonce });
    response.cookies.set('wallet_nonce', nonce, { 
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict'
    });
    
    return response;
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 });
  }
}