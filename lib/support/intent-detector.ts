// =====================================================
// Intent Detector - インテント検出と情報抽出
// =====================================================

import { ServiceType } from '@/types/support';
import {
  Category,
  getCategoriesForService,
  findCategoryById,
} from './categories';

/**
 * 検出されたインテント
 */
export interface DetectedIntent {
  categoryId: string | null;
  categoryPath: string[];  // カテゴリーのパス（例: ['job_search', 'ai_search']）
  confidence: number;
  extractedData: ExtractedData;
  isSpecific: boolean;  // 具体的な情報が含まれているか
}

/**
 * 抽出されたデータ
 */
export interface ExtractedData {
  prefecture?: string;
  region?: string;
  industry?: string;
  workingDays?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
}

// =====================================================
// 都道府県マッピング
// =====================================================

interface PrefectureInfo {
  id: string;
  region: string;
  keywords: string[];
}

const PREFECTURES: PrefectureInfo[] = [
  // 北海道・東北
  { id: 'hokkaido', region: 'hokkaido_tohoku', keywords: ['北海道', '札幌', 'hokkaido', 'sapporo'] },
  { id: 'aomori', region: 'hokkaido_tohoku', keywords: ['青森', 'aomori'] },
  { id: 'iwate', region: 'hokkaido_tohoku', keywords: ['岩手', '盛岡', 'iwate', 'morioka'] },
  { id: 'miyagi', region: 'hokkaido_tohoku', keywords: ['宮城', '仙台', 'miyagi', 'sendai'] },
  { id: 'akita', region: 'hokkaido_tohoku', keywords: ['秋田', 'akita'] },
  { id: 'yamagata', region: 'hokkaido_tohoku', keywords: ['山形', 'yamagata'] },
  { id: 'fukushima', region: 'hokkaido_tohoku', keywords: ['福島', 'fukushima'] },

  // 関東
  { id: 'tokyo', region: 'kanto', keywords: ['東京', '新宿', '渋谷', '池袋', '品川', 'tokyo', 'shinjuku', 'shibuya', 'ikebukuro'] },
  { id: 'kanagawa', region: 'kanto', keywords: ['神奈川', '横浜', '川崎', 'kanagawa', 'yokohama', 'kawasaki'] },
  { id: 'saitama', region: 'kanto', keywords: ['埼玉', '大宮', 'さいたま', 'saitama', 'omiya'] },
  { id: 'chiba', region: 'kanto', keywords: ['千葉', 'chiba'] },
  { id: 'ibaraki', region: 'kanto', keywords: ['茨城', 'ibaraki'] },
  { id: 'tochigi', region: 'kanto', keywords: ['栃木', '宇都宮', 'tochigi', 'utsunomiya'] },
  { id: 'gunma', region: 'kanto', keywords: ['群馬', 'gunma'] },

  // 中部
  { id: 'niigata', region: 'chubu', keywords: ['新潟', 'niigata'] },
  { id: 'toyama', region: 'chubu', keywords: ['富山', 'toyama'] },
  { id: 'ishikawa', region: 'chubu', keywords: ['石川', '金沢', 'ishikawa', 'kanazawa'] },
  { id: 'fukui', region: 'chubu', keywords: ['福井', 'fukui'] },
  { id: 'yamanashi', region: 'chubu', keywords: ['山梨', '甲府', 'yamanashi', 'kofu'] },
  { id: 'nagano', region: 'chubu', keywords: ['長野', 'nagano'] },
  { id: 'gifu', region: 'chubu', keywords: ['岐阜', 'gifu'] },
  { id: 'shizuoka', region: 'chubu', keywords: ['静岡', '浜松', 'shizuoka', 'hamamatsu'] },
  { id: 'aichi', region: 'chubu', keywords: ['愛知', '名古屋', 'aichi', 'nagoya'] },

  // 近畿
  { id: 'osaka', region: 'kinki', keywords: ['大阪', '梅田', '難波', '心斎橋', 'osaka', 'umeda', 'namba'] },
  { id: 'kyoto', region: 'kinki', keywords: ['京都', 'kyoto'] },
  { id: 'hyogo', region: 'kinki', keywords: ['兵庫', '神戸', '姫路', 'hyogo', 'kobe', 'himeji'] },
  { id: 'nara', region: 'kinki', keywords: ['奈良', 'nara'] },
  { id: 'shiga', region: 'kinki', keywords: ['滋賀', '大津', 'shiga', 'otsu'] },
  { id: 'wakayama', region: 'kinki', keywords: ['和歌山', 'wakayama'] },
  { id: 'mie', region: 'kinki', keywords: ['三重', '津', 'mie'] },

  // 中国
  { id: 'hiroshima', region: 'chugoku', keywords: ['広島', 'hiroshima'] },
  { id: 'okayama', region: 'chugoku', keywords: ['岡山', 'okayama'] },
  { id: 'yamaguchi', region: 'chugoku', keywords: ['山口', '下関', 'yamaguchi', 'shimonoseki'] },
  { id: 'shimane', region: 'chugoku', keywords: ['島根', '松江', 'shimane', 'matsue'] },
  { id: 'tottori', region: 'chugoku', keywords: ['鳥取', 'tottori'] },

  // 四国
  { id: 'ehime', region: 'shikoku', keywords: ['愛媛', '松山', 'ehime', 'matsuyama'] },
  { id: 'kagawa', region: 'shikoku', keywords: ['香川', '高松', 'kagawa', 'takamatsu'] },
  { id: 'tokushima', region: 'shikoku', keywords: ['徳島', 'tokushima'] },
  { id: 'kochi', region: 'shikoku', keywords: ['高知', 'kochi'] },

  // 九州・沖縄
  { id: 'fukuoka', region: 'kyushu_okinawa', keywords: ['福岡', '博多', '北九州', 'fukuoka', 'hakata', 'kitakyushu'] },
  { id: 'saga', region: 'kyushu_okinawa', keywords: ['佐賀', 'saga'] },
  { id: 'nagasaki', region: 'kyushu_okinawa', keywords: ['長崎', 'nagasaki'] },
  { id: 'kumamoto', region: 'kyushu_okinawa', keywords: ['熊本', 'kumamoto'] },
  { id: 'oita', region: 'kyushu_okinawa', keywords: ['大分', 'oita'] },
  { id: 'miyazaki', region: 'kyushu_okinawa', keywords: ['宮崎', 'miyazaki'] },
  { id: 'kagoshima', region: 'kyushu_okinawa', keywords: ['鹿児島', 'kagoshima'] },
  { id: 'okinawa', region: 'kyushu_okinawa', keywords: ['沖縄', '那覇', 'okinawa', 'naha'] },
];

