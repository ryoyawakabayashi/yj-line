import { LineEvent } from '@/types/line';
import { ConversationState, DiagnosisAnswers } from '@/types/conversation';
import {
  getConversationState,
  saveConversationState,
  getUserLang,
  saveAnswerToSheet,
  incrementDiagnosisCount,
  saveDiagnosisResult,
} from '../database/queries';
import { replyMessage, replyWithQuickReply, showLoadingAnimation } from '../line/client';
import { MAJOR_PREFECTURES, REGION_MASTER, PREFECTURE_BY_REGION } from '../masters';
import { buildYoloUrlsByLevel } from '../utils/url';
import { supabase } from '../database/client';
import { processUrl } from '../tracking/url-processor';

// フォローアップ用のQuickReplyラベル
const FOLLOWUP_LABELS = {
  yes: { ja: 'はい', en: 'Yes', ko: '네', zh: '是的', vi: 'Có' },
  no: { ja: 'いいえ', en: 'No', ko: '아니오', zh: '没有', vi: 'Không' },
  not_yet: { ja: 'まだ見ていない', en: 'Not yet', ko: '아직', zh: '还没', vi: 'Chưa' },
};

const FOLLOWUP_QUESTION = {
  ja: '求人ページ閲覧後にお答えください😌\n応募はできましたか？',
  en: 'Please answer after viewing the job page 😌\nDid you apply?',
  ko: '구인 페이지를 본 후 답해주세요 😌\n지원하셨나요?',
  zh: '请在查看招聘页面后回答 😌\n您申请了吗？',
  vi: 'Vui lòng trả lời sau khi xem trang việc làm 😌\nBạn đã ứng tuyển chưa?',
};

/**
 * プリセットデータ（ファネルフローからの引き継ぎ用）
 */
export interface DiagnosisPresetData {
  prefecture?: string;
  region?: string;
  industry?: string;
  workingDays?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
}

export async function startDiagnosisMode(
  userId: string,
  replyToken: string,
  lang: string,
  presetData?: DiagnosisPresetData
): Promise<void> {
  console.log('=== AI診断モード開始 ===');
  if (presetData) {
    console.log('📋 プリセットデータ:', presetData);
  }

  // ローディングアニメーション表示（非同期で即座に実行、待たない）
  showLoadingAnimation(userId, 3).catch(() => {});

  // 既存の回答を取得
  const existingAnswers = await getExistingAnswers(userId);

  // 初期状態
  let currentQuestion = 1;
  let answers: Partial<DiagnosisAnswers> = {};

  // 日本在住が既に回答済みならスキップ（Yes/No両方）
  // データベースカラム名は q1_living_in_japan
  if (existingAnswers.q1_living_in_japan) {
    console.log(`✅ 日本在住(${existingAnswers.q1_living_in_japan})回答済みなのでQ1をスキップ`);
    answers.living_in_japan = existingAnswers.q1_living_in_japan;
    currentQuestion = 2;
  }

  // 性別が既に回答済みならスキップ
  // データベースカラム名は q2_gender
  if (existingAnswers.q2_gender) {
    console.log(`✅ 性別(${existingAnswers.q2_gender})回答済みなのでQ2をスキップ`);
    answers.gender = existingAnswers.q2_gender;
    // Q1がスキップされていなくても、Q2はスキップ対象にマーク
    if (currentQuestion <= 2) {
      currentQuestion = 3;
    }
  }

  // プリセットデータがあれば適用
  if (presetData) {
    // 緊急度がプリセットされていればQ3をスキップ
    if (presetData.urgency) {
      const urgencyMap: Record<string, string> = {
        immediate: 'immediate',
        soon: 'within_2weeks',
        flexible: 'not_urgent',
      };
      answers.urgency = urgencyMap[presetData.urgency] as any;
      console.log(`✅ 緊急度(${presetData.urgency})プリセット済みなのでQ3をスキップ`);
      if (currentQuestion <= 3) {
        currentQuestion = 4;
      }
    }

    // 都道府県がプリセットされていればQ4をスキップ
    if (presetData.prefecture) {
      answers.prefecture = presetData.prefecture;
      answers.region = presetData.region || getRegionByPrefecture(presetData.prefecture);
      console.log(`✅ 都道府県(${presetData.prefecture})プリセット済みなのでQ4をスキップ`);
      if (currentQuestion <= 4) {
        currentQuestion = 5;
      }
    }
  }

  const state: ConversationState = {
    mode: 'diagnosis',
    currentQuestion,
    answers,
    selectedIndustries: [],
    lang,
  };

  await saveConversationState(userId, state);

  const questionObj = getQuestion(currentQuestion, lang);

  if (!questionObj) {
    const errorMessages: Record<string, string> = {
      ja: '申し訳ございません。エラーが発生しました。',
      en: 'Sorry, an error occurred.',
      ko: '죄송합니다. 오류가 발생했습니다.',
      zh: '抱歉，发生了错误。',
      vi: 'Xin lỗi, đã xảy ra lỗi.',
    };
    await replyMessage(replyToken, {
      type: 'text',
      text: errorMessages[lang] || errorMessages.ja,
    });
    return;
  }

  const initialMessages: Record<string, string> = {
    ja: 'それでは診断を開始します！📋',
    en: "Let's start the diagnosis! 📋",
    ko: '진단을 시작합니다! 📋',
    zh: '开始诊断！📋',
    vi: 'Bắt đầu chẩn đoán! 📋',
  };

  // 最初の質問にも進捗表示を追加
  const progressPrefix = getProgressPrefix(currentQuestion, lang);
  const questionTextWithProgress = `${progressPrefix}\n${questionObj.text}`;

  await replyMessage(replyToken, [
    {
      type: 'text',
      text: initialMessages[lang] || initialMessages.ja,
    },
    {
      type: 'text',
      text: questionTextWithProgress,
      quickReply: {
        items: questionObj.options,
      },
    },
  ]);
}

