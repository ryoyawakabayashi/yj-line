import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

/**
 * GET: 個別問題を取得
 * PATCH: 問題を編集
 * DELETE: 問題を削除
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('jlpt_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: '問題が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true, question: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.level !== undefined) updates.level = body.level;
    if (body.category !== undefined) updates.category = body.category;
    if (body.question_text !== undefined) updates.question_text = body.question_text;
    if (body.options !== undefined) updates.options = body.options;
    if (body.correct_index !== undefined) updates.correct_index = body.correct_index;
    if (body.explanation !== undefined) updates.explanation = body.explanation;
    if (body.is_approved !== undefined) updates.is_approved = body.is_approved;

    const { data, error } = await supabase
      .from('jlpt_questions')
      .update(updates)
      .eq('id', id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('jlpt_questions')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
