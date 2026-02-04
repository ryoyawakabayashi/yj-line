import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { updateFAQ, updateFAQTranslation, deleteFAQ, clearFAQCache } from '@/lib/database/faq-queries';

/**
 * FAQ詳細取得API
 * GET /api/dashboard/faq/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('faqs')
      .select(`
        id,
        service,
        faq_key,
        keywords,
        is_active,
        priority,
        created_at,
        updated_at,
        faq_translations (
          id,
          lang,
          question,
          answer,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('FAQ詳細取得エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    const faq = {
      id: data.id,
      service: data.service,
      faqKey: data.faq_key,
      keywords: data.keywords || [],
      isActive: data.is_active,
      priority: data.priority,
      translations: data.faq_translations,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({
      success: true,
      faq,
    });
  } catch (error) {
    console.error('FAQ詳細取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * FAQ更新API
 * PATCH /api/dashboard/faq/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { keywords, priority, isActive, translations } = body;

    // FAQ本体の更新
    if (keywords !== undefined || priority !== undefined || isActive !== undefined) {
      const success = await updateFAQ(id, {
        keywords,
        priority,
        isActive,
      });

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to update FAQ' },
          { status: 500 }
        );
      }
    }

    // 翻訳の更新
    if (translations && Array.isArray(translations)) {
      for (const trans of translations) {
        if (trans.lang && (trans.question !== undefined || trans.answer !== undefined)) {
          // 既存の翻訳を確認
          const { data: existingTrans } = await supabase
            .from('faq_translations')
            .select('id')
            .eq('faq_id', id)
            .eq('lang', trans.lang)
            .single();

          if (existingTrans) {
            // 更新
            const success = await updateFAQTranslation(id, trans.lang, {
              question: trans.question,
              answer: trans.answer,
            });

            if (!success) {
              console.error(`翻訳更新失敗: ${trans.lang}`);
            }
          } else {
            // 新規作成
            const { error } = await supabase.from('faq_translations').insert({
              faq_id: id,
              lang: trans.lang,
              question: trans.question || '',
              answer: trans.answer || '',
            });

            if (error) {
              console.error(`翻訳作成失敗: ${trans.lang}`, error);
            }
          }
        }
      }

      // キャッシュをクリア
      clearFAQCache();
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('FAQ更新エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * FAQ削除API（論理削除）
 * DELETE /api/dashboard/faq/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // 物理削除
      const success = await deleteFAQ(id);

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to delete FAQ' },
          { status: 500 }
        );
      }
    } else {
      // 論理削除（is_active = false）
      const success = await updateFAQ(id, { isActive: false });

      if (!success) {
        return NextResponse.json(
          { success: false, error: 'Failed to deactivate FAQ' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('FAQ削除エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
