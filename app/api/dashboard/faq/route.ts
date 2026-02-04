import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { createFAQ, clearFAQCache } from '@/lib/database/faq-queries';
import { ServiceType } from '@/types/support';

/**
 * FAQ一覧取得API
 * GET /api/dashboard/faq?service=YOLO_JAPAN&lang=ja
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get('service') as ServiceType | null;
    const lang = searchParams.get('lang') || 'ja';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let query = supabase
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
          answer
        )
      `)
      .order('priority', { ascending: false });

    if (service) {
      query = query.eq('service', service);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('FAQ取得エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 指定言語の翻訳を優先、なければjaを使用
    const faqs = (data || []).map((faq) => {
      const translations = faq.faq_translations as Array<{
        id: string;
        lang: string;
        question: string;
        answer: string;
      }>;
      const translation = translations.find((t) => t.lang === lang) ||
        translations.find((t) => t.lang === 'ja') ||
        translations[0];

      return {
        id: faq.id,
        service: faq.service,
        faqKey: faq.faq_key,
        keywords: faq.keywords || [],
        isActive: faq.is_active,
        priority: faq.priority,
        question: translation?.question || '',
        answer: translation?.answer || '',
        translations: translations,
        createdAt: faq.created_at,
        updatedAt: faq.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      faqs,
      count: faqs.length,
    });
  } catch (error) {
    console.error('FAQ一覧取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * FAQ作成API
 * POST /api/dashboard/faq
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, faqKey, keywords, priority, translations } = body;

    if (!service || !faqKey || !translations || translations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'service, faqKey, translations are required' },
        { status: 400 }
      );
    }

    const faqId = await createFAQ({
      service,
      faqKey,
      keywords: keywords || [],
      priority: priority || 0,
      translations,
    });

    if (!faqId) {
      return NextResponse.json(
        { success: false, error: 'Failed to create FAQ' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      faqId,
    });
  } catch (error) {
    console.error('FAQ作成エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
