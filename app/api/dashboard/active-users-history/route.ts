import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserHistory } from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const history = await getActiveUserHistory(startDate, endDate);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Active users history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active users history' },
      { status: 500 }
    );
  }
}
