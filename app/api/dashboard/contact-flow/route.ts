import { NextRequest, NextResponse } from 'next/server';
import {
  getContactFlows,
  getContactFlowQuestionRanking,
  getContactFlowTrend,
  getContactFlowKpi,
} from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const flowId = request.nextUrl.searchParams.get('flowId') || undefined;

    const [ranking, trend, kpi, flows] = await Promise.all([
      getContactFlowQuestionRanking(flowId),
      getContactFlowTrend(30),
      getContactFlowKpi(),
      getContactFlows(),
    ]);

    return NextResponse.json({ ranking, trend, kpi, flows });
  } catch (error) {
    console.error('Contact flow analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact flow analytics' },
      { status: 500 }
    );
  }
}
