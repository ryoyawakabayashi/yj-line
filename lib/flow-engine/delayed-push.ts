// =====================================================
// 遅延メッセージ送信ユーティリティ
// setTimeout の代わりに別APIリクエストで遅延送信する
// （Vercelサーバーレス関数のタイムアウト回避）
// =====================================================

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';

/**
 * 遅延後にメッセージを送信する（fire-and-forget）
 * 別のAPIエンドポイントにリクエストを投げて、そちらで sleep + pushMessage を実行
 */
export function scheduleDelayedPush(
  userId: string,
  messages: any[],
  delaySec: number
): void {
  const secret = (process.env.LINE_CHANNEL_SECRET || '').slice(0, 16);
  const url = `${APP_BASE_URL}/api/flow/delayed-push`;

  console.log(`⏱️  scheduleDelayedPush: ${delaySec}秒後に${messages.length}件送信予約`);

  // fire-and-forget: awaitしない（現在の関数をブロックしない）
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, messages, delaySec, secret }),
  }).catch((err) => {
    console.error('❌ scheduleDelayedPush fetch エラー:', err);
  });
}