// =====================================================
// 業種マッピング
// =====================================================

interface IndustryInfo {
  id: string;
  keywords: string[];
}

const INDUSTRIES: IndustryInfo[] = [
  { id: 'food', keywords: ['飲食', 'レストラン', 'カフェ', '居酒屋', 'ラーメン', '料理', 'キッチン', 'ホール', 'restaurant', 'cafe', 'food', '厨房'] },
  { id: 'retail', keywords: ['販売', '接客', 'コンビニ', 'スーパー', 'ドラッグストア', 'アパレル', '店員', 'retail', 'sales', 'shop'] },
  { id: 'hotel', keywords: ['ホテル', '旅館', '宿泊', 'フロント', 'hotel', 'inn', 'hospitality'] },
  { id: 'factory', keywords: ['工場', '製造', '倉庫', '物流', '仕分け', 'ピッキング', 'factory', 'warehouse', 'manufacturing'] },
  { id: 'cleaning', keywords: ['清掃', '掃除', 'クリーニング', 'ハウスキーピング', 'cleaning', 'housekeeping'] },
  { id: 'office', keywords: ['オフィス', '事務', '翻訳', '通訳', 'データ入力', 'office', 'translation', 'interpreter'] },
  { id: 'delivery', keywords: ['配達', 'デリバリー', '宅配', 'ドライバー', 'delivery', 'driver'] },
  { id: 'it', keywords: ['IT', 'エンジニア', 'プログラマー', 'web', 'システム', 'engineer', 'programmer'] },
  { id: 'care', keywords: ['介護', '福祉', 'ケア', 'care', 'nursing', 'welfare'] },
  { id: 'construction', keywords: ['建設', '建築', '土木', '現場', 'construction', 'building'] },
  { id: 'agriculture', keywords: ['農業', '農家', '農園', 'farm', 'agriculture'] },
];

// =====================================================
// 緊急度マッピング
// =====================================================

const URGENCY_KEYWORDS = {
  immediate: ['すぐ', '今すぐ', '急ぎ', '至急', '急いで', '明日から', '今週', 'immediately', 'urgent', 'asap', 'now'],
  soon: ['来週', '近いうち', 'そろそろ', 'soon', 'next week'],
  flexible: ['いつでも', '特に急がない', 'flexible', 'anytime'],
};

// =====================================================
// インテント検出関数
// =====================================================

/**
 * メッセージからインテントを検出
 */
