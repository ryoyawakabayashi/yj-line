import { NextResponse } from 'next/server';
import { getConversionsBySource, getDailyConversionTrends } from '@/lib/ga4/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const type = searchParams.get('type') || 'both'; // 'source', 'daily', or 'both'

    let data: any = {};

    // Fetch data based on type
    if (type === 'source' || type === 'both') {
      const bySource = await getConversionsBySource(days);
      data.bySource = bySource;
    }

    if (type === 'daily' || type === 'both') {
      const dailyTrends = await getDailyConversionTrends(days);
      data.dailyTrends = dailyTrends;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('GA4 API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GA4 data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
