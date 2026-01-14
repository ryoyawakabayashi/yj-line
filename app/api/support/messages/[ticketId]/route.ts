import { NextRequest, NextResponse } from 'next/server';
import { getTicketMessages } from '@/lib/database/support-queries';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  // 認証チェック
  const auth = checkDashboardAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const { ticketId } = await params;
    const messages = await getTicketMessages(ticketId);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        ticketId: m.ticketId,
        role: m.role,
        content: m.content,
        senderName: m.senderName,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
