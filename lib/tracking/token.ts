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
 * トラッキングトークン付きURLを生成
 */
export async function generateTrackingUrl(
  userId: string,
  baseUrl: string,
  urlType: string
): Promise<string> {
  // 8文字のランダムトークン生成
  const token = crypto.randomBytes(4).toString('hex');

  // 有効期限: 30日
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // DBに保存
  await supabase.from('tracking_tokens').insert({
    token,
    user_id: userId,
    url_type: urlType,
    destination_url: baseUrl,
    expires_at: expiresAt.toISOString(),
  });

  // URLにパラメータ追加
  const url = new URL(baseUrl);
  url.searchParams.set('ref', token);
  url.searchParams.set('utm_source', 'line');
  url.searchParams.set('utm_medium', 'bot');
  url.searchParams.set('utm_campaign', urlType);

  return url.toString();
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
