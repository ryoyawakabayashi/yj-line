// =====================================================
// アップル歯科 Narrowcast配信スクリプト（多言語対応）
// Usage:
//   npx tsx scripts/narrowcast_apple_dental.ts test           # テストユーザーにEN送信
//   npx tsx scripts/narrowcast_apple_dental.ts test ja        # テストユーザーにJA送信
//   npx tsx scripts/narrowcast_apple_dental.ts send           # 本番Narrowcast(EN=デフォルト)
//   npx tsx scripts/narrowcast_apple_dental.ts send-by-lang   # 言語別Push配信
//   npx tsx scripts/narrowcast_apple_dental.ts stats          # 言語別ユーザー数確認
// =====================================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// --- 環境変数読み込み ---
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env.local.bak') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 設定 ---
const CAMPAIGN_ID = 'apple_dental_kansai_20260216';
const TEST_USER_ID = 'U5a8086602d24ea0d50bb64c5244d36eb';
const DESTINATION_URL = 'https://www.yolo-japan.com/ja/recruit/survey/details/465';
const IMAGE_FILE = path.resolve(__dirname, '../アップル歯科様_LINE配信用吹き出し画像_20260216.png');
const BUCKET_NAME = 'card-images';

// LIFF設定
const LIFF_ID = '2006973060-cAgpaZ0y';
const LIFF_URL_BASE = `https://liff.line.me/${LIFF_ID}`;
const ENABLE_LIFF_REDIRECT = process.env.ENABLE_LIFF_REDIRECT !== 'false';

// ターゲティング: 関西6府県 (滋賀, 京都, 大阪, 兵庫, 奈良, 和歌山)
const AREA_CODES = ['jp_25', 'jp_26', 'jp_27', 'jp_28', 'jp_29', 'jp_30'];

// =====================================================
// 多言語メッセージ
// =====================================================

type LangCode = 'en' | 'ja' | 'ko' | 'zh' | 'vi';

const MESSAGES: Record<LangCode, { text: string; altText: string; actionLabel: string }> = {
  en: {
    text: `[Osaka] Reward: ¥5,500 (Survey Response)
Recruiting dental cleaning quality monitors at a dental clinic! Limited to 50 people✨

Would you like to try teeth cleaning using the new Airflow technology?

Airflow cleaning uses powder particles sprayed on teeth with a jet of water and air to remove stains and dirt from the tooth surface.

Limited to people aged 20 and over living in Osaka, Kyoto, Hyogo, Nara, Wakayama, or Shiga!

[Monitor Period Ends]
May 29, 2026

Check the details here!👇`,
    altText: 'Dental Cleaning Monitor Recruitment - Details here',
    actionLabel: 'View Details',
  },
  ja: {
    text: `【大阪】報酬5,500円（アンケート回答）\u3000
歯科医院で歯のクリーニング品質のモニター募集！限定50名✨

新技術のエアフローを使った歯のクリーニングを試しませんか？

エアフロークリーニングは、パウダー粒子を水と空気のジェット噴射で歯に吹き付け、
歯の表面に付着した着色（ステイン）と汚れを除去する方法です。

20歳以上で、大阪府、京都府、兵庫県、奈良県、
和歌山県、滋賀県に住んでいる方限定です！

【体験モニター終了予定】
2026年5月29日

詳細はこちらをチェック！👇`,
    altText: '歯科クリーニングモニター募集 - 詳細はこちら',
    actionLabel: '詳細を見る',
  },
  ko: {
    text: `[오사카] 보수: 5,500엔 (설문 응답)
치과 클리닝 품질 모니터 모집! 50명 한정✨

새로운 에어플로우 기술을 사용한 치아 클리닝을 체험해 보시겠습니까?

에어플로우 클리닝은 파우더 입자를 물과 공기의 제트 분사로 치아에 뿌려 치아 표면의 착색(스테인)과 오염을 제거하는 방법입니다.

20세 이상, 오사카부, 교토부, 효고현, 나라현, 와카야마현, 시가현에 거주하는 분 한정!

[체험 모니터 종료 예정]
2026년 5월 29일

자세한 내용은 여기를 확인하세요!👇`,
    altText: '치과 클리닝 모니터 모집 - 자세히 보기',
    actionLabel: '자세히 보기',
  },
  zh: {
    text: `【大阪】报酬5,500日元（问卷回答）
招募牙科诊所牙齿清洁质量体验官！限定50名✨

想体验使用新技术气流洁牙吗？

气流洁牙是通过水和空气的喷射将粉末颗粒喷到牙齿上，去除牙齿表面附着的色素（茶渍等）和污垢的方法。

仅限20岁以上、居住在大阪府、京都府、兵库县、奈良县、和歌山县、滋贺县的人士！

【体验活动截止日期】
2026年5月29日

详情请点击查看！👇`,
    altText: '牙科清洁体验官招募 - 详情',
    actionLabel: '查看详情',
  },
  vi: {
    text: `[Osaka] Thù lao: 5.500 yên (Trả lời khảo sát)
Tuyển người trải nghiệm chất lượng vệ sinh răng tại phòng khám nha khoa! Giới hạn 50 người✨

Bạn có muốn thử làm sạch răng bằng công nghệ Airflow mới không?

Vệ sinh Airflow sử dụng các hạt bột phun lên răng bằng tia nước và không khí để loại bỏ vết ố (stain) và bẩn trên bề mặt răng.

Chỉ dành cho người từ 20 tuổi trở lên sống tại Osaka, Kyoto, Hyogo, Nara, Wakayama hoặc Shiga!

[Thời hạn kết thúc]
Ngày 29 tháng 5 năm 2026

Xem chi tiết tại đây!👇`,
    altText: 'Tuyển người trải nghiệm vệ sinh răng - Chi tiết',
    actionLabel: 'Xem chi tiết',
  },
};

