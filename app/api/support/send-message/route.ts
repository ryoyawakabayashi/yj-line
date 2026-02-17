import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, saveMessage } from '@/lib/database/support-queries';
import { pushMessage } from '@/lib/line/client';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';

export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await checkDashboardAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const { ticketId, message, operatorName, quickReplies } = await request.json();

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'ticketId and message are required' },
        { status: 400 }
      );
    }

    // チケットからユーザーIDを取得
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // 有人対応モードでない場合はエラー
    if (!ticket.humanTakeover) {
      return NextResponse.json(
        { error: 'Human takeover is not enabled' },
        { status: 400 }
      );
    }

    // LINEにメッセージを送信
    const lineMessage: any = { type: 'text', text: message };
    if (Array.isArray(quickReplies) && quickReplies.length > 0) {
      lineMessage.quickReply = {
        items: quickReplies.map((qr: { label: string; text: string }) => ({
          type: 'action',
          action: { type: 'message', label: qr.label, text: qr.text },
        })),
      };
    }
    const success = await pushMessage(ticket.userId, [lineMessage]);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send LINE message' },
        { status: 500 }
      );
    }

    // DBに保存
    await saveMessage(ticketId, 'operator', message, operatorName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
