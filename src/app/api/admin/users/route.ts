import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    // Parse sorting parameters from query
    const url = new URL(request.url);
    const sortByRaw = url.searchParams.get('sortBy');
    const orderRaw = url.searchParams.get('order');
    const allowedSortFields = ['email', 'name', 'credits', 'isAdmin', 'createdAt'];
    const sortField = allowedSortFields.includes(sortByRaw ?? '') ? sortByRaw! : 'createdAt';
    const order = orderRaw === 'asc' ? 'asc' : 'desc';
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { [sortField]: order } as Prisma.UserOrderByWithRelationInput,
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('ADMIN_USERS_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
// PATCH /api/admin/users : update user credits (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const body = await request.json();
    const { id, credits } = body;
    if (typeof id !== 'string' || typeof credits !== 'number') {
      return new NextResponse('Invalid request body', { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { credits },
      select: { id: true, email: true, name: true, credits: true, isAdmin: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('ADMIN_USERS_PATCH_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
