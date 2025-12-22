import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersWithConversations,
  getUserConversationDetail,
} from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (userId) {
      // 特定ユーザーの会話履歴を取得
      const detail = await getUserConversationDetail(userId);
      if (!detail) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(detail);
    } else {
      // ユーザー一覧を取得
      const users = await getUsersWithConversations(limit);
      return NextResponse.json({ users });
    }
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
