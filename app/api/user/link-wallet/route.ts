import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Get the user from the users.json file
    const usersPath = path.join(process.cwd(), 'data', 'users', 'users.json');
    
    // Create users.json if it doesn't exist
    try {
      await fs.access(usersPath);
    } catch {
      await fs.mkdir(path.dirname(usersPath), { recursive: true });
      await fs.writeFile(usersPath, '[]');
    }

    // Read and parse users
    const usersData = await fs.readFile(usersPath, 'utf-8');
    const users = usersData ? JSON.parse(usersData) : [];
    
    // Find user by email
    const userIndex = users.findIndex((u: any) => u.email === session.user.email);

    if (userIndex === -1) {
      // If user doesn't exist in JSON, create new entry
      users.push({
        id: `user_${Date.now()}`,
        email: session.user.email,
        username: session.user.name,
        walletAddress,
        createdAt: new Date().toISOString()
      });
    } else {
      // Update existing user's wallet address
      users[userIndex].walletAddress = walletAddress;
    }

    // Save the updated users back to the file
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));

    // Return the updated user data
    const updatedUser = userIndex === -1 ? users[users.length - 1] : users[userIndex];
    console.log('Returning updated user:', updatedUser);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error linking wallet:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet' },
      { status: 500 }
    );
  }
}
