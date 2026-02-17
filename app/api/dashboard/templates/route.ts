import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

/**
 * テンプレート一覧取得
 * GET /api/dashboard/templates?active=true
 */
export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get('active') !== 'false';

    let query = supabase
      .from('operator_reply_templates')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('テンプレート取得エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const templates = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      message: row.message,
      quickReplies: row.quick_replies,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('テンプレート取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * テンプレート新規作成
 * POST /api/dashboard/templates
 * Body: { name, message, quickReplies: [{ label, text }], sortOrder? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, message, quickReplies, sortOrder } = body;

    if (!name || !message) {
      return NextResponse.json(
        { success: false, error: 'name と message は必須です' },
        { status: 400 }
      );
    }

    if (!Array.isArray(quickReplies) || quickReplies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'quickReplies は1つ以上必要です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('operator_reply_templates')
      .insert({
        name,
        message,
        quick_replies: quickReplies,
        sort_order: sortOrder || 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('テンプレート作成エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('テンプレート作成エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
