import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

const VALID_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const VALID_CATEGORIES = ['grammar', 'vocabulary', 'kanji', 'reading'];

interface ImportQuestion {
  level: string;
  category: string;
  question_text: string;
  correct: string;
  wrong: string[];
}

/**
 * POST: 外部AIで生成したJSON問題を一括インポート
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions } = body as { questions: ImportQuestion[] };

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'questions 配列が必要です' },
        { status: 400 }
      );
    }

    if (questions.length > 200) {
      return NextResponse.json(
        { success: false, error: '一度にインポートできるのは200問までです' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const rows = questions
      .map((q, i) => {
        // バリデーション
        if (!q.question_text || !q.correct) {
          errors.push(`問題${i + 1}: question_text と correct は必須です`);
          return null;
        }
        if (!Array.isArray(q.wrong) || q.wrong.length !== 3) {
          errors.push(`問題${i + 1}: wrong は3つ必要です`);
          return null;
        }
        if (!VALID_LEVELS.includes(q.level)) {
          errors.push(`問題${i + 1}: level "${q.level}" は無効です`);
          return null;
        }
        if (!VALID_CATEGORIES.includes(q.category)) {
          errors.push(`問題${i + 1}: category "${q.category}" は無効です`);
          return null;
        }

        // 重複チェック: correctがwrongに含まれている
        if (q.wrong.includes(q.correct)) {
          errors.push(`問題${i + 1}: 正解「${q.correct}」が不正解にも含まれています`);
          return null;
        }

        // wrong内の重複チェック
        const uniqueWrong = new Set(q.wrong);
        if (uniqueWrong.size !== q.wrong.length) {
          errors.push(`問題${i + 1}: 不正解の選択肢に重複があります`);
          return null;
        }

        return {
          level: q.level,
          category: q.category,
          question_text: q.question_text,
          options: [q.correct, ...q.wrong],
          correct_index: 0,
          explanation: {},
          is_approved: false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な問題がありません', details: errors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('jlpt_questions')
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      skipped: questions.length - rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
