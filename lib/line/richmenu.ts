import { config } from '../config';

export async function linkRichMenu(
  userId: string,
  richMenuId: string
): Promise<boolean> {
  if (!richMenuId || !userId) {
    console.error('❌ richMenuId または userId が未定義');
    return false;
  }

  const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      console.error('❌ リッチメニュー切り替え失敗:', response.status);
      return false;
    }

    console.log('✅ リッチメニュー切り替え成功');
    return true;
  } catch (error) {
    console.error('❌ linkRichMenu エラー:', error);
    return false;
  }
}