export async function handleDiagnosisAnswer(event: LineEvent): Promise<void> {
  const userId = event.source.userId;
  const userAnswer = event.message?.text || '';
  const replyToken = event.replyToken;

  const state = await getConversationState(userId);

  if (!state || state.mode !== 'diagnosis') {
    console.log('⚠️ 診断モードではありません');
    return;
  }

  console.log(`=== Q${state.currentQuestion} 回答処理 ===`);
  console.log('ユーザー回答:', userAnswer);

  const currentQ = state.currentQuestion;

  if (currentQ === 1) {
    state.answers.living_in_japan = userAnswer as any;
    // 性別が既に回答済みならQ3へ、そうでなければQ2へ
    // データベースカラム名は q2_gender
    const existingAnswers = await getExistingAnswers(userId);
    if (existingAnswers.q2_gender) {
      console.log(`✅ 性別(${existingAnswers.q2_gender})回答済みなのでQ2をスキップ`);
      state.answers.gender = existingAnswers.q2_gender;
      state.currentQuestion = 3;
    } else {
      state.currentQuestion = 2;
    }
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 2) {
    state.answers.gender = userAnswer as any;
    state.currentQuestion = 3;
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 3) {
    state.answers.urgency = userAnswer as any;
    state.currentQuestion = 4;
    state.q4_step = 'select_major';
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 4 && state.q4_step === 'select_major') {
    if (userAnswer === 'other_region') {
      state.q4_step = 'select_region';
      await saveConversationState(userId, state);
      await askQuestion(userId, state, replyToken);
      return;
    } else {
      state.answers.prefecture = userAnswer;
      state.answers.region = getRegionByPrefecture(userAnswer);
      state.currentQuestion = 5;
      delete state.q4_step;
      await saveConversationState(userId, state);
      await askQuestion(userId, state, replyToken);
      return;
    }
  }

  if (currentQ === 4 && state.q4_step === 'select_region') {
    state.selectedRegion = userAnswer;
    state.q4_step = 'select_prefecture';
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 4 && state.q4_step === 'select_prefecture') {
    state.answers.prefecture = userAnswer;
    state.answers.region = state.selectedRegion;
    state.currentQuestion = 5;
    delete state.q4_step;
    delete state.selectedRegion;
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 5) {
    state.answers.japanese_level = userAnswer as any;
    state.currentQuestion = 6;
    state.selectedIndustries = [];
    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 6) {
    if (userAnswer === 'none') {
      if (state.selectedIndustries && state.selectedIndustries.length > 0) {
        state.answers.industry = state.selectedIndustries.join(',');
      }
      state.currentQuestion = 7;
      await saveConversationState(userId, state);
      await askQuestion(userId, state, replyToken);
      return;
    }

    if (!state.selectedIndustries) {
      state.selectedIndustries = [];
    }
    state.selectedIndustries.push(userAnswer);

    if (state.selectedIndustries.length >= 3) {
      state.answers.industry = state.selectedIndustries.join(',');
      state.currentQuestion = 7;
      await saveConversationState(userId, state);
      await askQuestion(userId, state, replyToken);
      return;
    }

    await saveConversationState(userId, state);
    await askQuestion(userId, state, replyToken);
    return;
  }

  if (currentQ === 7) {
    state.answers.work_style = userAnswer as any;
    await saveConversationState(userId, state);
    await finishDiagnosis(userId, state, replyToken);
    return;
  }
}

