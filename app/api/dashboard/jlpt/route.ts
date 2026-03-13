import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

/**
 * GET: 問題一覧（フィルタ対応）
 * POST: 手動で問題を作成
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode');

    // カウントモード: レベル・カテゴリ別の承認数を返す
    if (mode === 'counts') {
      const { data, error } = await supabase
        .from('jlpt_questions')
        .select('level, category, is_approved');
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      const levels: Record<string, number> = {};
      const categories: Record<string, number> = {};
      for (const q of data || []) {
        if (q.is_approved) {
          levels[q.level] = (levels[q.level] || 0) + 1;
          categories[q.category] = (categories[q.category] || 0) + 1;
        }
      }
      return NextResponse.json({ success: true, levels, categories });
    }

    const levels = searchParams.get('level'); // カンマ区切り: "N5,N4"
    const categoriesParam = searchParams.get('category'); // カンマ区切り: "grammar,kanji"
    const approved = searchParams.get('approved'); // 'true' | 'false' | null(全件)

    let query = supabase
      .from('jlpt_questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (levels) query = query.in('level', levels.split(','));
    if (categoriesParam) query = query.in('category', categoriesParam.split(','));
    if (approved === 'true') query = query.eq('is_approved', true);
    if (approved === 'false') query = query.eq('is_approved', false);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, category, question_text, options, correct_index, explanation } = body;

    if (!level || !category || !question_text || !options || correct_index === undefined) {
      return NextResponse.json(
        { success: false, error: 'level, category, question_text, options, correct_index は必須です' },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return NextResponse.json(
        { success: false, error: '選択肢は4つ必要です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('jlpt_questions')
      .insert({
        level,
        category,
        question_text,
        options,
        correct_index,
        explanation: explanation || {},
        is_approved: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, question: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH: 一括承認
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, is_approved } = body as { ids: string[]; is_approved: boolean };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids は必須です' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('jlpt_questions')
      .update({ is_approved, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
