// =====================================================
// URL Processor - 全URLをトラッキングURL化 + LIFF外部ブラウザ対応
// =====================================================

import { generateTrackingUrl } from './token';

/**
 * 追跡対象ドメイン
 */
const TRACKABLE_DOMAINS = [
  'wom.yolo-japan.com',
  'www.yolo-japan.co.jp',
  'www.yolo-japan.com',
  'home.yolo-japan.com',
];

/**
 * LIFF URL（LINE内でLIFFとして起動するためのURL）
 * エンドポイント直開きではなく、liff.line.me 経由で開く必要がある
 */
const LIFF_ID = '2006973060-cAgpaZ0y';
const LIFF_URL_BASE = `https://liff.line.me/${LIFF_ID}`;

/**
 * LIFFリダイレクトを有効にするかどうか
 */
const ENABLE_LIFF_REDIRECT = process.env.ENABLE_LIFF_REDIRECT !== 'false';

/**
 * URLソース種別
 */
export type UrlSourceType =
  | 'diagnosis'           // 診断結果から
  | 'support'             // サポートAIから（汎用）
  | 'support_yolo_japan'  // サポート - YOLO JAPAN
  | 'support_yolo_home'   // サポート - YOLO HOME
  | 'support_yolo_discover' // サポート - YOLO DISCOVER
  | 'autochat'            // AIトーク（自由会話）から
  | 'richmenu'            // リッチメニューから
  | 'faq'                 // FAQ応答から
  | 'followup'            // フォローアップから
  | '10apply_boost'       // 10件応募促進リマインダーから
  | 'flow';              // フロー実行エンジンから

/**
 * テキスト内のURLを検出する正規表現
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]\u3000-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]+/gi;

/**
 * テキスト内のURLをトラッキングURL化
 * @param text - 変換対象テキスト
 * @param userId - LINEユーザーID
 * @param sourceType - URLのソース種別
 * @returns トラッキングURL化されたテキスト
 */
export async function processUrlsInText(
  text: string,
  userId: string,
  sourceType: UrlSourceType = 'support',
  campaign?: string
): Promise<string> {
  // URLを抽出
  const urls = text.match(URL_REGEX);

  if (!urls || urls.length === 0) {
    return text;
  }

  // 重複を除去
  const uniqueUrls = [...new Set(urls)];

  let processedText = text;

  for (const originalUrl of uniqueUrls) {
    try {
      // トラッキング対象のドメインかチェック
      const urlObj = new URL(originalUrl);
      const isTrackable = TRACKABLE_DOMAINS.includes(urlObj.hostname);

      if (isTrackable) {
        // トラッキングURLを生成（campaignがなければsourceTypeからデフォルト生成）
        const campaignName = campaign || `line_chatbot_${sourceType}`;
        let trackingUrl = await generateTrackingUrl(userId, originalUrl, sourceType, campaignName);

        // LIFF URL経由にする（外部ブラウザで開く）
        // liff.line.me 経由で開くとクエリパラメータが消えるため、ハッシュを使用
        if (ENABLE_LIFF_REDIRECT) {
          trackingUrl = `${LIFF_URL_BASE}#url=${encodeURIComponent(trackingUrl)}`;
        }

        // デバッグ: URL処理ログ
        console.log('🔄 URL処理:', {
          original: originalUrl,
          tracked: trackingUrl,
          sourceType,
          liffRedirect: ENABLE_LIFF_REDIRECT
        });
        // テキスト内のURLを置換
        processedText = processedText.split(originalUrl).join(trackingUrl);
      }
    } catch (error) {
      // 不正なURLはスキップ
      console.warn(`⚠️ URL処理スキップ: ${originalUrl}`, error);
    }
  }

  return processedText;
}

/**
 * 単一URLをトラッキングURL化
 * @param url - 変換対象URL
 * @param userId - LINEユーザーID
 * @param sourceType - URLのソース種別
 * @returns トラッキングURL
 */
export async function processUrl(
  url: string,
  userId: string,
  sourceType: UrlSourceType,
  campaign?: string
): Promise<string> {
  try {
    const urlObj = new URL(url);
    const isTrackable = TRACKABLE_DOMAINS.includes(urlObj.hostname);

    if (isTrackable) {
      const campaignName = campaign || `line_chatbot_${sourceType}`;
      let trackingUrl = await generateTrackingUrl(userId, url, sourceType, campaignName);

      // LIFF URL経由にする（外部ブラウザで開く）
      // liff.line.me 経由で開くとクエリパラメータが消えるため、ハッシュを使用
      if (ENABLE_LIFF_REDIRECT) {
        trackingUrl = `${LIFF_URL_BASE}#url=${encodeURIComponent(trackingUrl)}`;
      }

      return trackingUrl;
    }
  } catch (error) {
    console.warn(`⚠️ URL処理スキップ: ${url}`, error);
  }

  return url;
}

/**
 * テキスト内にトラッキング対象URLが含まれているかチェック
 */
export function hasTrackableUrls(text: string): boolean {
  const urls = text.match(URL_REGEX);
  if (!urls) return false;

  return urls.some((url) => {
    try {
      const urlObj = new URL(url);
      return TRACKABLE_DOMAINS.includes(urlObj.hostname);
    } catch {
      return false;
    }
  });
}

/**
 * トラッキング対象ドメインを追加
 */
export function addTrackableDomain(domain: string): void {
  if (!TRACKABLE_DOMAINS.includes(domain)) {
    TRACKABLE_DOMAINS.push(domain);
  }
}