async function askQuestion(
  userId: string,
  state: ConversationState,
  replyToken: string
): Promise<void> {
  const lang = state.lang || (await getUserLang(userId));
  const currentQ = state.currentQuestion;

  // 進捗プレフィックスを取得
  const progressPrefix = getProgressPrefix(currentQ!, lang);

  if (currentQ === 4) {
    if (state.q4_step === 'select_major') {
      const question = getQuestion(4, lang);
      if (question) {
        const textWithProgress = `${progressPrefix}\n${question.text}`;
        await replyWithQuickReply(replyToken, textWithProgress, question.options);
      }
      return;
    } else if (state.q4_step === 'select_region') {
      const question = getQuestion('q4_region', lang);
      if (question) {
        // サブステップは進捗表示なし（同じ質問の続きなので）
        await replyWithQuickReply(replyToken, question.text, question.options);
      }
      return;
    } else if (state.q4_step === 'select_prefecture') {
      const regionKey = (state.selectedRegion || 'kanto') as keyof typeof PREFECTURE_BY_REGION;
      const prefectures = PREFECTURE_BY_REGION[regionKey] || [];
      const questionText: Record<string, string> = {
        ja: 'どの都道府県ですか？',
        en: 'Which prefecture?',
        ko: '어느 현입니까?',
        zh: '哪个都道府县？',
        vi: 'Tỉnh nào?',
      };

      const options = prefectures.slice(0, 13).map((pref: any) => ({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: pref[`label_${lang}` as keyof typeof pref] || pref.label_ja,
          text: pref.code,
        },
      }));

      if (options.length > 0) {
        // サブステップは進捗表示なし
        await replyWithQuickReply(replyToken, questionText[lang] || questionText.ja, options);
      }
      return;
    }
  }

  if (currentQ === 6) {
    await askIndustryQuestion(userId, state, replyToken, progressPrefix);
    return;
  }

  const question = getQuestion(currentQ!, lang);

  if (!question) {
    const retryMessages: Record<string, string> = {
      ja: 'エラーが発生しました。もう一度お試しください。',
      en: 'An error occurred. Please try again.',
      ko: '오류가 발생했습니다. 다시 시도해 주세요.',
      zh: '发生错误，请重试。',
      vi: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    };
    await replyMessage(replyToken, {
      type: 'text',
      text: retryMessages[lang] || retryMessages.ja,
    });
    return;
  }

  const textWithProgress = `${progressPrefix}\n${question.text}`;
  await replyWithQuickReply(replyToken, textWithProgress, question.options);
}

async function askIndustryQuestion(
  userId: string,
  state: ConversationState,
  replyToken: string,
  progressPrefix?: string
): Promise<void> {
  const lang = await getUserLang(userId);
  const selectedCount = (state.selectedIndustries || []).length;

  const questionText: Record<string, string> =
    selectedCount === 0
      ? {
          ja: '希望業界は？',
          en: 'Preferred industry?',
          ko: '희망 업종은?',
          zh: '希望行业？',
          vi: 'Ngành mong muốn?',
        }
      : {
          ja: '他に希望業界はありますか？',
          en: 'Any other industry?',
          ko: '다른 희망 업종은?',
          zh: '还有其他希望行业吗？',
          vi: 'Có ngành nào khác không?',
        };

  const { INDUSTRY_MASTER } = await import('../masters');

  const availableIndustries = Object.values(INDUSTRY_MASTER).filter(
    (industry: any) => !(state.selectedIndustries || []).includes(industry.key)
  );

  const options = availableIndustries.map((industry: any) => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: industry[`label_${lang}` as keyof typeof industry] || industry.label_ja,
      text: industry.key,
    },
  }));

  options.push({
    type: 'action',
    action: {
      type: 'message',
      label: ({ ja: 'なし', en: 'None', ko: '없음', zh: '无', vi: 'Không' } as any)[lang] || 'なし',
      text: 'none',
    },
  });

  // 最初の業界選択時のみ進捗表示、追加選択時は表示しない
  const baseText = questionText[lang] || questionText.ja;
  const textWithProgress = (progressPrefix && selectedCount === 0)
    ? `${progressPrefix}\n${baseText}`
    : baseText;

  await replyWithQuickReply(replyToken, textWithProgress, options);
}

