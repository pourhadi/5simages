import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

export async function POST(request: Request) {
  // Create a dedicated client for this request to avoid prepared statement conflicts
  const prisma = new PrismaClient();
  
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return new NextResponse('Email already in use', { status: 409 }); // 409 Conflict
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Salt rounds = 12

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        credits: 5, // Give 5 free credits on registration
      },
    });

    // Destructure to exclude hashedPassword from response
    const { hashedPassword: removed, ...userWithoutPassword } = user;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void removed; // Mark as intentionally unused

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return new NextResponse('Internal Error', { status: 500 });
  } finally {
    // Always disconnect to release the connection
    await prisma.$disconnect();
  }
} 