// =====================================================
// ユーティリティ
// =====================================================

function generateCampaignToken(campaignId: string): string {
  return crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 8);
}

function buildTrackingUrl(url: string, campaignToken: string, campaignId: string): string {
  const redirectUrl = `${APP_BASE_URL}/api/r/${campaignToken}?url=${encodeURIComponent(url)}&campaign=${encodeURIComponent(campaignId)}`;
  if (ENABLE_LIFF_REDIRECT) {
    return `${LIFF_URL_BASE}#url=${encodeURIComponent(redirectUrl)}`;
  }
  return redirectUrl;
}

// =====================================================
// 画像アップロード
// =====================================================

async function uploadImage(): Promise<string> {
  console.log('📤 画像アップロード中...');

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    console.log('  バケット作成中:', BUCKET_NAME);
    await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  }

  const fileBuffer = fs.readFileSync(IMAGE_FILE);
  const fileName = `narrowcast/${CAMPAIGN_ID}.png`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`画像アップロード失敗: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  const imageUrl = publicUrlData.publicUrl;
  console.log('✅ 画像アップロード完了:', imageUrl);
  return imageUrl;
}

// =====================================================
// メッセージ構築（言語別）
// =====================================================

function buildMessages(imageUrl: string, trackingUrl: string, lang: LangCode = 'en'): any[] {
  const msg = MESSAGES[lang];

  const textMsg = {
    type: 'text',
    text: msg.text,
  };

  const imageMsg = {
    type: 'flex',
    altText: msg.altText,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'image',
            url: imageUrl,
            size: 'full',
            aspectRatio: '1:1',
            aspectMode: 'cover',
            action: {
              type: 'uri',
              label: msg.actionLabel,
              uri: trackingUrl,
            },
          },
        ],
        paddingAll: '0px',
      },
    },
  };

  return [textMsg, imageMsg];
}

// =====================================================
// キャンペーントークンDB登録
// =====================================================

async function registerCampaignToken(campaignToken: string): Promise<void> {
  const { error } = await supabase
    .from('tracking_tokens')
    .upsert(
      {
        token: campaignToken,
        user_id: `campaign:${CAMPAIGN_ID}`,
        url_type: 'narrowcast',
        destination_url: DESTINATION_URL,
      },
      { onConflict: 'token' }
    );

  if (error) {
    console.error('⚠️ キャンペーントークン登録エラー:', error);
  } else {
    console.log('✅ キャンペーントークン登録:', { campaignToken, CAMPAIGN_ID });
  }
}

// =====================================================
// DBから言語別ユーザーID取得
// =====================================================

async function getUsersByLang(): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('user_status')
    .select('user_id, lang');

  if (error) {
    console.error('❌ ユーザー取得エラー:', error);
    return {};
  }

  const groups: Record<string, string[]> = {};
  for (const row of data || []) {
    const lang = row.lang || 'en';
    if (!groups[lang]) groups[lang] = [];
    groups[lang].push(row.user_id);
  }

  return groups;
}

// =====================================================
// テスト送信 (Push)
// =====================================================

async function sendTest(messages: any[], lang: LangCode): Promise<void> {
  console.log(`\n📨 テスト送信 [${lang.toUpperCase()}]: ${TEST_USER_ID}`);

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: TEST_USER_ID,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`テスト送信失敗: ${response.status} ${errorText}`);
  }

  console.log('✅ テスト送信成功！LINEで確認してください。');
}

// =====================================================
// 本番Narrowcast送信（デフォルト: EN）
// =====================================================

async function sendNarrowcast(messages: any[]): Promise<void> {
  console.log('\n📡 Narrowcast送信中 [EN=デフォルト]...');
  console.log('  エリア:', AREA_CODES);
  console.log('  年齢: 20歳以上');

  const narrowcastBody = {
    messages,
    filter: {
      demographic: {
        type: 'operator',
        and: [
          { type: 'age', gte: 'age_20' },
          { type: 'area', oneOf: AREA_CODES },
        ],
      },
    },
    limit: { upToRemainingQuota: true },
  };

  const response = await fetch('https://api.line.me/v2/bot/message/narrowcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(narrowcastBody),
  });

  const requestId = response.headers.get('x-line-request-id');

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Narrowcast失敗: ${response.status} ${errorText}`);
  }

  console.log('✅ Narrowcast送信受付!');
  console.log('  requestId:', requestId);
}

// =====================================================
// 言語別Push配信（Multicast）
// =====================================================

