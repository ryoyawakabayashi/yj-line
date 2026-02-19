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
  // VERCEL_PROJECT_PRODUCTION_URL（本番ドメイン）を優先
  // VERCEL_URL はデプロイ固有URLなので本番ドメインと異なる場合がある
  const appBaseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';
  const secret = (process.env.LINE_CHANNEL_SECRET || '').slice(0, 16);
  const url = `${appBaseUrl}/api/flow/delayed-push`;

  console.log(`⏱️  scheduleDelayedPush: ${delaySec}秒後に${messages.length}件送信予約 → ${url}`);
  console.log(`⏱️  ENV: VERCEL_PROJECT_PRODUCTION_URL=${process.env.VERCEL_PROJECT_PRODUCTION_URL || '(未設定)'}, VERCEL_URL=${process.env.VERCEL_URL || '(未設定)'}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, messages, delaySec, secret }),
    });
    const body = await res.text();
    console.log(`⏱️  scheduleDelayedPush: レスポンス ${res.status} body=${body}`);
  } catch (err) {
    console.error('❌ scheduleDelayedPush fetch エラー:', err);
  }
}
