import { NextRequest, NextResponse } from 'next/server';
import { getFullReminderMessageWithLevels, getJobSearchUrl } from '@/lib/messages/application-reminder';
import { getUserDiagnosisAnswers } from '@/lib/database/reminder-queries';
import { pushMessage } from '@/lib/line/client';
import { processUrl } from '@/lib/tracking/url-processor';
import { buildYoloSearchUrl } from '@/lib/utils/url';

// 日本語レベルの順序
const LEVEL_ORDER = ['no_japanese', 'n5', 'n4', 'n3', 'n2', 'n1'] as const;

/**
 * 1つ上の日本語レベルを取得
 */
function getUpperLevel(currentLevel: string): string | null {
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel as (typeof LEVEL_ORDER)[number]);
  if (currentIndex === -1 || currentIndex >= LEVEL_ORDER.length - 1) {
    return null; // N1の場合は上がない
  }
  return LEVEL_ORDER[currentIndex + 1];
}

/**
 * テスト送信API
 * 指定したユーザーIDにリマインダーメッセージを送信
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // ユーザーの診断結果を取得
    const diagnosisData = await getUserDiagnosisAnswers(userId);
    const lang = diagnosisData?.lang || 'ja';
    const answers = diagnosisData?.answers || {};
    const japaneseLevel = answers.japanese_level;

    console.log(`📬 テスト送信: userId=${userId}, lang=${lang}, japaneseLevel=${japaneseLevel}`);

    let mainUrl: string;
    let upperUrl: string | undefined;

    if (japaneseLevel) {
      // 診断結果がある場合: 診断条件に基づくURL
      mainUrl = buildYoloSearchUrl(answers, lang);
      mainUrl = await processUrl(mainUrl, userId, '10apply_boost');

      // 1つ上のレベルのURL
      const upperLevel = getUpperLevel(japaneseLevel);
      if (upperLevel) {
        const upperAnswers = { ...answers, japanese_level: upperLevel as typeof answers.japanese_level };
        upperUrl = buildYoloSearchUrl(upperAnswers, lang);
        upperUrl = await processUrl(upperUrl, userId, '10apply_boost');
      }
    } else {
      // 診断結果がない場合: 汎用URL
      const baseUrl = getJobSearchUrl(lang);
      mainUrl = await processUrl(baseUrl, userId, '10apply_boost');
    }

    // メッセージを生成
    const message = getFullReminderMessageWithLevels(lang, japaneseLevel, mainUrl, upperUrl);

    // LINEプッシュ送信
    const pushResult = await pushMessage(userId, {
      type: 'text',
      text: message,
    });

    if (pushResult) {
      console.log(`✅ テスト送信成功: ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'メッセージを送信しました',
        sentMessage: message,
        diagnosisData: {
          lang,
          japaneseLevel,
          hasUpperLevel: !!upperUrl,
        },
      });
    } else {
      console.error(`❌ テスト送信失敗: ${userId}`);
      return NextResponse.json(
        { success: false, error: 'Push failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ テスト送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
