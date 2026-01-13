import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, toggleHumanTakeover, saveMessage } from '@/lib/database/support-queries';
import { pushMessage } from '@/lib/line/client';
import { notifyHumanTakeoverStart } from '@/lib/notifications/slack';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, enable, operatorName } = await request.json();

    if (!ticketId || enable === undefined) {
      return NextResponse.json(
        { error: 'ticketId and enable are required' },
        { status: 400 }
      );
    }

    // チケットを取得
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // 有人対応モードを切り替え
    const success = await toggleHumanTakeover(ticketId, enable, operatorName);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to toggle human takeover' },
        { status: 500 }
      );
    }

    // ユーザーに通知を送信
    if (enable) {
      // 有人対応開始メッセージ
      const messages: Record<string, string> = {
        ja: 'オペレーターに接続しました。少々お待ちください。',
        en: 'Connected to an operator. Please wait a moment.',
        ko: '상담원에게 연결되었습니다. 잠시만 기다려주세요.',
        zh: '已连接到客服人员。请稍等。',
        vi: 'Đã kết nối với nhân viên hỗ trợ. Vui lòng đợi.',
      };

      const lang = ticket.userLang || 'ja';
      const message = messages[lang] || messages.ja;

      await pushMessage(ticket.userId, [{
        type: 'text',
        text: message,
      }]);

      // システムメッセージとして記録
      await saveMessage(ticketId, 'system', `有人対応モードに切り替わりました (担当: ${operatorName || 'オペレーター'})`);

      // Slack通知
      await notifyHumanTakeoverStart(ticketId, operatorName || 'オペレーター', ticket.userDisplayName || undefined);
    } else {
      // AI対応復帰メッセージ
      const messages: Record<string, string> = {
        ja: 'ご対応ありがとうございました。引き続きAIがサポートいたします。',
        en: 'Thank you. AI will continue to assist you.',
        ko: '감사합니다. AI가 계속 도움을 드리겠습니다.',
        zh: '谢谢。AI将继续为您提供帮助。',
        vi: 'Cảm ơn bạn. AI sẽ tiếp tục hỗ trợ bạn.',
      };

      const lang = ticket.userLang || 'ja';
      const message = messages[lang] || messages.ja;

      await pushMessage(ticket.userId, [{
        type: 'text',
        text: message,
      }]);

      // システムメッセージとして記録
      await saveMessage(ticketId, 'system', 'AI対応モードに復帰しました');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to toggle takeover:', error);
    return NextResponse.json(
      { error: 'Failed to toggle takeover' },
      { status: 500 }
    );
  }
}
