// =====================================================
// キャリアタイプ診断ハンドラー
// 8問A/B → 4文字コード(16タイプ) → 業界推薦 + URL生成
// =====================================================

import { LineEvent } from '@/types/line';
import { ConversationState, CareerDiagnosisAnswers } from '@/types/conversation';
import {
  getConversationState,
  saveConversationState,
  getUserLang,
} from '../database/queries';
import { replyMessage, showLoadingAnimation } from '../line/client';
import { processUrl } from '../tracking/url-processor';
import { saveCareerDiagnosisResult } from '../database/queries';
import { YOLO_SITE_BASE } from '../constants';
import {
  CAREER_QUESTIONS,
  CAREER_TYPES,
  LANG_PATH_MAP,
  type CareerTypeInfo,
} from './career-diagnosis-data';

const TOTAL_QUESTIONS = 8;

// =====================================================
// エントリポイント: 診断開始
// =====================================================
export async function startCareerDiagnosisMode(
  userId: string,
  replyToken: string,
  lang: string
): Promise<void> {
  console.log('=== キャリアタイプ診断 開始 ===');

  showLoadingAnimation(userId, 3).catch(() => {});

  const state: ConversationState = {
    mode: 'career_diagnosis',
    currentQuestion: 1,
    careerAnswers: {},
    lang,
  };

  await saveConversationState(userId, state);

  const startMessages: Record<string, string> = {
    ja: 'キャリアタイプ診断をはじめます！\n8つのかんたんなしつもんに こたえてください 🎯',
    en: "Let's start the Career Type Quiz!\nAnswer 8 simple questions 🎯",
    ko: '커리어 타입 진단을 시작합니다!\n8개의 간단한 질문에 답해주세요 🎯',
    zh: '开始职业类型诊断！\n请回答8个简单问题 🎯',
    vi: 'Bắt đầu chẩn đoán loại nghề nghiệp!\nHãy trả lời 8 câu hỏi đơn giản 🎯',
  };

  const questionMessage = buildQuestionMessage(1, lang);

  await replyMessage(replyToken, [
    { type: 'text', text: startMessages[lang] || startMessages.ja },
    questionMessage,
  ]);
}

// =====================================================
// エントリポイント: 回答処理
// =====================================================
export async function handleCareerDiagnosisAnswer(event: LineEvent): Promise<void> {
  const userId = event.source.userId;
  const userAnswer = event.message?.text?.trim().toUpperCase() || '';
  const replyToken = event.replyToken;

  const state = await getConversationState(userId);

  if (!state || state.mode !== 'career_diagnosis') {
    console.log('⚠️ キャリア診断モードではありません');
    return;
  }

  const currentQ = state.currentQuestion || 1;
  console.log(`=== キャリア診断 Q${currentQ} 回答: ${userAnswer} ===`);

  // A/B以外の入力はリトライ
  if (userAnswer !== 'A' && userAnswer !== 'B') {
    const lang = state.lang || await getUserLang(userId);
    const retryMessages: Record<string, string> = {
      ja: 'AまたはBを えらんでください',
      en: 'Please choose A or B',
      ko: 'A 또는 B를 선택해주세요',
      zh: '请选择A或B',
      vi: 'Vui lòng chọn A hoặc B',
    };

    const questionMessage = buildQuestionMessage(currentQ, lang);
    await replyMessage(replyToken, [
      { type: 'text', text: retryMessages[lang] || retryMessages.ja },
      questionMessage,
    ]);
    return;
  }

  // 回答を保存
  if (!state.careerAnswers) state.careerAnswers = {};
  const qKey = `q${currentQ}` as keyof CareerDiagnosisAnswers;
  (state.careerAnswers as any)[qKey] = userAnswer as 'A' | 'B';

  if (currentQ < TOTAL_QUESTIONS) {
    // 次の質問へ
    state.currentQuestion = currentQ + 1;
    await saveConversationState(userId, state);

    const lang = state.lang || await getUserLang(userId);
    const questionMessage = buildQuestionMessage(currentQ + 1, lang);
    await replyMessage(replyToken, questionMessage);
  } else {
    // 8問完了 → 結果表示
    await saveConversationState(userId, state);
    await finishCareerDiagnosis(userId, state, replyToken);
  }
}

