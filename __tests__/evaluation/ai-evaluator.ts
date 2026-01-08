// =====================================================
// AI応答評価テストランナー
// 実際にOpenAI APIを呼び出してAI応答を評価
// =====================================================

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import OpenAI from 'openai';
import {
  TestCase,
  TestResult,
  TestSummary,
  ALL_TEST_CASES,
} from './test-cases';
import { generateSupportSystemPrompt } from '../../lib/support/faq';

// OpenAIクライアント（環境変数から取得）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 単一テストケースを評価
 */
export async function evaluateTestCase(testCase: TestCase): Promise<TestResult> {
  // システムプロンプトを生成
  const systemPrompt = generateSupportSystemPrompt({
    ticketType: testCase.category === 'bug' ? 'bug' : 'feedback',
    service: testCase.service || undefined,
    lang: 'ja',
  });

  // AIに問い合わせ
  let aiResponse = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: testCase.userInput },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    aiResponse = completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error(`❌ API呼び出しエラー (${testCase.id}):`, error);
    aiResponse = 'ERROR: API呼び出し失敗';
  }

  // 評価
  const result = evaluateResponse(testCase, aiResponse);

  return result;
}

/**
 * AI応答を評価
 */
function evaluateResponse(testCase: TestCase, aiResponse: string): TestResult {
  const lowerResponse = aiResponse.toLowerCase();

  // 必須キーワードのチェック
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  testCase.expectedKeywords.forEach((keyword) => {
    if (aiResponse.includes(keyword) || lowerResponse.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  // 禁止キーワードのチェック
  const foundForbiddenKeywords: string[] = [];
  if (testCase.forbiddenKeywords) {
    testCase.forbiddenKeywords.forEach((keyword) => {
      if (aiResponse.includes(keyword) || lowerResponse.includes(keyword.toLowerCase())) {
        foundForbiddenKeywords.push(keyword);
      }
    });
  }

  // URL存在チェック
  let urlFound = true;
  if (testCase.expectedUrl) {
    urlFound = aiResponse.includes(testCase.expectedUrl);
  }

  // スコア計算
  let score = 0;

  // キーワードマッチ（60点）
  const keywordScore =
    testCase.expectedKeywords.length > 0
      ? (matchedKeywords.length / testCase.expectedKeywords.length) * 60
      : 60;
  score += keywordScore;

  // 禁止キーワードなし（20点）
  if (foundForbiddenKeywords.length === 0) {
    score += 20;
  }

  // URL含む（20点）
  if (!testCase.expectedUrl || urlFound) {
    score += 20;
  }

  // 合否判定（80点以上で合格）
  const passed = score >= 80 && missingKeywords.length === 0 && foundForbiddenKeywords.length === 0;

  return {
    caseId: testCase.id,
    passed,
    userInput: testCase.userInput,
    aiResponse,
    matchedKeywords,
    missingKeywords,
    foundForbiddenKeywords,
    urlFound,
    score: Math.round(score),
  };
}

/**
 * 全テストケースを評価
 */
export async function runAllEvaluations(): Promise<TestSummary> {
  console.log(`\n🧪 AI応答評価テスト開始（${ALL_TEST_CASES.length}件）\n`);

  const results: TestResult[] = [];

  for (const testCase of ALL_TEST_CASES) {
    console.log(`📝 テスト実行中: ${testCase.id}`);

    const result = await evaluateTestCase(testCase);
    results.push(result);

    // 結果表示
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} (スコア: ${result.score}/100)`);

    if (!result.passed) {
      if (result.missingKeywords.length > 0) {
        console.log(`   ⚠️ 不足キーワード: ${result.missingKeywords.join(', ')}`);
      }
      if (result.foundForbiddenKeywords.length > 0) {
        console.log(`   ⚠️ 禁止キーワード検出: ${result.foundForbiddenKeywords.join(', ')}`);
      }
    }

    // API制限対策（少し待機）
    await sleep(500);
  }

  const passedCases = results.filter((r) => r.passed).length;
  const successRate = (passedCases / results.length) * 100;

  const summary: TestSummary = {
    totalCases: results.length,
    passedCases,
    failedCases: results.length - passedCases,
    successRate: Math.round(successRate * 100) / 100,
    results,
  };

  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`総テスト数: ${summary.totalCases}`);
  console.log(`成功: ${summary.passedCases}`);
  console.log(`失敗: ${summary.failedCases}`);
  console.log(`成功率: ${summary.successRate}%`);
  console.log('='.repeat(50) + '\n');

  return summary;
}

/**
 * 失敗したテストの詳細レポートを出力
 */
export function printFailedTestsReport(summary: TestSummary): void {
  const failedTests = summary.results.filter((r) => !r.passed);

  if (failedTests.length === 0) {
    console.log('🎉 全テスト合格！');
    return;
  }

  console.log('\n📋 失敗テスト詳細レポート\n');

  failedTests.forEach((result, index) => {
    console.log(`--- ${index + 1}. ${result.caseId} ---`);
    console.log(`入力: ${result.userInput}`);
    console.log(`AI応答: ${result.aiResponse.substring(0, 200)}...`);
    console.log(`スコア: ${result.score}/100`);
    console.log(`不足: ${result.missingKeywords.join(', ') || 'なし'}`);
    console.log(`禁止検出: ${result.foundForbiddenKeywords.join(', ') || 'なし'}`);
    console.log('');
  });
}

/**
 * ユーティリティ：スリープ
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// メイン実行（直接実行時）
if (require.main === module) {
  runAllEvaluations()
    .then((summary) => {
      printFailedTestsReport(summary);
      process.exit(summary.successRate >= 97 ? 0 : 1);
    })
    .catch((error) => {
      console.error('テスト実行エラー:', error);
      process.exit(1);
    });
}
