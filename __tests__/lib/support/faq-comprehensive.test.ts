import { describe, it, expect } from 'vitest';
import { SERVICE_FAQ, COMMON_FAQ, searchFAQ } from '@/lib/support/faq';

// UTMパラメータ
const UTM = '?utm_source=line&utm_medium=inquiry&utm_campaign=line_inquiry';

describe('FAQ Comprehensive Tests - 60 Templates', () => {
  describe('YOLO_HOME FAQs (6 items)', () => {
    const yoloHomeFaqs = SERVICE_FAQ.YOLO_HOME;

    it('should have exactly 6 FAQs', () => {
      expect(yoloHomeFaqs.length).toBe(6);
    });

    it('all FAQs should have Q&A format', () => {
      yoloHomeFaqs.forEach((faq) => {
        expect(faq).toContain('Q:');
        expect(faq).toContain('A:');
      });
    });

    it('should find FAQ for "YOLO HOME" question', () => {
      const results = searchFAQ('YOLO HOME', 'YOLO_HOME');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "入居審査" question', () => {
      const results = searchFAQ('入居審査', 'YOLO_HOME');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('在留カード');
    });

    it('should find FAQ for "契約期間" question', () => {
      const results = searchFAQ('契約期間', 'YOLO_HOME');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('1ヶ月');
    });

    it('should find FAQ for "家具付き" question', () => {
      const results = searchFAQ('家具付き', 'YOLO_HOME');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "物件を紹介" question', () => {
      const results = searchFAQ('物件を紹介', 'YOLO_HOME');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('お問い合わせボタン');
    });
  });

  describe('YOLO_DISCOVER FAQs (21 items)', () => {
    const yoloDiscoverFaqs = SERVICE_FAQ.YOLO_DISCOVER;

    it('should have exactly 21 FAQs', () => {
      expect(yoloDiscoverFaqs.length).toBe(21);
    });

    it('all FAQs should have Q&A format', () => {
      yoloDiscoverFaqs.forEach((faq) => {
        expect(faq).toContain('Q:');
        expect(faq).toContain('A:');
      });
    });

    // キャンセル・日程変更関連
    it('should find FAQ for "キャンセルしたい" question', () => {
      const results = searchFAQ('キャンセルしたい', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('メッセージ');
    });

    it('should find FAQ for "体験日の変更" question', () => {
      const results = searchFAQ('体験日の変更', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('承認前');
    });

    it('should find FAQ for "緊急連絡先" question', () => {
      const results = searchFAQ('緊急連絡先', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    // 完了報告関連
    it('should find FAQ for "完了報告" question', () => {
      const results = searchFAQ('完了報告', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "投稿期間" question', () => {
      const results = searchFAQ('投稿', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.includes('半年間'))).toBe(true);
    });

    // 応募関連
    it('should find FAQ for "応募の流れ" question', () => {
      const results = searchFAQ('応募の流れ', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "応募したのに落とされた" question', () => {
      const results = searchFAQ('落とされた', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('不採用理由');
    });

    // その他
    it('should find FAQ for "チェックイン" question', () => {
      const results = searchFAQ('チェックイン', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "就労資格" question', () => {
      const results = searchFAQ('就労資格', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "掲載したい" question', () => {
      const results = searchFAQ('掲載したい', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "在留カード登録" question', () => {
      const results = searchFAQ('在留カード', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('スマートフォン');
    });

    it('should find FAQ for "エラー" question', () => {
      const results = searchFAQ('エラー', 'YOLO_DISCOVER');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('障害報告フォーム');
    });
  });

  describe('YOLO_JAPAN FAQs (30 items)', () => {
    const yoloJapanFaqs = SERVICE_FAQ.YOLO_JAPAN;

    it('should have exactly 30 FAQs', () => {
      expect(yoloJapanFaqs.length).toBe(30);
    });

    it('all FAQs should have Q&A format', () => {
      yoloJapanFaqs.forEach((faq) => {
        expect(faq).toContain('Q:');
        expect(faq).toContain('A:');
      });
    });

    // アカウント関連
    it('should find FAQ for "求人に応募" question', () => {
      const results = searchFAQ('求人に応募', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('会員登録');
    });

    it('should find FAQ for "海外から応募" question', () => {
      const results = searchFAQ('海外から応募', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('できません');
    });

    it('should find FAQ for "パスワードを忘れ" question', () => {
      const results = searchFAQ('パスワード', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('リセット');
    });

    it('should find FAQ for "メルマガ停止" question', () => {
      const results = searchFAQ('メルマガ', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "退会" question', () => {
      const results = searchFAQ('退会', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('withdraw');
    });

    it('should find FAQ for "動画をアップ" question', () => {
      const results = searchFAQ('動画', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('introduction-video');
    });

    it('should find FAQ for "勝手に辞退" question', () => {
      const results = searchFAQ('勝手に辞退', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('自動的にキャンセル');
    });

    it('should find FAQ for "不採用理由" question', () => {
      const results = searchFAQ('不採用', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('開示されない');
    });

    it('should find FAQ for "スカウト" question', () => {
      const results = searchFAQ('スカウト', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('採用担当者');
      // FAQには「ボットや自動システムではありません」という否定形で含まれている
      expect(results[0]).toContain('ではありません');
    });

    it('should find FAQ for "応募後の連絡" question', () => {
      const results = searchFAQ('応募後', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('14日');
    });

    it('should find FAQ for "メールアドレス変更" question', () => {
      const results = searchFAQ('メールアドレス', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('yolostaff@yolo-japan.co.jp');
    });

    it('should find FAQ for "ログインできない" question', () => {
      const results = searchFAQ('ログイン', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('Google');
    });

    it('should find FAQ for "二重国籍" question', () => {
      const results = searchFAQ('二重国籍', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('在留カードの登録は必要ありません');
    });

    it('should find FAQ for "運転免許" question', () => {
      const results = searchFAQ('運転免許', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('drivers-license');
    });

    it('should find FAQ for "資格" question', () => {
      const results = searchFAQ('資格', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    // 面接関連
    it('should find FAQ for "面接日" question', () => {
      const results = searchFAQ('面接日', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "オンライン面接" question', () => {
      const results = searchFAQ('オンライン面接', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find FAQ for "面接キャンセル" question', () => {
      const results = searchFAQ('面接をキャンセル', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('お断りする');
    });

    it('should find FAQ for "面接場所" question', () => {
      const results = searchFAQ('面接場所', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    // ビザ関連
    it('should find FAQ for "観光ビザ" question', () => {
      const results = searchFAQ('観光ビザ', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('働くことはできません');
    });

    it('should find FAQ for "SOFA" question', () => {
      const results = searchFAQ('SOFA', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('基地の中');
    });

    it('should find FAQ for "ビザサポート" question', () => {
      const results = searchFAQ('ビザサポート', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
    });

    // その他
    it('should find FAQ for "アンケート当選" question', () => {
      const results = searchFAQ('アンケート', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('winner');
    });

    it('should find FAQ for "個人情報" question', () => {
      const results = searchFAQ('個人情報', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('privacy_policy');
    });

    it('should find FAQ for "求人掲載" question', () => {
      const results = searchFAQ('求人掲載', 'YOLO_JAPAN');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('lp.yolo-work.com');
    });
  });

  describe('COMMON FAQs (3 items)', () => {
    it('should have exactly 3 common FAQs', () => {
      expect(COMMON_FAQ.length).toBe(3);
    });

    it('all common FAQs should have Q&A format', () => {
      COMMON_FAQ.forEach((faq) => {
        expect(faq).toContain('Q:');
        expect(faq).toContain('A:');
      });
    });

    it('should find FAQ for "返信" question', () => {
      const results = searchFAQ('返信');
      expect(results.length).toBeGreaterThan(0);
      // 共通FAQに「1-2営業日」の返信に関するFAQがある
      expect(results.some((r) => r.includes('1-2営業日'))).toBe(true);
    });

    it('should find FAQ for "日本語以外" question', () => {
      const results = searchFAQ('日本語以外');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('英語');
    });

    it('should find FAQ for "電話" question', () => {
      const results = searchFAQ('電話');
      expect(results.length).toBeGreaterThan(0);
      // 共通FAQに電話問い合わせについてのFAQがある
      expect(results.some((r) => r.includes('受け付けておりません'))).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('all YOLO_DISCOVER URLs should have UTM parameters', () => {
      SERVICE_FAQ.YOLO_DISCOVER.forEach((faq) => {
        const urlMatches = faq.match(/https:\/\/[^\s]+/g) || [];
        urlMatches.forEach((url) => {
          // Google Formsは除外
          if (!url.includes('docs.google.com')) {
            expect(url).toContain(UTM);
          }
        });
      });
    });

    it('all YOLO_JAPAN URLs should have UTM parameters', () => {
      SERVICE_FAQ.YOLO_JAPAN.forEach((faq) => {
        const urlMatches = faq.match(/https:\/\/[^\s]+/g) || [];
        urlMatches.forEach((url) => {
          // Google Forms and government sites excluded
          if (!url.includes('docs.google.com') && !url.includes('moj.go.jp')) {
            expect(url).toContain(UTM);
          }
        });
      });
    });
  });

  describe('Total FAQ Count', () => {
    it('should have exactly 60 FAQs in total', () => {
      const totalFaqs =
        SERVICE_FAQ.YOLO_HOME.length +
        SERVICE_FAQ.YOLO_DISCOVER.length +
        SERVICE_FAQ.YOLO_JAPAN.length +
        COMMON_FAQ.length;

      // YOLO_HOME: 6, YOLO_DISCOVER: 21, YOLO_JAPAN: 30, COMMON: 3 = 60
      expect(totalFaqs).toBe(60);
    });
  });

  describe('Search Cross-Service', () => {
    it('should find "パスワード" across all services', () => {
      const results = searchFAQ('パスワード');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find "在留カード" across all services', () => {
      const results = searchFAQ('在留カード');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent keyword', () => {
      const results = searchFAQ('存在しないキーワード12345xyz');
      expect(results.length).toBe(0);
    });
  });
});