// =====================================================
// 質問メッセージ構築
// =====================================================
function buildQuestionMessage(questionNum: number, lang: string): any {
  const q = CAREER_QUESTIONS[questionNum - 1];
  if (!q) return { type: 'text', text: 'Error' };

  const remaining = TOTAL_QUESTIONS - questionNum + 1;
  const progressLabels: Record<string, (n: number) => string> = {
    ja: (n) => `【のこり${n}もん】`,
    en: (n) => `【${n} left】`,
    ko: (n) => `【${n}개 남음】`,
    zh: (n) => `【还剩${n}题】`,
    vi: (n) => `【Còn ${n} câu】`,
  };
  const progress = (progressLabels[lang] || progressLabels.ja)(remaining);

  const questionText = q.question[lang] || q.question.ja;
  const optAText = q.optionA[lang] || q.optionA.ja;
  const optBText = q.optionB[lang] || q.optionB.ja;

  return {
    type: 'text',
    text: `${progress}\nQ${questionNum}. ${questionText}`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: `A: ${optAText}`.length > 20 ? `A: ${optAText}`.substring(0, 20) : `A: ${optAText}`,
            text: 'A',
          },
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: `B: ${optBText}`.length > 20 ? `B: ${optBText}`.substring(0, 20) : `B: ${optBText}`,
            text: 'B',
          },
        },
      ],
    },
  };
}

// =====================================================
// スコアリング: 回答 → 4文字コード
// =====================================================
function scoreCareerType(answers: CareerDiagnosisAnswers): string {
  // 軸1: G vs L (Q1=奇数, Q2=偶数)
  const axis1 = resolveAxis(answers.q1, answers.q2, 'G', 'L');
  // 軸2: A vs D (Q3=奇数, Q4=偶数)
  const axis2 = resolveAxis(answers.q3, answers.q4, 'A', 'D');
  // 軸3: R vs V (Q5=奇数, Q6=偶数)
  const axis3 = resolveAxis(answers.q5, answers.q6, 'R', 'V');
  // 軸4: J vs O (Q7=奇数, Q8=偶数)
  const axis4 = resolveAxis(answers.q7, answers.q8, 'J', 'O');

  return `${axis1}${axis2}${axis3}${axis4}`;
}

function resolveAxis(
  oddQ: 'A' | 'B' | undefined,
  evenQ: 'A' | 'B' | undefined,
  letterA: string,
  letterB: string
): string {
  let scoreA = 0;
  let scoreB = 0;

  if (oddQ === 'A') scoreA++;
  if (oddQ === 'B') scoreB++;
  if (evenQ === 'A') scoreA++;
  if (evenQ === 'B') scoreB++;

  if (scoreA > scoreB) return letterA;
  if (scoreB > scoreA) return letterB;
  // 同点時は奇数Q（=A回答側）を優先
  return oddQ === 'A' ? letterA : letterB;
}