async function finishDiagnosis(
  userId: string,
  state: ConversationState,
  replyToken: string
): Promise<void> {
  console.log('=== 診断完了処理開始 ===');
  console.log('userId:', userId);
  console.log('replyToken存在:', !!replyToken);

  // ローディングアニメーション表示（5秒間、非同期で即座に実行）
  showLoadingAnimation(userId, 5).catch(() => {});

  if (state.selectedIndustries && state.selectedIndustries.length > 0) {
    state.answers.industry = state.selectedIndustries.join(',');
  }

  await saveAllAnswersToSheet(userId, state);

  const lang = await getUserLang(userId);

  const linkItems = buildYoloUrlsByLevel(state.answers, lang);

  // 各URLにトラッキングトークンを付与
  const trackedLinkItems = await Promise.all(
    linkItems.map(async (item) => ({
      ...item,
      url: await processUrl(item.url, userId, 'diagnosis'),
    }))
  );

  // デバッグ: 診断結果URLをログ出力
  console.log('📤 診断結果URL:', trackedLinkItems.map(item => ({
    label: item.label,
    url: item.url
  })));

  const titleText: Record<string, string> = {
    ja: '診断が完了しました！\nあなたにぴったりのお仕事はこちら',
    en: 'Diagnosis completed!\nJobs that match you',
    ko: '진단이 완료되었습니다!\n당신에게 맞는 일자리는 아래',
    zh: '诊断已完成！\n适合您的工作如下',
    vi: 'Hoàn tất chẩn đoán!\nCông việc phù hợp với bạn',
  };

  // フォローアップモードに移行
  state.mode = 'followup';
  state.currentQuestion = null;
  state.followupStep = 'ask_applied';
  state.followupAnswers = {};
  await saveConversationState(userId, state);

  // 診断結果 + フォローアップ質問を送信
  const followupQuestion = FOLLOWUP_QUESTION[lang as keyof typeof FOLLOWUP_QUESTION] || FOLLOWUP_QUESTION.ja;
  const yesLabel = FOLLOWUP_LABELS.yes[lang as keyof typeof FOLLOWUP_LABELS.yes] || FOLLOWUP_LABELS.yes.ja;
  const noLabel = FOLLOWUP_LABELS.no[lang as keyof typeof FOLLOWUP_LABELS.no] || FOLLOWUP_LABELS.no.ja;

  console.log('📤 診断結果 + フォローアップ質問を送信中...');
  console.log('followupQuestion:', followupQuestion);

  // Flex Messageで診断結果を表示（URLプレビューを避けるため）
  const diagnosisResultFlex = createDiagnosisResultFlex(
    titleText[lang] || titleText.ja,
    trackedLinkItems
  );

  const messages = [
    diagnosisResultFlex,
    {
      type: 'text' as const,
      text: followupQuestion,
      quickReply: {
        items: [
          {
            type: 'action' as const,
            action: { type: 'message' as const, label: yesLabel, text: 'FOLLOWUP_YES' },
          },
          {
            type: 'action' as const,
            action: { type: 'message' as const, label: noLabel, text: 'FOLLOWUP_NO' },
          },
        ],
      },
    },
  ];

  const success = await replyMessage(replyToken, messages);
  console.log('📤 replyMessage結果:', success ? '✅成功' : '❌失敗');
}

/**
 * 診断結果用Flex Messageを作成
 * URLプレビュー（OGP）を回避するためにFlex Messageを使用
 */
