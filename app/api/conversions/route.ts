// =====================================================
// コンバージョンデータ取得API（ダッシュボード用）
// =====================================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

export async function GET() {
  try {
    // 統計情報取得
    let stats = null;
    try {
      const { data: statsData } = await supabase.rpc('get_conversion_stats');
      if (statsData) {
        stats = {
          uniqueIssuedUsers: statsData.unique_issued_users || 0,
          totalTokens: statsData.total_tokens || 0,
          totalClicks: statsData.total_clicks || 0,
          totalConversions: statsData.total_conversions || 0,
          uniqueConvertedUsers: statsData.unique_converted_users || 0,
          clickRate: statsData.click_rate || 0,
          conversionRate: statsData.conversion_rate || 0,
        };
      }
    } catch {
      // RPC失敗時はデフォルト値
      stats = {
        uniqueIssuedUsers: 0,
        totalTokens: 0,
        totalClicks: 0,
        totalConversions: 0,
        uniqueConvertedUsers: 0,
        clickRate: 0,
        conversionRate: 0,
      };
    }

    // 応募完了ユーザー取得
    let users: Array<{
      userId: string;
      firstConversion: string;
      lastConversion: string;
      conversionCount: number;
      urlTypes: string[];
    }> = [];
    try {
      const { data: usersData } = await supabase
        .from('converted_users')
        .select('*')
        .order('last_conversion', { ascending: false })
        .limit(100);

      if (usersData) {
        users = usersData.map((row) => ({
          userId: row.user_id,
          firstConversion: row.first_conversion,
          lastConversion: row.last_conversion,
          conversionCount: row.conversion_count,
          urlTypes: row.url_types || [],
        }));
      }
    } catch {
      // ビューが存在しない場合は空配列
    }

    // トラッキング詳細取得
    let details: Array<{
      id: string;
      token: string;
      urlType: string | null;
      destinationUrl: string | null;
      createdAt: string;
      clickedAt: string | null;
      convertedAt: string | null;
    }> = [];
    try {
      const { data: detailsData } = await supabase
        .from('tracking_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (detailsData) {
        details = detailsData.map((row) => ({
          id: row.id,
          token: row.token,
          urlType: row.url_type,
          destinationUrl: row.destination_url,
          createdAt: row.created_at,
          clickedAt: row.clicked_at,
          convertedAt: row.converted_at,
        }));
      }
    } catch {
      // テーブルが存在しない場合は空配列
    }

    return NextResponse.json({ stats, users, details });
  } catch (error) {
    console.error('Failed to fetch conversion data:', error);
    return NextResponse.json(
      { error: 'Internal error', stats: null, users: [], details: [] },
      { status: 500 }
    );
  }
}
