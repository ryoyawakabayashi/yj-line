import { NextRequest, NextResponse } from 'next/server';
import {
  getAllGlossaryTerms,
  createGlossaryTerm,
} from '@/lib/database/glossary-queries';

/**
 * GET /api/dashboard/glossary
 * 用語集一覧を取得
 */
export async function GET() {
  try {
    const terms = await getAllGlossaryTerms();
    return NextResponse.json({ success: true, terms });
  } catch (error) {
    console.error('用語集取得エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch glossary' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/glossary
 * 用語を新規作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ja, ja_easy, en, ko, zh, vi, note } = body;

    if (!ja) {
      return NextResponse.json(
        { success: false, error: 'ja (日本語) is required' },
        { status: 400 }
      );
    }

    const term = await createGlossaryTerm({
      ja,
      ja_easy: ja_easy || null,
      en: en || null,
      ko: ko || null,
      zh: zh || null,
      vi: vi || null,
      note: note || null,
    });

    if (!term) {
      return NextResponse.json(
        { success: false, error: 'Failed to create term' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, term });
  } catch (error) {
    console.error('用語作成エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create term' },
      { status: 500 }
    );
  }
}