export function detectIntent(
  message: string,
  service: ServiceType | undefined
): DetectedIntent {
  const normalizedMessage = message.toLowerCase();
  const categories = getCategoriesForService(service);

  // 1. カテゴリーをマッチング
  const { categoryId, categoryPath, confidence } = matchCategory(normalizedMessage, categories);

  // 2. 具体的な情報を抽出
  const extractedData = extractData(message);

  // 3. 具体性を判定（抽出データがあれば具体的）
  const isSpecific = !!(
    extractedData.prefecture ||
    extractedData.industry ||
    extractedData.urgency
  );

  return {
    categoryId,
    categoryPath,
    confidence,
    extractedData,
    isSpecific,
  };
}

/**
 * カテゴリーをマッチング（再帰的に子カテゴリーも検索）
 */
function matchCategory(
  message: string,
  categories: Category[],
  parentPath: string[] = []
): { categoryId: string | null; categoryPath: string[]; confidence: number } {
  let bestMatch: { categoryId: string | null; categoryPath: string[]; confidence: number } = {
    categoryId: null,
    categoryPath: [],
    confidence: 0,
  };

  for (const category of categories) {
    // キーワードマッチングでスコア計算
    const matchedKeywords = category.keywords.filter((kw) =>
      message.includes(kw.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      const currentPath = [...parentPath, category.id];
      const confidence = Math.min(matchedKeywords.length * 0.3, 1.0);

      // 子カテゴリーがあれば再帰的に検索
      if (category.children && category.children.length > 0) {
        const childMatch = matchCategory(message, category.children, currentPath);

        // 子カテゴリーでより良いマッチがあればそれを使用
        if (childMatch.confidence > 0) {
          if (childMatch.confidence > bestMatch.confidence) {
            bestMatch = childMatch;
          }
          continue;
        }
      }

      // このカテゴリーがベストマッチなら更新
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          categoryId: category.id,
          categoryPath: currentPath,
          confidence,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * メッセージから具体的な情報を抽出
 */
function extractData(message: string): ExtractedData {
  const data: ExtractedData = {};

  // 都道府県を抽出
  for (const pref of PREFECTURES) {
    if (pref.keywords.some((kw) => message.includes(kw))) {
      data.prefecture = pref.id;
      data.region = pref.region;
      break;
    }
  }

  // 業種を抽出
  const lowerMessage = message.toLowerCase();
  for (const industry of INDUSTRIES) {
    if (industry.keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()))) {
      data.industry = industry.id;
      break;
    }
  }

  // 緊急度を抽出
  for (const [urgency, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()))) {
      data.urgency = urgency as ExtractedData['urgency'];
      break;
    }
  }

  return data;
}

/**
 * 抽象的なメッセージかどうかを判定
 */
export function isAbstractMessage(message: string): boolean {
  // 完全一致パターン
  const exactPatterns = [
    /^(助けて|たすけて|help|ヘルプ)$/i,
    /^(困って|困った|こまって)$/i,
    /^(わからない|分からない|わかんない)$/i,
    /^(質問|しつもん|question)$/i,
    /^(どうすれば|どうしたら)$/i,
    /^(教えて|おしえて)$/i,
  ];

  // 部分一致パターン（一般的な問い合わせ）
  const partialPatterns = [
    /どんな.*(サポート|ヘルプ|手伝い|できる|機能)/i,
    /何.*(できる|サポート|手伝|対応)/i,
    /(サポート|ヘルプ).*(内容|種類|どんな|何)/i,
    /what.*(can|do|support|help)/i,
    /how.*(help|support|assist)/i,
    /(できること|対応できること)/i,
  ];

  const trimmedMessage = message.trim();

  // 完全一致チェック
  if (exactPatterns.some((pattern) => pattern.test(trimmedMessage))) {
    return true;
  }

  // 部分一致チェック
  return partialPatterns.some((pattern) => pattern.test(trimmedMessage));
}

/**
 * カテゴリーIDからカテゴリーを取得
 */
export function getCategoryById(
  categoryId: string,
  service: ServiceType | undefined
): Category | null {
  const categories = getCategoriesForService(service);
  return findCategoryById(categories, categoryId);
}

/**
 * 都道府県IDから地域を取得
 */
export function getRegionByPrefecture(prefectureId: string): string | undefined {
  const pref = PREFECTURES.find((p) => p.id === prefectureId);
  return pref?.region;
}

/**
 * 抽出データがAI診断に十分かどうかを判定
 */
export function hasEnoughDataForDiagnosis(data: ExtractedData): boolean {
  // 最低限、地域または都道府県があればOK
  return !!(data.prefecture || data.region);
}
