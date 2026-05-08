// app/api/admin/visitors/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getSessionCookie } from '@/lib/auth';
import { getVisitors, getVisitorStats, deleteVisitor, clearAllVisitors } from '@/lib/db';

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookie())?.value;

  if (!token) return null;

  const user = await verifyToken(token);
  return user;
}

export async function GET(request) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = 20;

  try {
    const [visitors, stats] = await Promise.all([
      getVisitors(page, perPage),
      getVisitorStats(),
    ]);

    return NextResponse.json({ visitors, stats });
  } catch (error) {
    console.error('Get visitors error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitors' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const clear = searchParams.get('clear') === 'all';

  try {
    if (clear) {
      await clearAllVisitors();
      return NextResponse.json({ success: true, message: 'All records cleared' });
    }

    if (id) {
      await deleteVisitor(parseInt(id));
      return NextResponse.json({ success: true, message: 'Record deleted' });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
