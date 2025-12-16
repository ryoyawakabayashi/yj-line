import { NextResponse } from 'next/server';
import {
  getUsersByLanguage,
  getJapaneseLevelDistribution,
  getIndustryDistribution,
  getRegionDistribution,
  getDailyUserTrend,
  getDailyDiagnosisTrend,
} from '@/lib/database/dashboard-queries';

export async function GET() {
  try {
    const [languages, levels, industries, regions, trend, usageTrend] = await Promise.all([
      getUsersByLanguage(),
      getJapaneseLevelDistribution(),
      getIndustryDistribution(),
      getRegionDistribution(),
      getDailyUserTrend(30),
      getDailyDiagnosisTrend(30),
    ]);

    return NextResponse.json({
      languages,
      levels,
      industries,
      regions,
      trend,
      usageTrend,
    });
  } catch (error) {
    console.error('Dashboard analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
