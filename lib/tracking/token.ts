// =====================================================
// トラッキングトークン生成・管理
// =====================================================

import crypto from 'crypto';
import { supabase } from '@/lib/database/supabase';

export interface TrackingToken {
  id: string;
  token: string;
  userId: string;
  urlType: string | null;
  destinationUrl: string | null;
  createdAt: string;
  expiresAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
}

export interface ConvertedUser {
  userId: string;
  firstConversion: string;
  lastConversion: string;
  conversionCount: number;
  urlTypes: string[];
}

export interface ConversionStats {
  totalTokens: number;
  totalClicks: number;
  totalConversions: number;
  uniqueConvertedUsers: number;
  clickRate: number;
  conversionRate: number;
}

/**
 * ユーザーID から固定トークンを生成（8文字）
 * 同じユーザーには常に同じトークンが付与される
 */
function generateUserToken(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 8);
}

/**
 * トラッキングトークン付きURLを生成
 * リダイレクト方式: /api/r/[token] → destination_url
 * これによりクリック計測が可能
 */
export async function generateTrackingUrl(
  userId: string,
  baseUrl: string,
  urlType: string
): Promise<string> {
  // ユーザー固定のトークン生成（同じユーザーは常に同じトークン）
  const token = generateUserToken(userId);

  // 既存のトークンを確認
  const { data: existing, error: selectError } = await supabase
    .from('tracking_tokens')
    .select('id, destination_url')
    .eq('token', token)
    .maybeSingle();

  if (selectError) {
    console.error('❌ tracking_tokens SELECT error:', selectError);
  }

  // 新規ユーザーの場合のみDBに保存
  if (!existing) {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年
    const { error: insertError } = await supabase.from('tracking_tokens').insert({
      token,
      user_id: userId,
      url_type: urlType,
      destination_url: baseUrl,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('❌ tracking_tokens INSERT error:', insertError);
    } else {
      console.log('✅ tracking_tokens INSERT success:', { token, userId, urlType });
    }
  } else if (existing.destination_url !== baseUrl) {
    // 既存トークンだがURLが違う場合は更新
    await supabase
      .from('tracking_tokens')
      .update({ destination_url: baseUrl, url_type: urlType })
      .eq('token', token);
  }

  // リダイレクトURL生成（クリック計測用）
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://your-app.vercel.app';
  const redirectUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/r/${token}`;

  return redirectUrl;
}

/**
 * クリック記録
 */
export async function recordClick(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('tracking_tokens')
    .update({ clicked_at: new Date().toISOString() })
    .eq('token', token)
    .is('clicked_at', null); // 初回クリックのみ記録

  return !error;
}

/**
 * コンバージョン記録
 */
export async function recordConversion(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('tracking_tokens')
    .update({ converted_at: new Date().toISOString() })
    .eq('token', token);

  return !error;
}

/**
 * 応募完了ユーザー一覧取得
 */
export async function getConvertedUsers(limit = 50): Promise<ConvertedUser[]> {
  const { data, error } = await supabase
    .from('converted_users')
    .select('*')
    .order('last_conversion', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    userId: row.user_id,
    firstConversion: row.first_conversion,
    lastConversion: row.last_conversion,
    conversionCount: row.conversion_count,
    urlTypes: row.url_types || [],
  }));
}

/**
 * コンバージョン統計取得
 */
export async function getConversionStats(): Promise<ConversionStats | null> {
  const { data, error } = await supabase.rpc('get_conversion_stats');

  if (error || !data) return null;

  return {
    totalTokens: data.total_tokens,
    totalClicks: data.total_clicks,
    totalConversions: data.total_conversions,
    uniqueConvertedUsers: data.unique_converted_users,
    clickRate: data.click_rate,
    conversionRate: data.conversion_rate,
  };
}

/**
 * 日別コンバージョン取得
 */
export async function getDailyConversions(daysBack = 30) {
  const { data, error } = await supabase.rpc('get_daily_conversions', {
    days_back: daysBack,
  });

  if (error || !data) return [];

  return data;
}

/**
 * ユーザーのトラッキング履歴取得
 */
export async function getUserTrackingHistory(userId: string) {
  const { data, error } = await supabase
    .from('tracking_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    token: row.token,
    urlType: row.url_type,
    destinationUrl: row.destination_url,
    createdAt: row.created_at,
    clickedAt: row.clicked_at,
    convertedAt: row.converted_at,
  }));
}
