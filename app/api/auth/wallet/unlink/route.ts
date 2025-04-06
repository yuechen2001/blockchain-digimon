import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth-options';

// Define wallet type for TypeScript
interface WalletData {
  id: string;
  address: string;
  isActive: boolean;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required' 
      }, { status: 400 });
    }
    
    // Get the current session
    const session = await getServerSession(authOptions);
    
    // User must be logged in to unlink a wallet
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'You must be logged in to unlink a wallet' 
      }, { status: 401 });
    }
    
    // Find the wallet linked to this user
    const wallet = await prisma.wallet.findFirst({
      where: {
        address: walletAddress,
        userId: session.user.id
      }
    });
    
    if (!wallet) {
      return NextResponse.json({ 
        error: 'This wallet is not linked to your account' 
      }, { status: 404 });
    }
    
    // Unlink (delete) the wallet
    await prisma.wallet.delete({
      where: { id: wallet.id }
    });
    
    // Get updated user data with remaining wallets
    const userWithWallets = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { wallets: true }
    });
    
    const connectedWallets = userWithWallets?.wallets.map((wallet: WalletData) => ({
      id: wallet.id,
      address: wallet.address,
      isActive: wallet.isActive
    })) || [];
    
    return NextResponse.json({
      success: true,
      message: 'Wallet unlinked successfully',
      user: {
        id: userWithWallets?.id,
        email: userWithWallets?.email,
        name: userWithWallets?.name,
        connectedWallets
      }
    });
    
  } catch (error) {
    console.error('Wallet unlinking error:', error);
    return NextResponse.json({ 
      error: 'Failed to unlink wallet' 
    }, { status: 500 });
  }
}