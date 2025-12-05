import { config, LINE_API } from '../config';
import { LineMessage, QuickReplyItem } from '@/types/line';

export async function replyMessage(
  replyToken: string,
  messages: LineMessage | LineMessage[]
): Promise<boolean> {
  const messageArray = Array.isArray(messages) ? messages : [messages];

  if (messageArray.length > 5) {
    console.warn('⚠️ メッセージ数が5を超えています');
    messageArray.splice(5);
  }

  const payload = {
    replyToken,
    messages: messageArray,
  };

  try {
    const response = await fetch(LINE_API.REPLY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Reply Error: ${response.status} ${errorText}`);
      return false;
    }

    console.log('✅ Reply送信成功');
    return true;
  } catch (error) {
    console.error('❌ replyMessage エラー:', error);
    return false;
  }
}

export async function pushMessage(
  userId: string,
  messages: LineMessage | LineMessage[]
): Promise<boolean> {
  const messageArray = Array.isArray(messages) ? messages : [messages];

  const payload = {
    to: userId,
    messages: messageArray,
  };

  try {
    const response = await fetch(LINE_API.PUSH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Push Error: ${response.status} ${errorText}`);
      return false;
    }

    console.log('✅ Push送信成功');
    return true;
  } catch (error) {
    console.error('❌ pushMessage エラー:', error);
    return false;
  }
}

export async function showLoadingAnimation(
  userId: string,
  seconds: number = 3
): Promise<void> {
  const loadingSeconds = Math.max(1, Math.min(60, seconds));

  const payload = {
    chatId: userId,
    loadingSeconds,
  };

  try {
    await fetch(LINE_API.LOADING_ANIMATION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Loading Animation Error:', error);
  }
}

export function replyWithQuickReply(
  replyToken: string,
  text: string,
  quickReplyItems: QuickReplyItem[]
): Promise<boolean> {
  return replyMessage(replyToken, {
    type: 'text',
    text,
    quickReply: {
      items: quickReplyItems,
    },
  });
}

// リッチメニューをユーザーにリンク
export async function linkRichMenu(userId: string, richMenuId: string): Promise<void> {
  // テンプレートURLを実際の値に置き換え
  const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.line.channelAccessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ リッチメニューリンクエラー: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`✅ リッチメニューをリンク: ${richMenuId} -> ${userId}`);
  } catch (error) {
    console.error('❌ linkRichMenu エラー:', error);
    throw error;
  }
}
