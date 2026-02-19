// =====================================================
// 遅延メッセージ送信ユーティリティ
// 別APIリクエストで遅延送信する
// （Vercelサーバーレス関数のタイムアウト回避）
// =====================================================

/**
 * 遅延後にメッセージを送信する
 * 別のAPIエンドポイントにリクエストを投げて、そちらで sleep + pushMessage を実行
 * ※ 必ず await して呼ぶこと（fire-and-forgetだとVercelで関数終了前にfetchが完了しない）
 */
export async function scheduleDelayedPush(
  userId: string,
  messages: any[],
  delaySec: number
): Promise<void> {
  // VERCEL_URL（Vercel自動設定）を優先、なければ APP_BASE_URL を使用
  const appBaseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';
  const secret = (process.env.LINE_CHANNEL_SECRET || '').slice(0, 16);
  const url = `${appBaseUrl}/api/flow/delayed-push`;

  console.log(`⏱️  scheduleDelayedPush: ${delaySec}秒後に${messages.length}件送信予約 → ${url}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, messages, delaySec, secret }),
    });
    console.log(`⏱️  scheduleDelayedPush: レスポンス ${res.status}`);
  } catch (err) {
    console.error('❌ scheduleDelayedPush fetch エラー:', err);
  }
}