// =====================================================
// 診断完了 → 結果表示
// =====================================================
async function finishCareerDiagnosis(
  userId: string,
  state: ConversationState,
  replyToken: string
): Promise<void> {
  console.log('=== キャリアタイプ診断 完了処理 ===');

  showLoadingAnimation(userId, 5).catch(() => {});

  const lang = state.lang || await getUserLang(userId);
  const answers = state.careerAnswers || {};
  const typeCode = scoreCareerType(answers);

  console.log('🎯 タイプコード:', typeCode);

  const typeInfo = CAREER_TYPES[typeCode];
  if (!typeInfo) {
    console.error('❌ 未知のタイプコード:', typeCode);
    await replyMessage(replyToken, { type: 'text', text: 'Error: Unknown type' });
    return;
  }

  // URL生成（トラッキング付き）
  const trackedUrls = await Promise.all(
    typeInfo.industries.map(async (industry) => {
      const url = buildCareerIndustryUrl(industry.id, lang);
      const tracked = await processUrl(url, userId, 'career_diagnosis');
      return { ...industry, trackedUrl: tracked };
    })
  );

  // DB保存
  await saveCareerDiagnosisResult(userId, answers, typeCode, typeInfo.industries.map((i) => i.id), lang);

  // Flex Message作成 & 送信
  const flexMessage = createCareerResultFlex(typeCode, typeInfo, trackedUrls, lang);

  // ai_chatモードに遷移
  await saveConversationState(userId, { mode: 'ai_chat', lang });

  const afterMessages: Record<string, string> = {
    ja: 'きになる業界の「求人を見る」をタップしてください！\nほかに しつもんがあれば、メッセージを おくってください 💬',
    en: 'Tap "View Jobs" for the industry you\'re interested in!\nFeel free to send a message if you have other questions 💬',
    ko: '관심 있는 업계의 "구인 보기"를 눌러주세요!\n다른 질문이 있으면 메시지를 보내주세요 💬',
    zh: '请点击感兴趣行业的"查看职位"！\n如有其他问题，请发送消息 💬',
    vi: 'Nhấn "Xem việc làm" cho ngành bạn quan tâm!\nNếu có câu hỏi khác, hãy gửi tin nhắn 💬',
  };

  await replyMessage(replyToken, [
    flexMessage,
    { type: 'text', text: afterMessages[lang] || afterMessages.ja },
  ]);
}

// =====================================================
// 業界求人URL構築
// =====================================================
function buildCareerIndustryUrl(industryId: string, lang: string): string {
  const langPath = LANG_PATH_MAP[lang] || 'ja';
  return `${YOLO_SITE_BASE}/${langPath}/recruit/job?industries[]=${industryId}`;
}

// =====================================================
// 結果Flex Message作成
// =====================================================
function createCareerResultFlex(
  typeCode: string,
  typeInfo: CareerTypeInfo,
  trackedIndustries: Array<{
    id: string;
    name: Record<string, string>;
    examples: Record<string, string>;
    trackedUrl: string;
  }>,
  lang: string
): any {
  const title = typeInfo.title[lang] || typeInfo.title.ja;
  const description = typeInfo.description[lang] || typeInfo.description.ja;

  const industryBoxes = trackedIndustries.map((industry) => ({
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: industry.name[lang] || industry.name.ja,
        weight: 'bold',
        size: 'sm',
        color: '#333333',
      },
      {
        type: 'text',
        text: industry.examples[lang] || industry.examples.ja,
        size: 'xs',
        color: '#888888',
        wrap: true,
        margin: 'xs',
      },
      {
        type: 'button',
        action: {
          type: 'uri',
          label: ({
            ja: '求人を見る',
            en: 'View Jobs',
            ko: '구인 보기',
            zh: '查看职位',
            vi: 'Xem việc làm',
          } as Record<string, string>)[lang] || '求人を見る',
          uri: industry.trackedUrl,
        },
        style: 'primary',
        color: '#d10a1c',
        height: 'sm',
        margin: 'sm',
      },
    ],
    margin: 'lg',
    paddingAll: '12px',
    backgroundColor: '#F8F8F8',
    cornerRadius: '8px',
  }));

  const recommendLabel: Record<string, string> = {
    ja: 'おすすめの業界',
    en: 'Recommended Industries',
    ko: '추천 업계',
    zh: '推荐行业',
    vi: 'Ngành nghề đề xuất',
  };

  return {
    type: 'flex',
    altText: `🎯 ${title} (${typeCode})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎯',
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
          {
            type: 'text',
            text: typeCode,
            size: 'sm',
            color: '#888888',
            align: 'center',
            margin: 'xs',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: description,
            size: 'sm',
            color: '#555555',
            wrap: true,
            margin: 'lg',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#FFFFFF',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: recommendLabel[lang] || recommendLabel.ja,
            weight: 'bold',
            size: 'md',
            color: '#333333',
          },
          ...industryBoxes,
        ],
        paddingAll: '20px',
        spacing: 'sm',
      },
    },
  };
}