function createDiagnosisResultFlex(
  title: string,
  linkItems: Array<{ label: string; url: string; description?: string }>
): any {
  const buttons = linkItems.map((item) => ({
    type: 'box',
    layout: 'vertical',
    contents: [
      ...(item.description
        ? [
            {
              type: 'text',
              text: item.description,
              size: 'xs',
              color: '#666666',
              wrap: true,
            },
          ]
        : []),
      {
        type: 'button',
        action: {
          type: 'uri',
          label: item.label.length > 20 ? item.label.substring(0, 17) + '...' : item.label,
          uri: item.url,
        },
        style: 'primary',
        color: '#d10a1c',
        height: 'sm',
        margin: item.description ? 'sm' : 'none',
      },
    ],
    margin: 'lg',
  }));

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✨',
            size: 'xxl',
            align: 'center',
          },
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            color: '#1DB446',
            align: 'center',
            wrap: true,
            margin: 'md',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#FFFFFF',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: buttons,
        paddingAll: '20px',
        spacing: 'md',
      },
    },
  };
}

async function saveAllAnswersToSheet(userId: string, state: ConversationState): Promise<void> {
  const answers = state.answers;

  if (answers.living_in_japan) {
    await saveAnswerToSheet(userId, 'q1', answers.living_in_japan);
  }
  if (answers.gender) {
    await saveAnswerToSheet(userId, 'q2', answers.gender);
  }
  if (answers.urgency) {
    await saveAnswerToSheet(userId, 'q3', answers.urgency);
  }
  if (answers.prefecture) {
    await saveAnswerToSheet(userId, 'q4', answers.prefecture);
  }
  if (answers.japanese_level) {
    await saveAnswerToSheet(userId, 'q5', answers.japanese_level);
  }
  if (state.selectedIndustries && state.selectedIndustries.length > 0) {
    state.selectedIndustries.forEach((industry, index) => {
      saveAnswerToSheet(userId, `q6_${index + 1}`, industry);
    });
  }
  if (answers.work_style) {
    await saveAnswerToSheet(userId, 'q7', answers.work_style);
  }

  // 診断結果をdiagnosis_resultsテーブルに保存（ダッシュボード表示用）
  await saveDiagnosisResult(userId, answers);

  await incrementDiagnosisCount(userId);
}

function getRegionByPrefecture(prefecture: string): string {
  const regionMap: Record<string, string> = {
    tokyo: 'kanto',
    osaka: 'kansai',
    kyoto: 'kansai',
    saitama: 'kanto',
    kanagawa: 'kanto',
    chiba: 'kanto',
  };

  return regionMap[prefecture] || 'kanto';
}

async function getExistingAnswers(userId: string): Promise<any> {
  const { data } = await supabase
    .from('diagnosis_results')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  return data || {};
}

// 最終質問番号の定数
const FINAL_QUESTION = 7;

// 残り問数を計算（スキップされた質問を考慮）
function getRemainingQuestions(currentQuestion: number, skippedCount: number = 0): number {
  // 実際の残り問数 = (最終問 - 現在の問 + 1) - スキップ済み
  // 例: currentQuestion=3, skipped=2 → 残り = (7 - 3 + 1) = 5問
  // ただしスキップは開始時に行われるので、currentQuestion自体がすでに調整済み
  return FINAL_QUESTION - currentQuestion + 1;
}

// 進捗プレフィックスを生成
function getProgressPrefix(currentQuestion: number, lang: string, skippedCount: number = 0): string {
  const remaining = getRemainingQuestions(currentQuestion, skippedCount);
  const progressLabels: Record<string, (n: number) => string> = {
    ja: (n) => `【残り${n}問】`,
    en: (n) => `【${n} left】`,
    ko: (n) => `【${n}개 남음】`,
    zh: (n) => `【还剩${n}题】`,
    vi: (n) => `【Còn ${n} câu】`,
  };
  const formatter = progressLabels[lang] || progressLabels.ja;
  return formatter(remaining);
}

