import { NextRequest, NextResponse } from 'next/server';
import { getSupportStatsExtended } from '@/lib/database/support-queries';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';

export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = checkDashboardAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const stats = await getSupportStatsExtended();

    return NextResponse.json({
      totalTickets: stats.total_tickets || 0,
      openTickets: stats.open_tickets || 0,
      inProgressTickets: stats.in_progress_tickets || 0,
      resolvedTickets: stats.resolved_tickets || 0,
      escalatedTickets: stats.escalated_tickets || 0,
      humanTakeoverActive: stats.human_takeover_active || 0,
      todayTickets: stats.today_tickets || 0,
      feedbackCount: stats.feedback_count || 0,
      bugCount: stats.bug_count || 0,
      byService: stats.by_service || {},
      byCategory: stats.by_category || {},
    });
  } catch (error) {
    console.error('Failed to fetch support stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
