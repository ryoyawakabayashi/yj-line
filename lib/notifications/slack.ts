// =====================================================
// Slack Notification Module for Support Escalation
// =====================================================

const SLACK_WEBHOOK_URL = process.env.SLACK_SUPPORT_WEBHOOK_URL;

// 本番ダッシュボードURL
const DASHBOARD_BASE_URL = 'https://line-bot-next-ryoyawakabayashis-projects.vercel.app';

export interface SlackNotification {
  ticketId: string;
  userId: string;
  userDisplayName?: string;
  userLang?: string;
  service?: string;
  summary: string;  // 日本語要約
  originalMessage?: string;  // ユーザーの元メッセージ
  reason: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dashboardUrl?: string;
}

// サービス名を日本語で表示
const SERVICE_NAMES: Record<string, string> = {
  YOLO_JAPAN: '🏢 YOLO JAPAN（求人）',
  YOLO_DISCOVER: '🎯 YOLO DISCOVER（体験）',
  YOLO_HOME: '🏠 YOLO HOME（住居）',
};

// 言語コードを日本語で表示
const LANG_NAMES: Record<string, string> = {
  ja: '🇯🇵 日本語',
  en: '🇺🇸 英語',
  ko: '🇰🇷 韓国語',
  zh: '🇨🇳 中国語',
  vi: '🇻🇳 ベトナム語',
};

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

  // 本番ダッシュボードURLを使用
  const dashboardUrl = data.dashboardUrl || `${DASHBOARD_BASE_URL}/dashboard/support/${data.ticketId}`;

  // サービス名を日本語で表示
  const serviceName = data.service ? (SERVICE_NAMES[data.service] || data.service) : '❓ 未選択';

  // 言語を日本語で表示
  const langName = data.userLang ? (LANG_NAMES[data.userLang] || data.userLang) : '不明';

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} LINE問い合わせ - 対応が必要です`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*👤 ユーザー:*\n${data.userDisplayName || 'Unknown'}`,
          },
          {
            type: 'mrkdwn',
            text: `*🏷️ 担当サービス:*\n${serviceName}`,
          },
          {
            type: 'mrkdwn',
            text: `*🌐 使用言語:*\n${langName}`,
          },
          {
            type: 'mrkdwn',
            text: `*⚡ 優先度:*\n${priority.toUpperCase()}`,
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
          text: `*📝 問い合わせ内容（日本語要約）:*\n${data.summary || '要約なし'}`,
        },
      },
      ...(data.originalMessage ? [{
        type: 'context' as const,
        elements: [
          {
            type: 'mrkdwn' as const,
            text: `💬 _元メッセージ: "${data.originalMessage.slice(0, 100)}${data.originalMessage.length > 100 ? '...' : ''}"_`,
          },
        ],
      }] : []),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔍 理由:*\n${data.reason}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '💬 対応する',
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
        fallback: `LINE問い合わせ: ${data.summary}`,
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
  userLang?: string;
  service?: string;
  summary: string;
  originalMessage?: string;
  reason: string;
}): Promise<boolean> {
  return sendSlackNotification({
    ticketId: params.ticketId,
    userId: params.userId,
    userDisplayName: params.userDisplayName,
    userLang: params.userLang,
    service: params.service,
    summary: params.summary,
    originalMessage: params.originalMessage,
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
