// =====================================================
// テスト送信API
// テキスト + Flex Message カードを指定ユーザーに送信
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line/client';
import { processUrl } from '@/lib/tracking/url-processor';
import { supabase } from '@/lib/database/supabase';

const IMAGE_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';

/**
 * POST /api/broadcast/test-send
 * Body: { userId, userIdPrefix?, textMessage, card }
 *
 * userIdPrefix を指定した場合、DBから前方一致でユーザーIDを検索
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { userId } = body;
    const { userIdPrefix, textMessage, card } = body;

    // userIdPrefixが指定されている場合、DBから検索
    if (!userId && userIdPrefix) {
      const { data, error } = await supabase
        .from('conversation_state')
        .select('user_id')
        .like('user_id', `${userIdPrefix}%`)
        .limit(5);

      if (error) {
        return NextResponse.json(
          { success: false, error: `DB検索エラー: ${error.message}` },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { success: false, error: `ユーザーが見つかりません: ${userIdPrefix}*` },
          { status: 404 }
        );
      }

      // 複数見つかった場合はリストを返す
      if (data.length > 1) {
        return NextResponse.json({
          success: false,
          error: '複数のユーザーが見つかりました。正確なuserIdを指定してください。',
          candidates: data.map((d) => d.user_id),
        });
      }

      userId = data[0].user_id;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId または userIdPrefix が必要です' },
        { status: 400 }
      );
    }

    // メッセージ配列を構築
    const messages: any[] = [];

    // テキストメッセージ
    if (textMessage) {
      messages.push({
        type: 'text',
        text: textMessage,
      });
    }

    // カードタイプ Flex Message
    if (card) {
      // URLトラッキング処理
      let actionUrl = card.actionUrl;
      if (actionUrl) {
        actionUrl = await processUrl(actionUrl, userId, 'flow');
      }

      const flexMessage = buildJobCardFlex({
        altText: card.altText || 'Recommended job for you',
        imageUrl: card.imageUrl ? `${IMAGE_BASE_URL}${card.imageUrl}` : undefined,
        title: card.title,
        address: card.address,
        workHours: card.workHours,
        actionLabel: card.actionLabel || 'View Details',
        actionUrl,
      });

      messages.push(flexMessage);
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メッセージが空です' },
        { status: 400 }
      );
    }

    // Push送信
    const result = await pushMessage(userId, messages);

    if (result) {
      return NextResponse.json({
        success: true,
        message: `送信成功: ${userId}`,
        messageCount: messages.length,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Push送信失敗' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ テスト送信エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 求人カードFlex Messageを構築
 */
function buildJobCardFlex(params: {
  altText: string;
  imageUrl?: string;
  title: string;
  address?: string;
  workHours?: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const bodyContents: any[] = [
    {
      type: 'text',
      text: params.title,
      weight: 'bold',
      size: 'xl',
      wrap: true,
    },
  ];

  // 住所
  if (params.address) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '📍',
          size: 'sm',
          flex: 0,
        },
        {
          type: 'text',
          text: params.address,
          size: 'sm',
          color: '#666666',
          wrap: true,
          flex: 1,
          margin: 'sm',
        },
      ],
      margin: 'lg',
    });
  }

  // 勤務時間
  if (params.workHours) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '🕐',
          size: 'sm',
          flex: 0,
        },
        {
          type: 'text',
          text: params.workHours,
          size: 'sm',
          color: '#666666',
          wrap: true,
          flex: 1,
          margin: 'sm',
        },
      ],
      margin: 'md',
    });
  }

  const bubble: any = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: 'xl',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: params.actionLabel,
            uri: params.actionUrl,
          },
          style: 'link',
          height: 'md',
        },
      ],
    },
  };

  // Hero画像
  if (params.imageUrl) {
    bubble.hero = {
      type: 'image',
      url: params.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    };
  }

  return {
    type: 'flex',
    altText: params.altText,
    contents: bubble,
  };
}
