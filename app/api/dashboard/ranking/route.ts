import { NextResponse } from 'next/server';
import { getTopUsers } from '@/lib/database/dashboard-queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const topUsers = await getTopUsers(limit);

    return NextResponse.json(topUsers);
  } catch (error) {
    console.error('Dashboard ranking API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking data' },
      { status: 500 }
    );
  }
}
