import { NextRequest, NextResponse } from 'next/server';
import { getReminderFlexMessage, getJobSearchUrl, getTargetApplicationCount } from '@/lib/messages/application-reminder';
import { getUserDiagnosisAnswers } from '@/lib/database/reminder-queries';
import { pushMessage } from '@/lib/line/client';
import { processUrl } from '@/lib/tracking/url-processor';
import { buildYoloSearchUrl } from '@/lib/utils/url';
import { supabase } from '@/lib/database/client';

// 日本語レベルの順序
const LEVEL_ORDER = ['no_japanese', 'n5', 'n4', 'n3', 'n2', 'n1'] as const;

/**
 * 1つ上の日本語レベルを取得
 */
function getUpperLevel(currentLevel: string): string | null {
  const currentIndex = LEVEL_ORDER.indexOf(currentLevel as (typeof LEVEL_ORDER)[number]);
  if (currentIndex === -1 || currentIndex >= LEVEL_ORDER.length - 1) {
    return null;
  }
  return LEVEL_ORDER[currentIndex + 1];
}

/**
 * ユーザーの応募件数を取得（tracking_tokensのconverted_atベース）
 */
async function getApplicationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tracking_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('converted_at', 'is', null);

  if (error) {
    console.error(`Failed to get application count for ${userId}:`, error);
    return 0;
  }

  return count || 0;
}

/**
 * 一括送信API
 * 指定したユーザーIDリストにリマインダーメッセージを送信
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds array is required' },
        { status: 400 }
      );
    }

    const results: Array<{
      userId: string;
      success: boolean;
      applicationCount?: number;
      targetCount?: number;
      error?: string;
    }> = [];

    for (const userId of userIds) {
      try {
        // ユーザーの応募件数を取得
        const applicationCount = await getApplicationCount(userId);
        const targetCount = getTargetApplicationCount(applicationCount);

        // ユーザーの診断結果を取得
        const diagnosisData = await getUserDiagnosisAnswers(userId);
        const lang = diagnosisData?.lang || 'ja';
        const answers = diagnosisData?.answers || {};
        const japaneseLevel = answers.japanese_level;

        console.log(`📬 送信: userId=${userId}, 応募${applicationCount}件, 目標${targetCount}件, lang=${lang}, level=${japaneseLevel}`);

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

        // Flex Messageを生成（応募件数を渡す）
        const flexMessage = getReminderFlexMessage(lang, japaneseLevel, mainUrl, upperUrl, applicationCount);

        // LINEプッシュ送信
        const pushResult = await pushMessage(userId, flexMessage as Parameters<typeof pushMessage>[1]);

        if (pushResult) {
          console.log(`✅ 送信成功: ${userId}`);
          results.push({
            userId,
            success: true,
            applicationCount,
            targetCount,
          });
        } else {
          console.error(`❌ 送信失敗: ${userId}`);
          results.push({
            userId,
            success: false,
            applicationCount,
            error: 'Push failed',
          });
        }

        // レート制限対策: 100ms待機
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ エラー: ${userId}`, error);
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount}件送信成功, ${failedCount}件失敗`,
      results,
    });
  } catch (error) {
    console.error('❌ 一括送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
