import { NextRequest, NextResponse } from 'next/server';
import {
  getFlowById,
  updateFlow,
  deleteFlow,
  permanentDeleteFlow,
} from '@/lib/database/flow-queries';

/**
 * フロー詳細取得API
 * GET /api/dashboard/flows/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const flow = await getFlowById(id);

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Flow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      flow,
    });
  } catch (error) {
    console.error('フロー詳細取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * フロー更新API
 * PATCH /api/dashboard/flows/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      triggerType,
      triggerValue,
      service,
      isActive,
      priority,
      flowDefinition,
    } = body;

    // flowDefinitionのバリデーション（指定されている場合のみ）
    if (flowDefinition) {
      if (!flowDefinition.nodes || !Array.isArray(flowDefinition.nodes)) {
        return NextResponse.json(
          { success: false, error: 'flowDefinition.nodes must be an array' },
          { status: 400 }
        );
      }

      if (!flowDefinition.edges || !Array.isArray(flowDefinition.edges)) {
        return NextResponse.json(
          { success: false, error: 'flowDefinition.edges must be an array' },
          { status: 400 }
        );
      }
    }

    await updateFlow(id, {
      name,
      description,
      triggerType,
      triggerValue,
      service,
      isActive,
      priority,
      flowDefinition,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('フロー更新エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * フロー削除API（論理削除）
 * DELETE /api/dashboard/flows/[id]?hard=true で物理削除
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
      await permanentDeleteFlow(id);
    } else {
      // 論理削除（is_active = false）
      await deleteFlow(id);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('フロー削除エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