async function sendByLanguage(imageUrl: string, trackingUrl: string): Promise<void> {
  console.log('\n📡 言語別配信 開始...');

  const usersByLang = await getUsersByLang();

  console.log('\n📊 言語別ユーザー数:');
  const langOrder: LangCode[] = ['en', 'ja', 'ko', 'zh', 'vi'];
  for (const lang of langOrder) {
    const count = usersByLang[lang]?.length || 0;
    console.log(`  ${lang.toUpperCase()}: ${count}人`);
  }

  // その他の言語
  const otherLangs = Object.keys(usersByLang).filter((l) => !langOrder.includes(l as LangCode));
  if (otherLangs.length > 0) {
    for (const lang of otherLangs) {
      console.log(`  ${lang.toUpperCase()}: ${usersByLang[lang].length}人 → ENで配信`);
    }
  }

  // 言語ごとにMulticast送信
  for (const lang of langOrder) {
    const userIds = usersByLang[lang] || [];
    if (userIds.length === 0) continue;

    const messages = buildMessages(imageUrl, trackingUrl, lang);

    // LINE Multicast APIは最大500人まで
    const BATCH_SIZE = 500;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      console.log(`\n📨 [${lang.toUpperCase()}] 送信中... (${i + 1}〜${i + batch.length} / ${userIds.length}人)`);

      const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: batch,
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  ❌ [${lang.toUpperCase()}] 送信失敗: ${response.status} ${errorText}`);
      } else {
        console.log(`  ✅ [${lang.toUpperCase()}] ${batch.length}人に送信完了`);
      }

      // レート制限対策: バッチ間に少し待つ
      if (i + BATCH_SIZE < userIds.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  // その他の言語はENで送信
  for (const lang of otherLangs) {
    const userIds = usersByLang[lang];
    if (!userIds || userIds.length === 0) continue;

    const messages = buildMessages(imageUrl, trackingUrl, 'en');
    const BATCH_SIZE = 500;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      console.log(`\n📨 [${lang.toUpperCase()}→EN] 送信中... (${batch.length}人)`);

      const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to: batch, messages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  ❌ 送信失敗: ${response.status} ${errorText}`);
      } else {
        console.log(`  ✅ ${batch.length}人に送信完了`);
      }
    }
  }
}

// =====================================================
// メイン
// =====================================================

async function main() {
  const mode = process.argv[2];
  const langArg = (process.argv[3] || 'en') as LangCode;

  if (!mode || !['test', 'send', 'send-by-lang', 'stats'].includes(mode)) {
    console.log('Usage:');
    console.log('  npx tsx scripts/narrowcast_apple_dental.ts test [lang]      # テスト送信 (default: en)');
    console.log('  npx tsx scripts/narrowcast_apple_dental.ts send             # 本番Narrowcast (EN)');
    console.log('  npx tsx scripts/narrowcast_apple_dental.ts send-by-lang     # 言語別Push配信');
    console.log('  npx tsx scripts/narrowcast_apple_dental.ts stats            # 言語別ユーザー数');
    console.log('');
    console.log('Languages: en (default), ja, ko, zh, vi');
    process.exit(1);
  }

  // statsモードは画像不要
  if (mode === 'stats') {
    const usersByLang = await getUsersByLang();
    console.log('\n📊 言語別ユーザー数:');
    let total = 0;
    for (const [lang, users] of Object.entries(usersByLang).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${lang.toUpperCase()}: ${users.length}人`);
      total += users.length;
    }
    console.log(`  ─────────`);
    console.log(`  合計: ${total}人`);
    return;
  }

  // 環境変数チェック
  if (!LINE_ACCESS_TOKEN) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定');
  if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL が未設定');

  console.log('='.repeat(50));
  console.log(`アップル歯科 Narrowcast配信 [${mode.toUpperCase()}]`);
  console.log('='.repeat(50));

  // 1. 画像アップロード
  const imageUrl = await uploadImage();

  // 2. キャンペーントークン生成 & DB登録
  const campaignToken = generateCampaignToken(CAMPAIGN_ID);
  await registerCampaignToken(campaignToken);

  // 3. トラッキングURL構築
  const trackingUrl = buildTrackingUrl(DESTINATION_URL, campaignToken, CAMPAIGN_ID);
  console.log('🔗 トラッキングURL:', trackingUrl);

  // 4. 送信
  if (mode === 'test') {
    const validLang = Object.keys(MESSAGES).includes(langArg) ? langArg : 'en';
    const messages = buildMessages(imageUrl, trackingUrl, validLang);
    console.log(`📝 メッセージ言語: ${validLang.toUpperCase()}, メッセージ数: ${messages.length}`);
    await sendTest(messages, validLang);
  } else if (mode === 'send') {
    const messages = buildMessages(imageUrl, trackingUrl, 'en');
    console.log(`📝 メッセージ言語: EN (デフォルト), メッセージ数: ${messages.length}`);
    await sendNarrowcast(messages);
  } else if (mode === 'send-by-lang') {
    await sendByLanguage(imageUrl, trackingUrl);
  }

  console.log('\n✨ 完了');
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
