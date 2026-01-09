/**
 * AI応答評価テスト
 *
 * このテストは実際のOpenAI APIを呼び出してAIが正しく応答するかを検証します。
 * 環境変数 OPENAI_API_KEY が必要です。
 *
 * 実行方法:
 * OPENAI_API_KEY=xxx npm run test:eval
 */

import { describe, it, expect, beforeAll } from 'vitest';
import OpenAI from 'openai';
import { generateSupportSystemPrompt } from '@/lib/support/faq';

// テストケース定義
interface TestCase {
  id: string;
  service: 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN';
  ticketType: 'feedback' | 'bug';
  userMessage: string;
  mustContain: string[];      // 応答に必ず含まれるべきキーワード
  mustNotContain: string[];   // 応答に含まれてはいけないキーワード
  description: string;
}

const TEST_CASES: TestCase[] = [
  // YOLO_JAPAN - スカウト関連
  {
    id: 'scout-bot-question',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: 'スカウトメッセージってボットが自動で送ってるんですか？',
    mustContain: ['採用担当者', '直接'],
    mustNotContain: ['自動で送', 'ボットが送'],
    description: 'スカウトがボットではないことを正しく説明するか',
  },
  {
    id: 'rejection-reason',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: '応募したけど不採用になりました。理由を教えてください。',
    mustContain: ['開示', 'お伝え'],
    mustNotContain: [],
    description: '不採用理由が開示されないことを説明するか',
  },
  {
    id: 'auto-cancel',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: '勝手に応募がキャンセルされてたんですけど、バグですか？',
    mustContain: ['自動'],
    mustNotContain: ['バグ', '不具合です'],
    description: '自動キャンセルが仕様であることを説明するか',
  },
  {
    id: 'password-reset',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: 'パスワードを忘れました',
    mustContain: ['リセット', 'yolo-japan.com'],
    mustNotContain: [],
    description: 'パスワードリセットの方法とURLを案内するか',
  },
  {
    id: 'tourist-visa',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: '観光ビザで働けますか？',
    mustContain: ['できません', '働く'],
    mustNotContain: ['できます', '可能です'],
    description: '観光ビザでは働けないことを明確に伝えるか',
  },
  {
    id: 'withdraw',
    service: 'YOLO_JAPAN',
    ticketType: 'bug',
    userMessage: '退会したいです',
    mustContain: ['withdraw'],
    mustNotContain: [],
    description: '退会URLを正しく案内するか',
  },

  // YOLO_DISCOVER - キャンセル関連
  {
    id: 'cancel-project',
    service: 'YOLO_DISCOVER',
    ticketType: 'bug',
    userMessage: 'プロジェクトをキャンセルしたいです',
    mustContain: ['メッセージ', 'プロジェクト'],
    mustNotContain: [],
    description: 'キャンセル方法を案内するか',
  },
  {
    id: 'completion-report',
    service: 'YOLO_DISCOVER',
    ticketType: 'bug',
    userMessage: '完了報告のやり方を教えてください',
    mustContain: ['wom.yolo-japan.com', 'active-projects'],
    mustNotContain: [],
    description: '完了報告URLを案内するか',
  },
  {
    id: 'post-duration',
    service: 'YOLO_DISCOVER',
    ticketType: 'bug',
    userMessage: 'SNS投稿っていつまで残しておけばいいですか？',
    mustContain: ['半年'],
    mustNotContain: [],
    description: '投稿保持期間（半年）を案内するか',
  },

  // YOLO_HOME
  {
    id: 'contract-period',
    service: 'YOLO_HOME',
    ticketType: 'bug',
    userMessage: '最短でどのくらいから契約できますか？',
    mustContain: ['1ヶ月'],
    mustNotContain: [],
    description: '最短契約期間を案内するか',
  },

  // 共通FAQ
  {
    id: 'phone-inquiry',
    service: 'YOLO_JAPAN',
    ticketType: 'feedback',
    userMessage: '電話で問い合わせできますか？',
    mustContain: ['受け付けて'],
    mustNotContain: ['できます', '電話番号は'],
    description: '電話問い合わせ不可を案内するか',
  },
];

describe('AI Response Evaluation', () => {
  let openai: OpenAI;
  let skipTests = false;

  beforeAll(() => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY が設定されていないため、AI評価テストをスキップします');
      skipTests = true;
      return;
    }
    openai = new OpenAI({ apiKey });
  });

  // 各テストケースを実行
  TEST_CASES.forEach((testCase) => {
    it(`[${testCase.id}] ${testCase.description}`, async () => {
      if (skipTests) {
        console.log('⏭️ スキップ: OPENAI_API_KEY が未設定');
        return;
      }

      // システムプロンプト生成
      const systemPrompt = generateSupportSystemPrompt({
        ticketType: testCase.ticketType,
        service: testCase.service,
        lang: 'ja',
      });

      // AI応答を取得
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: testCase.userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3, // 再現性のため低めに
      });

      const aiResponse = completion.choices[0]?.message?.content || '';

      console.log(`\n📝 [${testCase.id}]`);
      console.log(`質問: ${testCase.userMessage}`);
      console.log(`応答: ${aiResponse}`);

      // 必須キーワードチェック
      testCase.mustContain.forEach((keyword) => {
        expect(
          aiResponse.includes(keyword),
          `応答に「${keyword}」が含まれていません\n応答: ${aiResponse}`
        ).toBe(true);
      });

      // 禁止キーワードチェック
      testCase.mustNotContain.forEach((keyword) => {
        expect(
          aiResponse.includes(keyword),
          `応答に禁止ワード「${keyword}」が含まれています\n応答: ${aiResponse}`
        ).toBe(false);
      });
    }, 30000); // タイムアウト30秒
  });

  // サマリーテスト
  it('should pass at least 90% of test cases', async () => {
    if (skipTests) {
      console.log('⏭️ スキップ: OPENAI_API_KEY が未設定');
      return;
    }

    let passed = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const testCase of TEST_CASES) {
      try {
        const systemPrompt = generateSupportSystemPrompt({
          ticketType: testCase.ticketType,
          service: testCase.service,
          lang: 'ja',
        });

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: testCase.userMessage },
          ],
          max_tokens: 300,
          temperature: 0.3,
        });

        const aiResponse = completion.choices[0]?.message?.content || '';

        let testPassed = true;

        // 必須キーワードチェック
        for (const keyword of testCase.mustContain) {
          if (!aiResponse.includes(keyword)) {
            testPassed = false;
            failures.push(`[${testCase.id}] 「${keyword}」が含まれていない`);
            break;
          }
        }

        // 禁止キーワードチェック
        for (const keyword of testCase.mustNotContain) {
          if (aiResponse.includes(keyword)) {
            testPassed = false;
            failures.push(`[${testCase.id}] 禁止ワード「${keyword}」が含まれている`);
            break;
          }
        }

        if (testPassed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        failures.push(`[${testCase.id}] API呼び出しエラー`);
      }
    }

    const passRate = (passed / TEST_CASES.length) * 100;

    console.log('\n========== AI応答評価結果 ==========');
    console.log(`✅ 成功: ${passed}/${TEST_CASES.length} (${passRate.toFixed(1)}%)`);
    console.log(`❌ 失敗: ${failed}/${TEST_CASES.length}`);
    if (failures.length > 0) {
      console.log('\n失敗詳細:');
      failures.forEach((f) => console.log(`  - ${f}`));
    }
    console.log('=====================================\n');

    expect(passRate).toBeGreaterThanOrEqual(90);
  }, 120000); // タイムアウト2分
});
