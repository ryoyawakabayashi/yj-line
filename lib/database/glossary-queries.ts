import { supabase } from './supabase';

export interface GlossaryTerm {
  id: string;
  ja: string;
  ja_easy: string | null;
  en: string | null;
  ko: string | null;
  zh: string | null;
  vi: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// キャッシュ（5分TTL）
let cache: GlossaryTerm[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function clearGlossaryCache() {
  cache = null;
  cacheTime = 0;
}

/** 全用語を取得（キャッシュ付き） */
export async function getAllGlossaryTerms(): Promise<GlossaryTerm[]> {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

  const { data, error } = await supabase
    .from('glossary_terms')
    .select('*')
    .order('ja', { ascending: true });

  if (error) {
    console.error('用語集取得エラー:', error);
    return cache || [];
  }

  cache = data || [];
  cacheTime = Date.now();
  return cache;
}

/** 用語を作成 */
export async function createGlossaryTerm(
  term: Omit<GlossaryTerm, 'id' | 'created_at' | 'updated_at'>
): Promise<GlossaryTerm | null> {
  const { data, error } = await supabase
    .from('glossary_terms')
    .insert(term)
    .select()
    .single();

  if (error) {
    console.error('用語作成エラー:', error);
    return null;
  }

  clearGlossaryCache();
  return data;
}

/** 用語を更新 */
export async function updateGlossaryTerm(
  id: string,
  updates: Partial<Omit<GlossaryTerm, 'id' | 'created_at' | 'updated_at'>>
): Promise<GlossaryTerm | null> {
  const { data, error } = await supabase
    .from('glossary_terms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('用語更新エラー:', error);
    return null;
  }

  clearGlossaryCache();
  return data;
}

/** 用語を削除 */
export async function deleteGlossaryTerm(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('glossary_terms')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('用語削除エラー:', error);
    return false;
  }

  clearGlossaryCache();
  return true;
}

/** 翻訳プロンプト用のグロッサリー文字列を生成 */
export async function getGlossaryForPrompt(): Promise<string> {
  const terms = await getAllGlossaryTerms();
  if (terms.length === 0) return '';

  const lines = terms.map((t) => {
    const parts = [`ja="${t.ja}"`];
    if (t.ja_easy) parts.push(`ja_easy="${t.ja_easy}"`);
    if (t.en) parts.push(`en="${t.en}"`);
    if (t.ko) parts.push(`ko="${t.ko}"`);
    if (t.zh) parts.push(`zh="${t.zh}"`);
    if (t.vi) parts.push(`vi="${t.vi}"`);
    return `- ${parts.join(', ')}`;
  });

  return `\n\n## GLOSSARY — Use these exact terms:\n${lines.join('\n')}`;
}
