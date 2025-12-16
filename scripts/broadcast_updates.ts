import { createClient } from '@supabase/supabase-js';
import { config } from '../lib/config';
import { pushMessage } from '../lib/line/client';

// 単発の言語別配信スクリプト。
// 環境変数: SUPABASE_SERVICE_ROLE_KEY (書き込み可のサービスロール),
//           LINE_CHANNEL_ACCESS_TOKEN (lib/config 経由で参照)

type LangKey = 'ja' | 'en' | 'zh' | 'ko' | 'vi';

const messages: Record<LangKey, string> = {
  ja: `【📣 アップデートのお知らせ 📣】
・メニューを5言語に対応し、利便性を向上しました 🌏✨

【🔧 バグ修正のお知らせ 🔧】
・選択した業界で検索結果が正しく表示されない不具合を修正しました。

💡ご希望の業界で検索できなかった方は、もう一度お試しください 🔍

ご利用の言語は、画面下部メニューの 「ことばをえらぶ」 から選択できます。
引き続き YOLO JAPAN Official LINE をよろしくお願いいたします 🙇‍♂️`,
  en: `【📣 Update Notice 📣】
・The menu is now available in 5 languages to enhance usability 🌏✨

【🔧 Bug Fix Notice 🔧】
・We have fixed an issue where search results were not displayed correctly based on the selected industry.

💡If you were unable to search using your desired industry, please try again 🔍

You can select your preferred language from “Language” in the bottom menu.
Thank you for continuing to use YOLO JAPAN Official LINE 🙏`,
  zh: `【📣 更新通知 📣】
・菜单现已支持 5 种语言，进一步提升了使用体验 🌏✨

【🔧 问题修复通知 🔧】
・已修复选择行业后搜索结果无法正确显示的问题。

💡如果之前无法按您希望的行业进行搜索，请再次尝试 🔍

您可以在底部菜单中的 “语言选择” 选择想要使用的语言。
感谢您一直以来对 YOLO JAPAN Official LINE 的支持 🙏`,
  ko: `【📣 업데이트 안내 📣】
・메뉴가 5개 언어를 지원하도록 개선되었습니다 🌏✨

【🔧 버그 수정 안내 🔧】
・선택한 업종에 따라 검색 결과가 올바르게 표시되지 않던 문제를 수정했습니다.

💡원하시는 업종으로 검색이 되지 않았던 분들은 다시 한번 이용해 주세요 🔍

하단 메뉴의 ‘언어 선택’ 에서 원하는 언어를 선택하실 수 있습니다.
앞으로도 YOLO JAPAN Official LINE을 이용해 주셔서 감사합니다 🙏`,
  vi: `【📣 Thông báo cập nhật 📣】
・Menu hiện đã hỗ trợ 5 ngôn ngữ để nâng cao trải nghiệm người dùng 🌏✨

【🔧 Thông báo sửa lỗi 🔧】
・Đã khắc phục lỗi khiến kết quả tìm kiếm không hiển thị đúng theo ngành đã chọn.

💡Nếu bạn đã không thể tìm kiếm theo ngành mong muốn trước đây, vui lòng thử lại 🔍

Bạn có thể chọn ngôn ngữ mong muốn tại mục “Ngôn ngữ” trong menu phía dưới.
Cảm ơn bạn đã tiếp tục sử dụng YOLO JAPAN Official LINE 🙏`,
};

async function main() {
  const supabase = createClient(
    config.supabase.url,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const summary: Record<LangKey, { attempted: number; success: number; failed: number }> = {
    ja: { attempted: 0, success: 0, failed: 0 },
    en: { attempted: 0, success: 0, failed: 0 },
    zh: { attempted: 0, success: 0, failed: 0 },
    ko: { attempted: 0, success: 0, failed: 0 },
    vi: { attempted: 0, success: 0, failed: 0 },
  };

  for (const lang of Object.keys(messages) as LangKey[]) {
    const { data, error } = await supabase
      .from('user_status')
      .select('user_id')
      .eq('lang', lang);

    if (error) {
      console.error(`❌ Supabase 取得エラー (${lang}):`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`ℹ️ 配信対象なし (${lang})`);
      continue;
    }

    const userIds = data.map((row: any) => row.user_id).filter(Boolean);
    const text = messages[lang];

    console.log(`▶️ 配信開始 lang=${lang} 件数=${userIds.length}`);

    // 単発配信なのでシンプルに逐次 push
    for (const userId of userIds) {
      summary[lang].attempted += 1;
      const ok = await pushMessage(userId, [{ type: 'text', text }]);
      if (!ok) {
        console.error(`❌ push 失敗 userId=${userId} lang=${lang}`);
        summary[lang].failed += 1;
      } else {
        summary[lang].success += 1;
      }
    }

    console.log(`✅ 配信完了 lang=${lang}`);
  }

  // サマリ出力
  console.log('=== 配信サマリ ===');
  (Object.keys(summary) as LangKey[]).forEach((lang) => {
    const s = summary[lang];
    console.log(
      `lang=${lang} attempted=${s.attempted} success=${s.success} failed=${s.failed}`
    );
  });
}

main().catch((err) => {
  console.error('❌ 配信スクリプトエラー:', err);
  process.exit(1);
});
