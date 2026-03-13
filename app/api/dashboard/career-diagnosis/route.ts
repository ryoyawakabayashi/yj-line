import { NextResponse } from 'next/server';
import {
  getCareerDiagnosisTrend,
  getCareerTypeDistribution,
  getCareerTypeConversion,
  getCareerDiagnosisKpi,
  getCareerDiagnosisUsers,
} from '@/lib/database/dashboard-queries';
import { syncGa4Conversions } from '@/lib/tracking/sync-ga4';

export async function GET() {
  try {
    // GA4のCVデータをapplication_logsに同期（バックグラウンド、失敗しても続行）
    await syncGa4Conversions(30).catch((err) =>
      console.error('GA4 CV同期エラー（続行）:', err)
    );

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
