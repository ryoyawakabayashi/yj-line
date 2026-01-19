// =====================================================
// FAQ Database Queries
// =====================================================

import { supabase } from './supabase';
import { ServiceType } from '@/types/support';

// =====================================================
// Types
// =====================================================

/**
 * FAQ (DB Row)
 */
export interface FAQRow {
  id: string;
  service: ServiceType;
  faq_key: string;
  keywords: string[];
  embedding: number[] | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

/**
 * FAQ Translation (DB Row)
 */
export interface FAQTranslationRow {
  id: string;
  faq_id: string;
  lang: string;
  question: string;
  answer: string;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * FAQ with Translation
 */
export interface FAQ {
  id: string;
  service: ServiceType;
  faqKey: string;
  keywords: string[];
  isActive: boolean;
  priority: number;
  question: string;
  answer: string;
  lang: string;
}

/**
 * FAQ Usage Log
 */
export interface FAQUsageLog {
  faqId: string;
  userId?: string;
  service?: ServiceType;
  userMessage?: string;
  confidence?: number;
  resolved?: boolean;
}

/**
 * FAQ Stats
 */
export interface FAQStats {
  faqId: string;
  faqKey: string;
  service: ServiceType;
  question: string;
  usageCount: number;
  resolvedCount: number;
  resolveRate: number;
}

// =====================================================
// Cache
// =====================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5分
const faqCache = new Map<string, CacheEntry<FAQ[]>>();

function getCacheKey(service: ServiceType | 'all', lang: string): string {
  return `${service}:${lang}`;
}

function getFromCache(key: string): FAQ[] | null {
  const entry = faqCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    faqCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: FAQ[]): void {
  faqCache.set(key, { data, timestamp: Date.now() });
}

/**
 * キャッシュをクリア
 */
export function clearFAQCache(): void {
  faqCache.clear();
}

// =====================================================
// Query Functions
// =====================================================

/**
 * サービス別FAQを取得
 */
export async function getFAQsByService(
  service: ServiceType,
  lang: string = 'ja'
): Promise<FAQ[]> {
  const cacheKey = getCacheKey(service, lang);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('faqs')
    .select(`
      id,
      service,
      faq_key,
      keywords,
      is_active,
      priority,
      faq_translations!inner (
        lang,
        question,
        answer
      )
    `)
    .eq('service', service)
    .eq('is_active', true)
    .eq('faq_translations.lang', lang)
    .order('priority', { ascending: false });

  if (error) {
    console.error('❌ getFAQsByService エラー:', error);
    return [];
  }

  const faqs: FAQ[] = (data || []).map((row: any) => ({
    id: row.id,
    service: row.service,
    faqKey: row.faq_key,
    keywords: row.keywords || [],
    isActive: row.is_active,
    priority: row.priority,
    question: row.faq_translations[0]?.question || '',
    answer: row.faq_translations[0]?.answer || '',
    lang,
  }));

  setCache(cacheKey, faqs);
  return faqs;
}

/**
 * 全サービスのFAQを取得
 */
export async function getAllFAQs(lang: string = 'ja'): Promise<FAQ[]> {
  const cacheKey = getCacheKey('all', lang);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('faqs')
    .select(`
      id,
      service,
      faq_key,
      keywords,
      is_active,
      priority,
      faq_translations!inner (
        lang,
        question,
        answer
      )
    `)
    .eq('is_active', true)
    .eq('faq_translations.lang', lang)
    .order('priority', { ascending: false });

  if (error) {
    console.error('❌ getAllFAQs エラー:', error);
    return [];
  }

  const faqs: FAQ[] = (data || []).map((row: any) => ({
    id: row.id,
    service: row.service,
    faqKey: row.faq_key,
    keywords: row.keywords || [],
    isActive: row.is_active,
    priority: row.priority,
    question: row.faq_translations[0]?.question || '',
    answer: row.faq_translations[0]?.answer || '',
    lang,
  }));

  setCache(cacheKey, faqs);
  return faqs;
}

/**
 * FAQ IDで取得
 */
export async function getFAQById(
  faqId: string,
  lang: string = 'ja'
): Promise<FAQ | null> {
  const { data, error } = await supabase
    .from('faqs')
    .select(`
      id,
      service,
      faq_key,
      keywords,
      is_active,
      priority,
      faq_translations!inner (
        lang,
        question,
        answer
      )
    `)
    .eq('id', faqId)
    .eq('faq_translations.lang', lang)
    .single();

  if (error) {
    console.error('❌ getFAQById エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    service: data.service,
    faqKey: data.faq_key,
    keywords: data.keywords || [],
    isActive: data.is_active,
    priority: data.priority,
    question: (data.faq_translations as any)[0]?.question || '',
    answer: (data.faq_translations as any)[0]?.answer || '',
    lang,
  };
}

/**
 * FAQ Keyで取得
 */
export async function getFAQByKey(
  faqKey: string,
  lang: string = 'ja'
): Promise<FAQ | null> {
  const { data, error } = await supabase
    .from('faqs')
    .select(`
      id,
      service,
      faq_key,
      keywords,
      is_active,
      priority,
      faq_translations!inner (
        lang,
        question,
        answer
      )
    `)
    .eq('faq_key', faqKey)
    .eq('faq_translations.lang', lang)
    .single();

  if (error) {
    console.error('❌ getFAQByKey エラー:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    service: data.service,
    faqKey: data.faq_key,
    keywords: data.keywords || [],
    isActive: data.is_active,
    priority: data.priority,
    question: (data.faq_translations as any)[0]?.question || '',
    answer: (data.faq_translations as any)[0]?.answer || '',
    lang,
  };
}

/**
 * キーワードでFAQ検索
 */
export async function searchFAQsByKeyword(
  keyword: string,
  service?: ServiceType,
  lang: string = 'ja'
): Promise<FAQ[]> {
  const lowerKeyword = keyword.toLowerCase();

  // まずキャッシュから検索
  const cacheKey = getCacheKey(service || 'all', lang);
  let faqs = getFromCache(cacheKey);

  if (!faqs) {
    // キャッシュがなければDBから取得
    faqs = service
      ? await getFAQsByService(service, lang)
      : await getAllFAQs(lang);
  }

  // キーワードマッチング
  return faqs.filter((faq) => {
    // FAQ keywordsでマッチ
    if (faq.keywords.some((k) => k.toLowerCase().includes(lowerKeyword))) {
      return true;
    }
    // 質問文でマッチ
    if (faq.question.toLowerCase().includes(lowerKeyword)) {
      return true;
    }
    // 回答文でマッチ
    if (faq.answer.toLowerCase().includes(lowerKeyword)) {
      return true;
    }
    return false;
  });
}

/**
 * ベクトル検索でFAQ取得（pgvector使用）
 */
export async function searchFAQsByVector(
  embedding: number[],
  service?: ServiceType,
  lang: string = 'ja',
  limit: number = 5,
  threshold: number = 0.7
): Promise<Array<FAQ & { similarity: number }>> {
  // RPC関数を呼び出し
  const { data, error } = await supabase.rpc('search_faqs_by_vector', {
    query_embedding: embedding,
    p_service: service || null,
    p_lang: lang,
    p_limit: limit,
    p_threshold: threshold,
  });

  if (error) {
    console.error('❌ searchFAQsByVector エラー:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    service: row.service,
    faqKey: row.faq_key,
    keywords: row.keywords || [],
    isActive: true,
    priority: row.priority,
    question: row.question,
    answer: row.answer,
    lang,
    similarity: row.similarity,
  }));
}

// =====================================================
// Usage Logging
// =====================================================

/**
 * FAQ利用ログを記録
 */
export async function logFAQUsage(params: FAQUsageLog): Promise<boolean> {
  const { error } = await supabase.from('faq_usage_logs').insert({
    faq_id: params.faqId,
    user_id: params.userId || null,
    service: params.service || null,
    user_message: params.userMessage || null,
    confidence: params.confidence || null,
    resolved: params.resolved ?? null,
  });

  if (error) {
    console.error('❌ logFAQUsage エラー:', error);
    return false;
  }

  return true;
}

/**
 * FAQ解決フィードバックを更新
 */
export async function updateFAQResolved(
  logId: string,
  resolved: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('faq_usage_logs')
    .update({ resolved })
    .eq('id', logId);

  if (error) {
    console.error('❌ updateFAQResolved エラー:', error);
    return false;
  }

  return true;
}

// =====================================================
// Stats
// =====================================================

/**
 * FAQ利用統計を取得
 */
export async function getFAQStats(
  service?: ServiceType,
  days: number = 30
): Promise<FAQStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase.rpc('get_faq_stats', {
    p_service: service || null,
    p_start_date: startDate.toISOString(),
  });

  if (error) {
    console.error('❌ getFAQStats エラー:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    faqId: row.faq_id,
    faqKey: row.faq_key,
    service: row.service,
    question: row.question,
    usageCount: row.usage_count,
    resolvedCount: row.resolved_count,
    resolveRate: row.resolve_rate,
  }));
}

// =====================================================
// Admin Functions
// =====================================================

/**
 * FAQを追加
 */
export async function createFAQ(params: {
  service: ServiceType;
  faqKey: string;
  keywords?: string[];
  priority?: number;
  translations: Array<{
    lang: string;
    question: string;
    answer: string;
  }>;
}): Promise<string | null> {
  // FAQ本体を作成
  const { data: faqData, error: faqError } = await supabase
    .from('faqs')
    .insert({
      service: params.service,
      faq_key: params.faqKey,
      keywords: params.keywords || [],
      priority: params.priority || 0,
    })
    .select('id')
    .single();

  if (faqError) {
    console.error('❌ createFAQ エラー:', faqError);
    return null;
  }

  // 翻訳を追加
  const translations = params.translations.map((t) => ({
    faq_id: faqData.id,
    lang: t.lang,
    question: t.question,
    answer: t.answer,
  }));

  const { error: transError } = await supabase
    .from('faq_translations')
    .insert(translations);

  if (transError) {
    console.error('❌ createFAQ translations エラー:', transError);
    // FAQを削除
    await supabase.from('faqs').delete().eq('id', faqData.id);
    return null;
  }

  // キャッシュをクリア
  clearFAQCache();

  console.log('✅ FAQ作成:', faqData.id);
  return faqData.id;
}

/**
 * FAQを更新
 */
export async function updateFAQ(
  faqId: string,
  updates: {
    keywords?: string[];
    priority?: number;
    isActive?: boolean;
  }
): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from('faqs')
    .update(dbUpdates)
    .eq('id', faqId);

  if (error) {
    console.error('❌ updateFAQ エラー:', error);
    return false;
  }

  // キャッシュをクリア
  clearFAQCache();

  return true;
}

/**
 * FAQ翻訳を更新
 */
export async function updateFAQTranslation(
  faqId: string,
  lang: string,
  updates: {
    question?: string;
    answer?: string;
  }
): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.question !== undefined) dbUpdates.question = updates.question;
  if (updates.answer !== undefined) dbUpdates.answer = updates.answer;

  const { error } = await supabase
    .from('faq_translations')
    .update(dbUpdates)
    .eq('faq_id', faqId)
    .eq('lang', lang);

  if (error) {
    console.error('❌ updateFAQTranslation エラー:', error);
    return false;
  }

  // キャッシュをクリア
  clearFAQCache();

  return true;
}

/**
 * FAQを削除
 */
export async function deleteFAQ(faqId: string): Promise<boolean> {
  const { error } = await supabase.from('faqs').delete().eq('id', faqId);

  if (error) {
    console.error('❌ deleteFAQ エラー:', error);
    return false;
  }

  // キャッシュをクリア
  clearFAQCache();

  return true;
}
