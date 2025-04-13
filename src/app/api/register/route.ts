import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
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

    // Don't return the password hash
    const { hashedPassword: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("REGISTRATION_ERROR", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 