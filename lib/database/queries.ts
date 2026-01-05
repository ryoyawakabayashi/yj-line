import { supabase } from './supabase';
import { ConversationState, UserStatus } from '@/types/conversation';

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

export async function getConversationHistory(
  userId: string
): Promise<Array<{ role: string; content: string }>> {
  const { data, error } = await supabase
    .from('ai_conversation_history')
    .select('history')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return [];
  }

  return (data as { history: Array<{ role: string; content: string }> }).history || [];
}

export async function saveConversationHistory(
  userId: string,
  history: Array<{ role: string; content: string }>
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversation_history')
    .upsert({
      user_id: userId,
      history: history as any,
    });

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

// 会話状態をクリア(診断リセット用)
