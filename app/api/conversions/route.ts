// =====================================================
// コンバージョンデータ取得API（ダッシュボード用）
// 期間フィルター: ?period=today|yesterday|week|2weeks|month|all
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (period) {
    case 'today':
      return { start: today, end: tomorrow };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo, end: tomorrow };
    }
    case '2weeks': {
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return { start: twoWeeksAgo, end: tomorrow };
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { start: monthAgo, end: tomorrow };
    }
    default: // 'all'
      return { start: new Date('1970-01-01'), end: tomorrow };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'all';
  const { start, end } = getDateRange(period);

  try {
    // 統計情報取得（期間フィルター付き）
    let stats = null;
    try {
      const { data: statsData } = await supabase.rpc('get_conversion_stats', {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });
      if (statsData) {
        stats = {
          uniqueIssuedUsers: statsData.unique_issued_users || 0,
          uniqueClickedUsers: statsData.unique_clicked_users || 0,
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
        uniqueClickedUsers: 0,
        totalTokens: 0,
        totalClicks: 0,
        totalConversions: 0,
        uniqueConvertedUsers: 0,
        clickRate: 0,
        conversionRate: 0,
      };
    }

    // 応募完了ユーザー取得（application_logsから・期間フィルター付き）
    let users: Array<{
      userId: string;
      firstConversion: string;
      lastConversion: string;
      conversionCount: number;
      urlTypes: string[];
    }> = [];
    try {
      // 期間内の応募履歴を取得
      const { data: logsData } = await supabase
        .from('application_logs')
        .select('user_id, applied_at, url_type')
        .gte('applied_at', start.toISOString())
        .lt('applied_at', end.toISOString())
        .order('applied_at', { ascending: false });

      if (logsData && logsData.length > 0) {
        // ユーザーごとに集約
        const userMap = new Map<string, {
          firstConversion: string;
          lastConversion: string;
          conversionCount: number;
          urlTypes: Set<string>;
        }>();

        for (const row of logsData) {
          const existing = userMap.get(row.user_id);
          if (existing) {
            existing.conversionCount++;
            if (row.applied_at < existing.firstConversion) {
              existing.firstConversion = row.applied_at;
            }
            if (row.applied_at > existing.lastConversion) {
              existing.lastConversion = row.applied_at;
            }
            if (row.url_type) existing.urlTypes.add(row.url_type);
          } else {
            userMap.set(row.user_id, {
              firstConversion: row.applied_at,
              lastConversion: row.applied_at,
              conversionCount: 1,
              urlTypes: new Set(row.url_type ? [row.url_type] : []),
            });
          }
        }

        users = Array.from(userMap.entries()).map(([userId, data]) => ({
          userId,
          firstConversion: data.firstConversion,
          lastConversion: data.lastConversion,
          conversionCount: data.conversionCount,
          urlTypes: Array.from(data.urlTypes),
        }));
      }
    } catch {
      // テーブルが存在しない場合は空配列（フォールバック: tracking_tokensを使用）
      try {
        const { data: fallbackData } = await supabase
          .from('tracking_tokens')
          .select('user_id, converted_at, url_type')
          .not('converted_at', 'is', null)
          .gte('converted_at', start.toISOString())
          .lt('converted_at', end.toISOString())
          .order('converted_at', { ascending: false });

        if (fallbackData) {
          const userMap = new Map<string, {
            firstConversion: string;
            lastConversion: string;
            conversionCount: number;
            urlTypes: Set<string>;
          }>();

          for (const row of fallbackData) {
            const existing = userMap.get(row.user_id);
            if (existing) {
              existing.conversionCount++;
              if (row.converted_at < existing.firstConversion) {
                existing.firstConversion = row.converted_at;
              }
              if (row.converted_at > existing.lastConversion) {
                existing.lastConversion = row.converted_at;
              }
              if (row.url_type) existing.urlTypes.add(row.url_type);
            } else {
              userMap.set(row.user_id, {
                firstConversion: row.converted_at,
                lastConversion: row.converted_at,
                conversionCount: 1,
                urlTypes: new Set(row.url_type ? [row.url_type] : []),
              });
            }
          }

          users = Array.from(userMap.entries()).map(([userId, data]) => ({
            userId,
            firstConversion: data.firstConversion,
            lastConversion: data.lastConversion,
            conversionCount: data.conversionCount,
            urlTypes: Array.from(data.urlTypes),
          }));
        }
      } catch {
        // どちらのテーブルもない場合は空配列
      }
    }

    // 応募履歴詳細（誰が・いつ・何経由で応募）
    let applications: Array<{
      id: string;
      userId: string;
      token: string;
      urlType: string | null;
      utmCampaign: string | null;
      appliedAt: string;
    }> = [];
    try {
      const { data: appData } = await supabase
        .from('application_logs')
        .select('*')
        .gte('applied_at', start.toISOString())
        .lt('applied_at', end.toISOString())
        .order('applied_at', { ascending: false })
        .limit(100);

      if (appData) {
        applications = appData.map((row) => ({
          id: row.id,
          userId: row.user_id,
          token: row.token,
          urlType: row.url_type,
          utmCampaign: row.utm_campaign,
          appliedAt: row.applied_at,
        }));
      }
    } catch {
      // テーブルが存在しない場合は空配列
    }

    // トラッキング詳細取得（期間フィルター付き）
    let details: Array<{
      id: string;
      token: string;
      urlType: string | null;
      destinationUrl: string | null;
      createdAt: string;
      clickedAt: string | null;
      convertedAt: string | null;
    }> = [];

    // url_type別クリック数集計
    let clicksByType: Array<{
      urlType: string;
      issued: number;
      clicked: number;
      clickRate: number;
    }> = [];

    try {
      const { data: detailsData } = await supabase
        .from('tracking_tokens')
        .select('*')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (detailsData) {
        // 詳細リスト（最大100件）
        details = detailsData.slice(0, 100).map((row) => ({
          id: row.id,
          token: row.token,
          urlType: row.url_type,
          destinationUrl: row.destination_url,
          createdAt: row.created_at,
          clickedAt: row.clicked_at,
          convertedAt: row.converted_at,
        }));

        // url_type別集計
        const typeMap = new Map<string, { issued: number; clicked: number }>();
        for (const row of detailsData) {
          const urlType = row.url_type || 'unknown';
          const existing = typeMap.get(urlType);
          if (existing) {
            existing.issued++;
            if (row.clicked_at) existing.clicked++;
          } else {
            typeMap.set(urlType, {
              issued: 1,
              clicked: row.clicked_at ? 1 : 0,
            });
          }
        }

        clicksByType = Array.from(typeMap.entries())
          .map(([urlType, data]) => ({
            urlType,
            issued: data.issued,
            clicked: data.clicked,
            clickRate: data.issued > 0 ? Math.round((data.clicked / data.issued) * 100) : 0,
          }))
          .sort((a, b) => b.clicked - a.clicked);
      }
    } catch {
      // テーブルが存在しない場合は空配列
    }

    return NextResponse.json({ stats, users, details, applications, clicksByType, period });
  } catch (error) {
    console.error('Failed to fetch conversion data:', error);
    return NextResponse.json(
      { error: 'Internal error', stats: null, users: [], details: [] },
      { status: 500 }
    );
  }
}
