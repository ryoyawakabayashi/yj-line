import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { generateJlptQuestions } from '@/lib/openai/client';

/**
 * POST: AIで問題を一括生成してDBに保存（is_approved=false）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, category, count = 10 } = body;

    if (!level || !category) {
      return NextResponse.json(
        { success: false, error: 'level と category は必須です' },
        { status: 400 }
      );
    }

    const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const validCategories = ['grammar', 'vocabulary', 'kanji', 'reading'];

    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { success: false, error: `level は ${validLevels.join(', ')} のいずれかです` },
        { status: 400 }
      );
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `category は ${validCategories.join(', ')} のいずれかです` },
        { status: 400 }
      );
    }

    const maxCount = Math.min(count, 20);

    // AI生成
    const generated = await generateJlptQuestions(level, category, maxCount);

    if (generated.length === 0) {
      return NextResponse.json(
        { success: false, error: '問題の生成に失敗しました。再試行してください。' },
        { status: 500 }
      );
    }

    // 重複チェック: correctがwrongに含まれている問題を除外
    const valid = generated.filter((q) => {
      if (q.wrong.includes(q.correct)) return false;
      if (new Set(q.wrong).size !== q.wrong.length) return false;
      return true;
    });

    // DBに保存
    const rows = valid.map((q) => ({
      level,
      category,
      question_text: q.question_text,
      options: [q.correct, ...q.wrong],
      correct_index: 0,
      explanation: {},
      is_approved: false,
    }));

    const { data, error } = await supabase
      .from('jlpt_questions')
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      generated: data?.length || 0,
      questions: data,
    });
  } catch (error: any) {
    console.error('JLPT問題生成APIエラー:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
