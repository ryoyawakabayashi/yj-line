import { NextResponse } from 'next/server';
import {
  getCareerDiagnosisTrend,
  getCareerTypeDistribution,
  getCareerTypeConversion,
  getCareerDiagnosisKpi,
  getCareerDiagnosisUsers,
} from '@/lib/database/dashboard-queries';

export async function GET() {
  try {
    const [trend, distribution, conversion, kpi, users] = await Promise.all([
      getCareerDiagnosisTrend(30),
      getCareerTypeDistribution(),
      getCareerTypeConversion(),
      getCareerDiagnosisKpi(),
      getCareerDiagnosisUsers(100),
    ]);

    return NextResponse.json({ trend, distribution, conversion, kpi, users });
  } catch (error) {
    console.error('Career diagnosis analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch career diagnosis analytics' },
      { status: 500 }
    );
  }
}
