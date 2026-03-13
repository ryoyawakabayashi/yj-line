import { supabase } from './supabase';
import { ConversationState, UserStatus, CareerDiagnosisAnswers } from '@/types/conversation';

export async function getUserLang(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_status')
    .select('lang')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.log('ℹ️ ユーザー言語が見つかりません:', userId);
    return 'ja';
  }

  return (data as { lang: string }).lang || 'ja';
}

export async function saveUserLang(
  userId: string,
  lang: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('user_status')
    .upsert({
      user_id: userId,
      lang,
      rich_menu_id: null,
      ai_chat_count: 0,
      diagnosis_count: 0,
      total_usage_count: 0,
      first_used: now,
      last_used: now,
    });

  if (error) {
    console.error('❌ saveUserLang エラー:', error);
    throw error;
  }

  console.log('✅ 言語保存完了');
}

export async function getUserStatus(userId: string): Promise<UserStatus | null> {
  const { data, error } = await supabase
    .from('user_status')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    lang: data.lang,
    richMenuId: data.rich_menu_id || undefined,
    visaType: data.visa_type || undefined,
    ai_chat_count: data.ai_chat_count,
    diagnosis_count: data.diagnosis_count,
    total_usage_count: data.total_usage_count,
    first_used: new Date(data.first_used),
    last_used: new Date(data.last_used),
    timestamp: new Date(data.timestamp),
  };
}

export async function incrementAIChatCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_ai_chat_count', {
    p_user_id: userId
  });

  if (error) {
    console.error('❌ incrementAIChatCount エラー:', error);
  } else {
    console.log('✅ AI相談回数更新');
  }
}

export async function getUserVisaType(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_status')
    .select('visa_type')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return (data as { visa_type: string | null }).visa_type;
}

export async function saveUserVisaType(userId: string, visaType: string): Promise<void> {
  const { error } = await supabase
    .from('user_status')
    .update({ visa_type: visaType })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ saveUserVisaType エラー:', error);
    throw error;
  }
  console.log('✅ 在留資格保存完了:', visaType);
}

export async function incrementDiagnosisCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_diagnosis_count', {
    p_user_id: userId
  });

  if (error) {
    console.error('❌ incrementDiagnosisCount エラー:', error);
  } else {
    console.log('✅ 診断回数更新');
  }
}

export async function getConversationState(
  userId: string
): Promise<ConversationState | null> {
  const { data, error } = await supabase
    .from('conversation_state')
    .select('state')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return (data as { state: ConversationState }).state;
}

export async function saveConversationState(
  userId: string,
  state: ConversationState
): Promise<void> {
  const { error } = await supabase
    .from('conversation_state')
    .upsert({
      user_id: userId,
      state: state as any,
    });

  if (error) {
    console.error('❌ saveConversationState エラー:', error);
    throw error;
  }
}

export async function clearConversationState(userId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_state')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('❌ clearConversationState エラー:', error);
  }
}

export async function saveAnswerToSheet(
  userId: string,
  question: string,
  answer: string
): Promise<void> {
  const { error } = await supabase
    .from('user_answers')
    .insert({
      user_id: userId,
      question,
      answer,
    });

  if (error) {
    console.error('❌ saveAnswerToSheet エラー:', error);
  } else {
    console.log(`💾 保存完了: ${userId} | ${question} | ${answer}`);
  }
}

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export async function getConversationHistory(
  userId: string
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('ai_conversation_history')
    .select('history')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return [];
  }

  return (data as { history: ConversationMessage[] }).history || [];
}

