import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username and password are required' },
        { status: 400 }
      );
    }

    const usersPath = path.join(process.cwd(), 'data', 'users', 'users.json');
    
    // Create users.json if it doesn't exist
    try {
      await fs.access(usersPath);
    } catch {
      await fs.mkdir(path.dirname(usersPath), { recursive: true });
      await fs.writeFile(usersPath, '[]');
    }

    // Read existing users
    const usersData = await fs.readFile(usersPath, 'utf-8');
    const users = usersData ? JSON.parse(usersData) : [];

    // Check if user already exists
    if (users.some((u: { email: string }) => u.email === email)) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      email,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Add user to array
    users.push(newUser);

    // Save updated users
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));

    // Return success without password
    const userWithoutPassword = { ...newUser } as Partial<typeof newUser>;
    delete userWithoutPassword.password;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
