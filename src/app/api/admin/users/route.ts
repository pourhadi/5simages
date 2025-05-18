import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Parse sorting parameters from query
    const url = new URL(request.url);
    const sortByRaw = url.searchParams.get('sortBy');
    const orderRaw = url.searchParams.get('order');
    const allowedSortFields = ['email', 'name', 'credits', 'isAdmin', 'createdAt'];
    const sortField = allowedSortFields.includes(sortByRaw ?? '') ? sortByRaw! : 'createdAt';
    const order = orderRaw === 'asc' ? 'asc' : 'desc';
    const cookieStore = await cookies();
    const headerStore = await headers();
    const supabase = createRouteHandlerSupabaseClient({
      cookies: () => cookieStore,
      headers: () => headerStore,
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });
    if (requester?.isAdmin !== true) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { [sortField]: order } as any,
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('ADMIN_USERS_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
// PATCH /api/admin/users : update user credits (admin only)
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const supabase = createRouteHandlerSupabaseClient({
      cookies: () => cookieStore,
      headers: () => headerStore,
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });
    if (requester?.isAdmin !== true) {
      return new NextResponse('Forbidden', { status: 403 });
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
