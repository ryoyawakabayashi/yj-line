import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

/**
 * テンプレート更新
 * PATCH /api/dashboard/templates/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.message !== undefined) updates.message = body.message;
    if (body.quickReplies !== undefined) updates.quick_replies = body.quickReplies;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: '更新するフィールドがありません' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('operator_reply_templates')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('テンプレート更新エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('テンプレート更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * テンプレート削除
 * DELETE /api/dashboard/templates/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { error } = await supabase
      .from('operator_reply_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('テンプレート削除エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('テンプレート削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
