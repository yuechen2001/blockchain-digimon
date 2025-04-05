import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { prisma } from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../[...nextauth]/route';

// Define wallet type for TypeScript
interface WalletData {
  id: string;
  address: string;
  isActive: boolean;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature } = await request.json();
    
    if (!walletAddress || !signature) {
      return NextResponse.json({ 
        error: 'Wallet address and signature are required' 
      }, { status: 400 });
    }
    
    // Get the current session
    const session = await getServerSession(authOptions);
    
    // User must be logged in to link a wallet
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'You must be logged in to link a wallet' 
      }, { status: 401 });
    }
    
    // Check if wallet is already linked to another account
    const existingWallet = await prisma.wallet.findUnique({
      where: { address: walletAddress },
      include: { user: true }
    });
    
    if (existingWallet && existingWallet.userId !== session.user.id) {
      return NextResponse.json({ 
        error: 'This wallet is already linked to another account' 
      }, { status: 409 });
    }
    
    // If wallet already exists for this user, just return success
    if (existingWallet && existingWallet.userId === session.user.id) {
      // Get user with all wallets
      const userWithWallets = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { wallets: true }
      });
      
      const connectedWallets = userWithWallets?.wallets.map((wallet: WalletData) => ({
        id: wallet.id,
        address: wallet.address,
        isActive: wallet.isActive
      }));
      
      return NextResponse.json({
        success: true,
        message: 'Wallet already linked to your account',
        user: {
          id: userWithWallets?.id,
          email: userWithWallets?.email,
          name: userWithWallets?.name,
          connectedWallets
        }
      });
    }
    
    // Link the wallet to the user's account
    await prisma.wallet.create({
      data: {
        address: walletAddress,
        userId: session.user.id,
        isActive: true
      }
    });
    
    // Get updated user data with all wallets
    const userWithWallets = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { wallets: true }
    });
    
    const connectedWallets = userWithWallets?.wallets.map((wallet: WalletData) => ({
      id: wallet.id,
      address: wallet.address,
      isActive: wallet.isActive
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      user: {
        id: userWithWallets?.id,
        email: userWithWallets?.email,
        name: userWithWallets?.name,
        connectedWallets
      }
    });
    
  } catch (error) {
    console.error('Wallet linking error:', error);
    return NextResponse.json({ 
      error: 'Failed to link wallet' 
    }, { status: 500 });
  }
}