export async function saveConversationHistory(
  userId: string,
  history: ConversationMessage[]
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversation_history')
    .upsert(
      {
        user_id: userId,
        history: history as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('❌ saveConversationHistory エラー:', error);
  }
}

export async function saveDiagnosisResult(
  userId: string,
  answers: any
): Promise<void> {
  const { error } = await supabase
    .from('diagnosis_results')
    .insert({
      user_id: userId,
      q1_living_in_japan: answers.living_in_japan,
      q2_gender: answers.gender,
      q3_urgency: answers.urgency,
      q4_prefecture: answers.prefecture,
      q4_region: answers.region,
      q5_japanese_level: answers.japanese_level,
      q6_industry: answers.industry,
      q7_work_style: answers.work_style,
    });

  if (error) {
    console.error('❌ saveDiagnosisResult エラー:', error);
  } else {
    console.log('✅ 診断結果を保存完了（横持ち）');
  }
}

// LINE友だち追加イベントを記録
export async function recordFollowEvent(
  userId: string,
  eventType: 'follow' | 'unfollow' = 'follow'
): Promise<void> {
  const { error } = await supabase
    .from('follow_events')
    .insert({
      user_id: userId,
      event_type: eventType,
    });

  if (error) {
    console.error('❌ recordFollowEvent エラー:', error);
  } else {
    console.log(`✅ ${eventType}イベントを記録: ${userId}`);
  }
}

// LINEプロフィール情報を保存・更新
export async function saveUserProfile(
  userId: string,
  displayName: string,
  pictureUrl?: string
): Promise<void> {
  const { error } = await supabase
    .from('user_status')
    .update({
      display_name: displayName,
      picture_url: pictureUrl || null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ saveUserProfile エラー:', error);
  } else {
    console.log('✅ プロフィール保存完了:', displayName);
  }
}

// LINEプロフィールを取得して保存（既存ユーザー用）
export async function fetchAndSaveUserProfile(userId: string): Promise<void> {
  const { getUserProfile } = await import('@/lib/line/client');
  const profile = await getUserProfile(userId);

  if (profile) {
    await saveUserProfile(userId, profile.displayName, profile.pictureUrl);
  }
}

// キャリアタイプ診断結果を保存
export async function saveCareerDiagnosisResult(
  userId: string,
  answers: CareerDiagnosisAnswers,
  typeCode: string,
  recommendedIndustries: string[],
  lang: string
): Promise<void> {
  const { error } = await supabase
    .from('career_diagnosis_results')
    .insert({
      user_id: userId,
      q1_answer: answers.q1 || null,
      q2_answer: answers.q2 || null,
      q3_answer: answers.q3 || null,
      q4_answer: answers.q4 || null,
      q5_answer: answers.q5 || null,
      q6_answer: answers.q6 || null,
      q7_answer: answers.q7 || null,
      q8_answer: answers.q8 || null,
      type_code: typeCode,
      recommended_industries: recommendedIndustries,
      lang,
    });

  if (error) {
    console.error('❌ saveCareerDiagnosisResult エラー:', error);
  } else {
    console.log('✅ キャリア診断結果を保存:', typeCode);
  }
}

// ============ JLPT問題 ============

export interface JlptQuestion {
  id: string;
  level: string;
  category: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: Record<string, string>;
}

/**
 * 未回答 or 不正解の承認済み問題をランダムに取得
 * 正解済みの問題は除外し、苦手な問題を優先的に出題
 */
export async function getJlptQuestions(
  userId: string,
  level: string,
  category: string,
  limit: number = 10
): Promise<JlptQuestion[]> {
  // 既に正解済みの問題IDを取得
  const { data: correctAnswers } = await supabase
    .from('jlpt_user_progress')
    .select('question_id')
    .eq('user_id', userId)
    .eq('is_correct', true);

  const correctIds = (correctAnswers || []).map((a: any) => a.question_id);

  // 承認済み問題を取得（正解済みを除外）
  let query = supabase
    .from('jlpt_questions')
    .select('id, level, category, question_text, options, correct_index, explanation')
    .eq('level', level)
    .eq('is_approved', true);

  // category が 'all' 以外ならカテゴリで絞り込み
  if (category !== 'all') {
    query = query.eq('category', category);
  }

  if (correctIds.length > 0) {
    query = query.not('id', 'in', `(${correctIds.join(',')})`);
  }

  const { data, error } = await query.limit(limit * 3); // 多めに取得してシャッフル

  if (error || !data || data.length === 0) {
    return [];
  }

  // シャッフルしてlimit件に絞る
  const shuffled = (data as JlptQuestion[]).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/**
 * 回答結果を保存
 */
export async function saveJlptAnswer(
  userId: string,
  questionId: string,
  isCorrect: boolean
): Promise<void> {
  const { error } = await supabase
    .from('jlpt_user_progress')
    .insert({
      user_id: userId,
      question_id: questionId,
      is_correct: isCorrect,
    });

  if (error) {
    console.error('❌ saveJlptAnswer エラー:', error);
  }
}

/**
 * ユーザーの進捗サマリーを取得
 */
export async function getJlptProgress(
  userId: string,
  level: string
): Promise<{ total: number; correct: number; byCategory: Record<string, { total: number; correct: number }> }> {
  // level に対応する問題IDを取得
  const { data: questions } = await supabase
    .from('jlpt_questions')
    .select('id, category')
    .eq('level', level)
    .eq('is_approved', true);

  if (!questions || questions.length === 0) {
    return { total: 0, correct: 0, byCategory: {} };
  }

  const questionIds = questions.map((q: any) => q.id);
  const questionCategoryMap: Record<string, string> = {};
  for (const q of questions) {
    questionCategoryMap[q.id] = (q as any).category;
  }

  // ユーザーの回答を取得
  const { data: answers } = await supabase
    .from('jlpt_user_progress')
    .select('question_id, is_correct')
    .eq('user_id', userId)
    .in('question_id', questionIds);

  const byCategory: Record<string, { total: number; correct: number }> = {};
  let total = 0;
  let correct = 0;

  for (const ans of answers || []) {
    const cat = questionCategoryMap[(ans as any).question_id] || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, correct: 0 };
    byCategory[cat].total++;
    total++;
    if ((ans as any).is_correct) {
      byCategory[cat].correct++;
      correct++;
    }
  }

  return { total, correct, byCategory };
}

// 会話状態をクリア(診断リセット用)
