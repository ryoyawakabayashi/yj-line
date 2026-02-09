import { NextRequest, NextResponse } from 'next/server';
import { getFlows, createFlow } from '@/lib/database/flow-queries';

/**
 * フロー一覧取得API
 * GET /api/dashboard/flows?service=YOLO_JAPAN&isActive=true&triggerType=support_button
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const service = searchParams.get('service') || undefined;
    const isActive = searchParams.get('isActive');
    const triggerType = searchParams.get('triggerType') || undefined;

    const options: Parameters<typeof getFlows>[0] = {};

    if (service) {
      options.service = service;
    }

    if (isActive !== null) {
      options.isActive = isActive === 'true';
    }

    if (triggerType) {
      options.triggerType = triggerType;
    }

    const flows = await getFlows(options);

    return NextResponse.json({
      success: true,
      flows,
      count: flows.length,
    });
  } catch (error) {
    console.error('フロー一覧取得エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * フロー作成API
 * POST /api/dashboard/flows
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      triggerType,
      triggerValue,
      service,
      priority,
      flowDefinition,
      createdBy,
    } = body;

    // バリデーション
    if (!name || !triggerType || !flowDefinition) {
      return NextResponse.json(
        { success: false, error: 'name, triggerType, flowDefinition are required' },
        { status: 400 }
      );
    }

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

    const flowId = await createFlow({
      name,
      description,
      triggerType,
      triggerValue,
      service,
      priority: priority || 0,
      flowDefinition,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      flowId,
    });
  } catch (error) {
    console.error('フロー作成エラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
