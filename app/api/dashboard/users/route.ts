import { NextResponse } from 'next/server';
import { getRecentActivity } from '@/lib/database/dashboard-queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const activity = await getRecentActivity(limit);
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Dashboard users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}
