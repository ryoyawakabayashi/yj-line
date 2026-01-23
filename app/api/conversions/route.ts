// =====================================================
// コンバージョンデータ取得API（ダッシュボード用）
// 期間フィルター: ?period=today|yesterday|week|2weeks|month|all
// GA4で検知されたキーイベント（complete_work等）のあるユーザーのみ表示
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { getUserProfile } from '@/lib/line/client';
import { getLineBotConversionsWithKeyEvents } from '@/lib/ga4/queries';

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

// 新形式トークン（8文字hex）かどうかを判定
function isNewFormatToken(token: string): boolean {
  return /^[a-f0-9]{8}$/.test(token);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'all';
  const { start, end } = getDateRange(period);

  try {
    // 統計情報: RPCを使わず直接計算（新形式トークンのみ）
    let stats = {
      uniqueIssuedUsers: 0,
      uniqueClickedUsers: 0,
      totalTokens: 0,
      totalClicks: 0,
      totalConversions: 0,
      uniqueConvertedUsers: 0,
      clickRate: 0,
      conversionRate: 0,
    };

    // 新形式トークンのみを取得して統計を計算
    const { data: allTokensData } = await supabase
      .from('tracking_tokens')
      .select('token, user_id, clicked_at, converted_at')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());

    if (allTokensData) {
      // 新形式トークンのみフィルタ
      const newFormatTokens = allTokensData.filter((t) => isNewFormatToken(t.token));

      // 統計計算
      const issuedUserIds = new Set(newFormatTokens.map((t) => t.user_id));
      const clickedUserIds = new Set(newFormatTokens.filter((t) => t.clicked_at).map((t) => t.user_id));

      stats.totalTokens = newFormatTokens.length;
      stats.uniqueIssuedUsers = issuedUserIds.size;
      stats.totalClicks = newFormatTokens.filter((t) => t.clicked_at).length;
      stats.uniqueClickedUsers = clickedUserIds.size;
      stats.clickRate = stats.uniqueIssuedUsers > 0
        ? Math.round((stats.uniqueClickedUsers / stats.uniqueIssuedUsers) * 100 * 100) / 100
        : 0;
    }

    // 応募完了ユーザー（GA4から取得後に設定するため、ここでは空で初期化）
    let users: Array<{
      userId: string;
      firstConversion: string;
      lastConversion: string;
      conversionCount: number;
      urlTypes: string[];
      displayName: string | null;
      pictureUrl: string | null;
    }> = [];

    // GA4から検知されたキーイベント（complete_work等）を取得
    // GA4は過去データに制限があるため、allの場合は90日前からに制限
    const ga4StartDate = period === 'all'
      ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      : start;
    const startDateStr = ga4StartDate.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    const ga4Conversions = await getLineBotConversionsWithKeyEvents(startDateStr, endDateStr);

    // GA4で検知されたトークンのセット
    const ga4Tokens = ga4Conversions.map((cv) => cv.token);

    // GA4で検知されたトークンのconverted_atを更新（未設定のもののみ）
    if (ga4Tokens.length > 0) {
      // トークンごとに最も早い日付を取得
      const tokenDateMap = new Map<string, string>();
      for (const cv of ga4Conversions) {
        const existing = tokenDateMap.get(cv.token);
        const cvDate = `${cv.date}T12:00:00Z`;
        if (!existing || cvDate < existing) {
          tokenDateMap.set(cv.token, cvDate);
        }
      }

      // 一括更新（converted_atがnullのもののみ）
      for (const [token, convertedAt] of tokenDateMap) {
        await supabase
          .from('tracking_tokens')
          .update({ converted_at: convertedAt })
          .eq('token', token)
          .is('converted_at', null);
      }
    }

    // GA4検知データからトークン→ユーザーIDを取得
    const { data: tokenData } = await supabase
      .from('tracking_tokens')
      .select('token, user_id')
      .in('token', ga4Tokens.length > 0 ? ga4Tokens : ['__none__']);

    const tokenUserMap = new Map(tokenData?.map((t) => [t.token, t.user_id]) || []);

    // ユニークなユーザーIDを取得してプロフィールを一括取得
    const uniqueUserIds = [...new Set(tokenData?.map((t) => t.user_id) || [])];
    const profileMap = new Map<string, { displayName: string | null; pictureUrl: string | null }>();

    // プロフィールを並列取得（最大10件ずつ）
    for (let i = 0; i < uniqueUserIds.length; i += 10) {
      const batch = uniqueUserIds.slice(i, i + 10);
      const profiles = await Promise.all(
        batch.map(async (userId) => {
          const profile = await getUserProfile(userId);
          return {
            userId,
            displayName: profile?.displayName || null,
            pictureUrl: profile?.pictureUrl || null,
          };
        })
      );
      for (const p of profiles) {
        profileMap.set(p.userId, { displayName: p.displayName, pictureUrl: p.pictureUrl });
      }
    }

    // GA4検知データから直接applicationsを生成（eventCount分のレコード）
    let applications: Array<{
      id: string;
      userId: string;
      token: string;
      urlType: string | null;
      utmCampaign: string | null;
      appliedAt: string;
      displayName: string | null;
      pictureUrl: string | null;
      eventName: string | null;
    }> = [];

    for (const cv of ga4Conversions) {
      const userId = tokenUserMap.get(cv.token);
      if (!userId) continue;

      const profile = profileMap.get(userId);
      // eventCount分のレコードを生成
      for (let i = 0; i < cv.eventCount; i++) {
        applications.push({
          id: `${cv.token}-${cv.date}-${i}`,
          userId,
          token: cv.token,
          urlType: cv.urlType,
          utmCampaign: cv.campaign,
          appliedAt: `${cv.date}T12:00:00Z`,
          displayName: profile?.displayName || null,
          pictureUrl: profile?.pictureUrl || null,
          eventName: cv.eventName,
        });
      }
    }

    // 日付順にソート（新しい順）
    applications.sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));

    // GA4データからusersを生成（ユーザーごとに集約）
    const userAggMap = new Map<string, {
      firstConversion: string;
      lastConversion: string;
      conversionCount: number;
      urlTypes: Set<string>;
    }>();

    for (const cv of ga4Conversions) {
      const userId = tokenUserMap.get(cv.token);
      if (!userId) continue;

      const date = `${cv.date}T12:00:00Z`;
      const existing = userAggMap.get(userId);
      if (existing) {
        existing.conversionCount += cv.eventCount;
        if (date < existing.firstConversion) {
          existing.firstConversion = date;
        }
        if (date > existing.lastConversion) {
          existing.lastConversion = date;
        }
        existing.urlTypes.add(cv.urlType);
      } else {
        userAggMap.set(userId, {
          firstConversion: date,
          lastConversion: date,
          conversionCount: cv.eventCount,
          urlTypes: new Set([cv.urlType]),
        });
      }
    }

    users = Array.from(userAggMap.entries()).map(([userId, data]) => {
      const profile = profileMap.get(userId);
      return {
        userId,
        firstConversion: data.firstConversion,
        lastConversion: data.lastConversion,
        conversionCount: data.conversionCount,
        urlTypes: Array.from(data.urlTypes),
        displayName: profile?.displayName || null,
        pictureUrl: profile?.pictureUrl || null,
      };
    });

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
        // 新形式トークンのみフィルタ
        const newFormatDetails = detailsData.filter((row) => isNewFormatToken(row.token));

        // 詳細リスト（最大100件）
        details = newFormatDetails.slice(0, 100).map((row) => ({
          id: row.id,
          token: row.token,
          urlType: row.url_type,
          destinationUrl: row.destination_url,
          createdAt: row.created_at,
          clickedAt: row.clicked_at,
          convertedAt: row.converted_at,
        }));

        // url_type別集計（新形式トークンのみ）
        const typeMap = new Map<string, { issued: number; clicked: number }>();
        for (const row of newFormatDetails) {
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

    // 発行者一覧（新形式トークンを持つユニークユーザー）
    let issuers: Array<{
      userId: string;
      displayName: string | null;
      pictureUrl: string | null;
      tokenCount: number;
      clickCount: number;
      urlTypes: string[];
      firstIssued: string;
      lastIssued: string;
      hasConverted: boolean;
    }> = [];

    if (allTokensData) {
      const newFormatTokens = allTokensData.filter((t) => isNewFormatToken(t.token));

      // ユーザーごとに集計
      const issuerMap = new Map<string, {
        tokenCount: number;
        clickCount: number;
        urlTypes: Set<string>;
        firstIssued: string;
        lastIssued: string;
      }>();

      // 詳細データからurl_type情報を取得
      const { data: issuerDetailsData } = await supabase
        .from('tracking_tokens')
        .select('token, user_id, url_type, created_at, clicked_at')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      const tokenUrlTypeMap = new Map<string, string>();
      const tokenCreatedMap = new Map<string, string>();
      if (issuerDetailsData) {
        for (const row of issuerDetailsData) {
          if (isNewFormatToken(row.token)) {
            tokenUrlTypeMap.set(row.token, row.url_type || 'unknown');
            tokenCreatedMap.set(row.token, row.created_at);
          }
        }
      }

      for (const t of newFormatTokens) {
        const existing = issuerMap.get(t.user_id);
        const urlType = tokenUrlTypeMap.get(t.token) || 'unknown';
        const createdAt = tokenCreatedMap.get(t.token) || '';

        if (existing) {
          existing.tokenCount++;
          if (t.clicked_at) existing.clickCount++;
          existing.urlTypes.add(urlType);
          if (createdAt && createdAt < existing.firstIssued) {
            existing.firstIssued = createdAt;
          }
          if (createdAt && createdAt > existing.lastIssued) {
            existing.lastIssued = createdAt;
          }
        } else {
          issuerMap.set(t.user_id, {
            tokenCount: 1,
            clickCount: t.clicked_at ? 1 : 0,
            urlTypes: new Set([urlType]),
            firstIssued: createdAt,
            lastIssued: createdAt,
          });
        }
      }

      // 発行者のプロフィールを取得
      const issuerUserIds = [...issuerMap.keys()];
      const issuerProfileMap = new Map<string, { displayName: string | null; pictureUrl: string | null }>();

      // 既存のprofileMapを使いつつ、足りないものを追加取得
      for (const userId of issuerUserIds) {
        if (profileMap.has(userId)) {
          issuerProfileMap.set(userId, profileMap.get(userId)!);
        }
      }

      // まだプロフィールがないユーザーを取得
      const missingProfileUserIds = issuerUserIds.filter((id) => !issuerProfileMap.has(id));
      for (let i = 0; i < missingProfileUserIds.length; i += 10) {
        const batch = missingProfileUserIds.slice(i, i + 10);
        const profiles = await Promise.all(
          batch.map(async (userId) => {
            const profile = await getUserProfile(userId);
            return {
              userId,
              displayName: profile?.displayName || null,
              pictureUrl: profile?.pictureUrl || null,
            };
          })
        );
        for (const p of profiles) {
          issuerProfileMap.set(p.userId, { displayName: p.displayName, pictureUrl: p.pictureUrl });
        }
      }

      // 応募済みユーザーのセット
      const convertedUserIds = new Set(users.map((u) => u.userId));

      issuers = Array.from(issuerMap.entries())
        .map(([userId, data]) => {
          const profile = issuerProfileMap.get(userId);
          return {
            userId,
            displayName: profile?.displayName || null,
            pictureUrl: profile?.pictureUrl || null,
            tokenCount: data.tokenCount,
            clickCount: data.clickCount,
            urlTypes: Array.from(data.urlTypes),
            firstIssued: data.firstIssued,
            lastIssued: data.lastIssued,
            hasConverted: convertedUserIds.has(userId),
          };
        })
        .sort((a, b) => b.lastIssued.localeCompare(a.lastIssued));
    }

    // GA4から取得した応募者数・応募数でstatsを更新
    // （RPCはtracking_tokens.converted_atベースだが、GA4データの方が正確）
    const ga4UniqueConvertedUsers = users.length;
    const ga4TotalConversions = applications.length;

    if (stats) {
      stats.uniqueConvertedUsers = ga4UniqueConvertedUsers;
      stats.totalConversions = ga4TotalConversions;
      // 応募率も再計算（応募数 / クリック数）
      stats.conversionRate = stats.uniqueClickedUsers > 0
        ? Math.round((ga4TotalConversions / stats.uniqueClickedUsers) * 100 * 100) / 100
        : 0;
    }

    return NextResponse.json({ stats, users, details, applications, clicksByType, issuers, period });
  } catch (error) {
    console.error('Failed to fetch conversion data:', error);
    return NextResponse.json(
      { error: 'Internal error', stats: null, users: [], details: [] },
      { status: 500 }
    );
  }
}
