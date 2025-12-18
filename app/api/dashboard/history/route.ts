import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveUserHistory,
  getDiagnosisHistory,
  getUserRegistrationHistory,
  getFollowEventHistory,
} from '@/lib/database/dashboard-queries';
import { getDailyConversionTrends } from '@/lib/ga4/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { error: 'startDate, endDate, and type are required' },
        { status: 400 }
      );
    }

    let data;

    switch (type) {
      case 'activeUsers':
        data = await getActiveUserHistory(startDate, endDate);
        break;

      case 'diagnosis':
        data = await getDiagnosisHistory(startDate, endDate);
        break;

      case 'userRegistration':
        data = await getUserRegistrationHistory(startDate, endDate);
        break;

      case 'yjRegistration':
      case 'yjApplication': {
        // GA4からYJ登録/応募の日別データを取得
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const ga4Data = await getDailyConversionTrends(days);

        // 期間内のデータのみフィルタリング
        data = ga4Data
          .filter((d) => d.date >= startDate && d.date <= endDate)
          .map((d) => ({
            date: d.date,
            count: type === 'yjRegistration' ? d.yjRegistrations : d.yjApplications,
          }));
        break;
      }

      case 'lineFollow':
        data = await getFollowEventHistory(startDate, endDate);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Valid types: activeUsers, diagnosis, userRegistration, yjRegistration, yjApplication, lineFollow' },
          { status: 400 }
        );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('History API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history data' },
      { status: 500 }
    );
  }
}
