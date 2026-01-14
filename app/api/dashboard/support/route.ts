import { NextRequest, NextResponse } from 'next/server';
import { getRecentTickets } from '@/lib/database/support-queries';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';

export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = checkDashboardAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const tickets = await getRecentTickets(100);

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        userId: t.userId,
        ticketType: t.ticketType,
        service: t.service,
        status: t.status,
        priority: t.priority || 'normal',
        category: t.category,
        content: t.content,
        aiSummary: t.aiSummary,
        userDisplayName: t.userDisplayName,
        userLang: t.userLang,
        humanTakeover: t.humanTakeover || false,
        humanOperatorName: t.humanOperatorName,
        escalatedAt: t.escalatedAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
