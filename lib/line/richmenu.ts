import { config } from '../config';

export async function linkRichMenu(
  userId: string,
  richMenuId: string
): Promise<boolean> {
  if (!richMenuId || !userId) {
    console.error('❌ richMenuId または userId が未定義', { userId, richMenuId });
    return false;
  }

  const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`;
  console.log('🔗 linkRichMenu 呼び出し:', { userId, richMenuId, url });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('❌ リッチメニューリンクエラー:', {
        status: response.status,
        body: text,
      });
      return false;
    }

    console.log('✅ リッチメニュー切り替え成功:', {
      status: response.status,
      body: text || '(empty)',
    });
    return true;
  } catch (error) {
    console.error('❌ linkRichMenu エラー:', error);
    return false;
  }
}
