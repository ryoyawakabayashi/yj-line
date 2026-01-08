// =====================================================
// URL Processor - 全URLをトラッキングURL化
// =====================================================

import { generateTrackingUrl } from './token';

/**
 * 追跡対象ドメイン
 */
const TRACKABLE_DOMAINS = [
  'yolo-japan.com',
  'www.yolo-japan.com',
  'yolojapan.co.jp',
  'www.yolojapan.co.jp',
];

/**
 * URLソース種別
 */
export type UrlSourceType =
  | 'diagnosis'    // 診断結果から
  | 'support'      // サポートAIから
  | 'autochat'     // AIトーク（自由会話）から
  | 'richmenu'     // リッチメニューから
  | 'faq'          // FAQ応答から
  | 'followup';    // フォローアップから

/**
 * テキスト内のURLを検出する正規表現
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

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
  sourceType: UrlSourceType = 'support'
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
      const isTrackable = TRACKABLE_DOMAINS.some(
        (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (isTrackable) {
        // トラッキングURLを生成
        const trackingUrl = await generateTrackingUrl(userId, originalUrl, sourceType);
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
  sourceType: UrlSourceType
): Promise<string> {
  try {
    const urlObj = new URL(url);
    const isTrackable = TRACKABLE_DOMAINS.some(
      (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (isTrackable) {
      return await generateTrackingUrl(userId, url, sourceType);
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
      return TRACKABLE_DOMAINS.some(
        (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
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