function getQuestion(
  questionId: number | string,
  lang: string
): { text: string; options: any[] } | null {
  const { JAPANESE_LEVEL, WORK_STYLE } = require('../masters');

  const questions: Record<string | number, any> = {
    1: {
      text: ({
        ja: '日本に住んでいますか？',
        en: 'Do you live in Japan?',
        ko: '일본에 살고 있습니까?',
        zh: '您住在日本吗？',
        vi: 'Bạn có sống ở Nhật Bản không?',
      } as any)[lang],
      options: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: ({ ja: 'はい', en: 'Yes', ko: '예', zh: '是', vi: 'Có' } as any)[lang],
            text: 'yes',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: ({ ja: 'いいえ', en: 'No', ko: '아니오', zh: '否', vi: 'Không' } as any)[lang],
            text: 'no',
          },
        },
      ],
    },
    2: {
      text: ({
        ja: '性別を教えてください',
        en: 'Gender?',
        ko: '성별을 알려주세요',
        zh: '请告诉我您的性别',
        vi: 'Giới tính?',
      } as any)[lang],
      options: [
        {
          type: 'action',
          action: { type: 'message', label: ({ ja: '男性', en: 'Male', ko: '남성', zh: '男', vi: 'Nam' } as any)[lang], text: 'male' },
        },
        {
          type: 'action',
          action: { type: 'message', label: ({ ja: '女性', en: 'Female', ko: '여성', zh: '女', vi: 'Nữ' } as any)[lang], text: 'female' },
        },
        {
          type: 'action',
          action: { type: 'message', label: ({ ja: 'その他', en: 'Other', ko: '기타', zh: '其他', vi: 'Khác' } as any)[lang], text: 'other' },
        },
      ],
    },
    3: {
      text: ({
        ja: 'どのくらい急ぎですか？',
        en: 'How urgent?',
        ko: '얼마나 급하신가요?',
        zh: '有多紧急？',
        vi: 'Mức độ khẩn cấp?',
      } as any)[lang],
      options: [
        {
          type: 'action',
          action: { type: 'message', label: ({ ja: '今すぐ', en: 'Now', ko: '즉시', zh: '立即', vi: 'Ngay' } as any)[lang], text: 'immediate' },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: ({ ja: '1〜2週間', en: '1-2 weeks', ko: '1-2주', zh: '1-2周', vi: '1-2 tuần' } as any)[lang],
            text: 'within_2weeks',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: ({ ja: '急ぎでない', en: 'Not urgent', ko: '급하지 않음', zh: '不急', vi: 'Không gấp' } as any)[lang],
            text: 'not_urgent',
          },
        },
      ],
    },
    4: {
      text: ({
        ja: 'お探しの都道府県は？',
        en: 'Which prefecture?',
        ko: '원하는 현은?',
        zh: '您想找哪个都道府县？',
        vi: 'Tỉnh nào?',
      } as any)[lang],
      options: [
        ...Object.values(MAJOR_PREFECTURES).map((pref: any) => ({
          type: 'action',
          action: {
            type: 'message',
            label: pref[`label_${lang}`] || pref.label_ja,
            text: pref.code,
          },
        })),
        {
          type: 'action',
          action: {
            type: 'message',
            label: ({ ja: 'ここにない地方', en: 'Other region', ko: '다른 지역', zh: '其他地区', vi: 'Khu vực khác' } as any)[lang],
            text: 'other_region',
          },
        },
      ],
    },
    q4_region: {
      text: ({
        ja: '地方を選んでください',
        en: 'Select region',
        ko: '지역을 선택하세요',
        zh: '选择地区',
        vi: 'Chọn khu vực',
      } as any)[lang],
      options: Object.values(REGION_MASTER).map((region: any) => ({
        type: 'action',
        action: {
          type: 'message',
          label: region[`label_${lang}`] || region.label_ja,
          text: region.code,
        },
      })),
    },
    5: {
      text: ({
        ja: '日本語レベルは？',
        en: 'Japanese level?',
        ko: '일본어 수준은?',
        zh: '日语水平？',
        vi: 'Trình độ tiếng Nhật?',
      } as any)[lang],
      options: Object.values(JAPANESE_LEVEL).map((level: any) => ({
        type: 'action',
        action: {
          type: 'message',
          label: level[`label_${lang}`] || level.label_ja,
          text: level.code,
        },
      })),
    },
    7: {
      text: ({
        ja: '雇用形態は？',
        en: 'Employment type?',
        ko: '고용 형태는?',
        zh: '雇佣形式？',
        vi: 'Hình thức làm việc?',
      } as any)[lang],
      options: Object.values(WORK_STYLE).map((style: any) => ({
        type: 'action',
        action: {
          type: 'message',
          label: style[`label_${lang}`] || style.label_ja,
          text: style.key,
        },
      })),
    },
  };

  return questions[questionId] || null;
}