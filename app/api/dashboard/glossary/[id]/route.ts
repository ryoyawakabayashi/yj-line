import { NextRequest, NextResponse } from 'next/server';
import {
  updateGlossaryTerm,
  deleteGlossaryTerm,
} from '@/lib/database/glossary-queries';

/**
 * PATCH /api/dashboard/glossary/[id]
 * 用語を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ja, ja_easy, en, ko, zh, vi, note } = body;

    const updates: any = {};
    if (ja !== undefined) updates.ja = ja;
    if (ja_easy !== undefined) updates.ja_easy = ja_easy || null;
    if (en !== undefined) updates.en = en || null;
    if (ko !== undefined) updates.ko = ko || null;
    if (zh !== undefined) updates.zh = zh || null;
    if (vi !== undefined) updates.vi = vi || null;
    if (note !== undefined) updates.note = note || null;

    const term = await updateGlossaryTerm(id, updates);

    if (!term) {
      return NextResponse.json(
        { success: false, error: 'Failed to update term' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, term });
  } catch (error) {
    console.error('用語更新エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update term' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/glossary/[id]
 * 用語を削除
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await deleteGlossaryTerm(id);

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete term' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('用語削除エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete term' },
      { status: 500 }
    );
  }
}
