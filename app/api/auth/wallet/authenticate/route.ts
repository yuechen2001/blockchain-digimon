import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { prisma } from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth-options';
import { cookies } from 'next/headers';

// Define wallet type for TypeScript
interface WalletData {
  id: string;
  address: string;
  isActive: boolean;
  userId: string;
}

// The message that users will sign to prove wallet ownership
const AUTH_MESSAGE = 'Sign this message to authenticate with Blockchain Digimon: ';

// Wallet address validation
function isValidEthereumAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature } = await request.json();
    
    if (!walletAddress || !signature) {
      return NextResponse.json({ 
        error: 'Wallet address and signature are required' 
      }, { status: 400 });
    }
    
    // Validate wallet address
    if (!isValidEthereumAddress(walletAddress)) {
      return NextResponse.json({ 
        error: 'Invalid wallet address' 
      }, { status: 400 });
    }
    
    // Get the current session (if any)
    const session = await getServerSession(authOptions);
    
    // Get the stored nonce - either from the user record or from cookie
    let nonce: string | undefined;
    
    if (session?.user?.id) {
      // Get nonce from user record
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      nonce = user?.walletNonce || undefined;
      
      // Check expiration
      if (user?.walletNonceExpires && new Date(user.walletNonceExpires) < new Date()) {
        return NextResponse.json({ error: 'Nonce expired, please try again' }, { status: 400 });
      }
    } else {
      // Get nonce from cookie as fallback
      const cookieStore = cookies();
      nonce = (await cookieStore).get('wallet_nonce')?.value;
    }
    
    if (!nonce) {
      return NextResponse.json({ error: 'No valid nonce found, please request a new one' }, { status: 400 });
    }
    
    // Reconstruct the message that was signed
    const message = `${AUTH_MESSAGE}${nonce}`;
    
    // Verify the signature
    const signerAddress = ethers.verifyMessage(message, signature);
    
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Invalid signature' 
      }, { status: 401 });
    }
    
    // Clear the nonce after successful verification
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { walletNonce: null, walletNonceExpires: null }
      });
    }
    
    // If user is already logged in with credentials, link this wallet to their account
    if (session?.user?.id) {
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
      
      // If wallet doesn't exist for this user, create it
      if (!existingWallet) {
        await prisma.wallet.create({
          data: {
            address: walletAddress,
            userId: session.user.id,
            isActive: true
          }
        });
      }
      
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
        authenticated: true,
        user: {
          id: userWithWallets?.id,
          email: userWithWallets?.email,
          name: userWithWallets?.name,
          connectedWallets
        }
      });
    }
    
    // If no active session, check if this wallet is linked to an existing account
    const existingWallet = await prisma.wallet.findUnique({
      where: { address: walletAddress },
      include: { user: true }
    });
    
    if (existingWallet) {
      // Wallet exists, get all wallets for this user
      const userWithWallets = await prisma.user.findUnique({
        where: { id: existingWallet.userId },
        include: { wallets: true }
      });
      
      const connectedWallets = userWithWallets?.wallets.map((wallet: WalletData) => ({
        id: wallet.id,
        address: wallet.address,
        isActive: wallet.isActive
      }));
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: userWithWallets?.id,
          email: userWithWallets?.email,
          name: userWithWallets?.name,
          connectedWallets
        }
      });
    }
    
    // Wallet is not linked to any account, create a new user with this wallet
    const newUser = await prisma.user.create({
      data: {
        name: `User_${walletAddress.substring(0, 6)}`,
        wallets: {
          create: {
            address: walletAddress,
            isActive: true
          }
        }
      },
      include: { wallets: true }
    });
    
    const connectedWallets = newUser.wallets.map((wallet: WalletData) => ({
      id: wallet.id,
      address: wallet.address,
      isActive: wallet.isActive
    }));
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        connectedWallets
      }
    });
    
  } catch (error) {
    console.error('Wallet authentication error:', error);
    return NextResponse.json({ 
      error: 'Failed to authenticate with wallet' 
    }, { status: 500 });
  }
}