// =====================================================
// Slack Notification Module for Support Escalation
// =====================================================

const SLACK_WEBHOOK_URL = process.env.SLACK_SUPPORT_WEBHOOK_URL;

export interface SlackNotification {
  ticketId: string;
  userId: string;
  userDisplayName?: string;
  service?: string;
  summary: string;
  reason: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dashboardUrl?: string;
}

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: '🚨',
  high: '🔴',
  normal: '🟡',
  low: '🟢',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#FF0000',
  high: '#FF6B6B',
  normal: '#FFD93D',
  low: '#6BCB77',
};

/**
 * Slack通知を送信
 */
export async function sendSlackNotification(
  data: SlackNotification
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('⚠️ SLACK_SUPPORT_WEBHOOK_URL not configured - skipping notification');
    return false;
  }

  const priority = data.priority || 'normal';
  const emoji = PRIORITY_EMOJI[priority];
  const color = PRIORITY_COLOR[priority];

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const dashboardUrl = data.dashboardUrl || `${baseUrl}/dashboard/support/${data.ticketId}`;

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} サポートチケット要対応`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*ユーザー:*\n${data.userDisplayName || data.userId}`,
          },
          {
            type: 'mrkdwn',
            text: `*サービス:*\n${data.service || '未選択'}`,
          },
          {
            type: 'mrkdwn',
            text: `*優先度:*\n${priority.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*チケットID:*\n${data.ticketId.slice(0, 8)}...`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*要約:*\n${data.summary || '要約なし'}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*エスカレーション理由:*\n${data.reason}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 詳細を見る',
              emoji: true,
            },
            url: dashboardUrl,
            style: 'primary',
          },
        ],
      },
    ],
    attachments: [
      {
        color: color,
        fallback: `サポートチケット要対応: ${data.summary}`,
      },
    ],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('❌ Slack通知送信失敗:', response.status, await response.text());
      return false;
    }

    console.log(`✅ Slack通知送信成功: ${data.ticketId}`);
    return true;
  } catch (error) {
    console.error('❌ Slack通知エラー:', error);
    return false;
  }
}

/**
 * AIエスカレーション通知（AIが対応できない場合）
 */
export async function notifyEscalation(params: {
  ticketId: string;
  userId: string;
  userDisplayName?: string;
  service?: string;
  summary: string;
  reason: string;
}): Promise<boolean> {
  return sendSlackNotification({
    ticketId: params.ticketId,
    userId: params.userId,
    userDisplayName: params.userDisplayName,
    service: params.service,
    summary: params.summary,
    reason: params.reason,
    priority: 'high',
  });
}

/**
 * 有人対応開始通知
 */
export async function notifyHumanTakeoverStart(
  ticketId: string,
  operatorName: string,
  userDisplayName?: string
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('⚠️ SLACK_SUPPORT_WEBHOOK_URL not configured');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const message = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `👤 *${operatorName}* が有人対応を開始しました\nユーザー: ${userDisplayName || 'Unknown'}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'チャットを見る',
          },
          url: `${baseUrl}/dashboard/support/${ticketId}`,
        },
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return true;
  } catch (error) {
    console.error('❌ 有人対応開始通知エラー:', error);
    return false;
  }
}

/**
 * チケット解決通知
 */
export async function notifyTicketResolved(
  ticketId: string,
  resolvedBy: string
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    return false;
  }

  const message = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ チケット \`${ticketId.slice(0, 8)}\` が *${resolvedBy}* により解決されました`,
        },
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return true;
  } catch (error) {
    console.error('❌ 解決通知エラー:', error);
    return false;
  }
}
