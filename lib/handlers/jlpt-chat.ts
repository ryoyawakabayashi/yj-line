// lib/handlers/jlpt-chat.ts
// JLPT DB型クイズハンドラー

import { replyMessage, replyWithQuickReply } from '../line/client';
import {
  getConversationState,
  saveConversationState,
  clearConversationState,
  getJlptQuestions,
  saveJlptAnswer,
  JlptQuestion,
} from '../database/queries';

const QUIZ_SIZE = 10;

// ============ 多言語ラベル ============

const LEVEL_LABELS: Record<string, Record<string, string>> = {
  N5: { ja: 'N5', en: 'N5', ko: 'N5', zh: 'N5', vi: 'N5' },
  N4: { ja: 'N4', en: 'N4', ko: 'N4', zh: 'N4', vi: 'N4' },
  N3: { ja: 'N3', en: 'N3', ko: 'N3', zh: 'N3', vi: 'N3' },
  N2: { ja: 'N2', en: 'N2', ko: 'N2', zh: 'N2', vi: 'N2' },
  N1: { ja: 'N1', en: 'N1', ko: 'N1', zh: 'N1', vi: 'N1' },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  grammar: { ja: '文法', en: 'Grammar', ko: '문법', zh: '语法', vi: 'Ngữ pháp' },
  vocabulary: { ja: '語彙', en: 'Vocabulary', ko: '어휘', zh: '词汇', vi: 'Từ vựng' },
  kanji: { ja: '漢字', en: 'Kanji', ko: '한자', zh: '汉字', vi: 'Hán tự' },
  reading: { ja: '読解', en: 'Reading', ko: '독해', zh: '阅读', vi: 'Đọc hiểu' },
};

const MSG = {
  welcome: {
    ja: '日本語（にほんご）の勉強（べんきょう）を始（はじ）めましょう！\n\nレベルを選（えら）んでください：',
    en: "Let's start learning Japanese!\n\nChoose your level:",
    ko: '일본어 공부를 시작합시다!\n\n레벨을 선택하세요:',
    zh: '开始学习日语吧！\n\n请选择级别：',
    vi: 'Hãy bắt đầu học tiếng Nhật!\n\nChọn cấp độ:',
  },
  chooseCategory: {
    ja: 'どの分野（ぶんや）を勉強（べんきょう）しますか？',
    en: 'Which category would you like to study?',
    ko: '어떤 분야를 공부하시겠어요?',
    zh: '您想学习哪个类别？',
    vi: 'Bạn muốn học loại nào?',
  },
  noQuestions: {
    ja: 'この条件の問題がまだありません。別のカテゴリを試してください。',
    en: 'No questions available for this selection. Try another category.',
    ko: '이 조건의 문제가 아직 없습니다. 다른 카테고리를 시도해주세요.',
    zh: '此条件还没有题目。请尝试其他类别。',
    vi: 'Chưa có câu hỏi cho lựa chọn này. Hãy thử loại khác.',
  },
  correct: {
    ja: '⭕ 正解（せいかい）！',
    en: '⭕ Correct!',
    ko: '⭕ 정답!',
    zh: '⭕ 正确！',
    vi: '⭕ Đúng rồi!',
  },
  incorrect: {
    ja: '❌ 残念（ざんねん）！',
    en: '❌ Incorrect!',
    ko: '❌ 오답!',
    zh: '❌ 不对！',
    vi: '❌ Sai rồi!',
  },
  answer: {
    ja: '答え：',
    en: 'Answer: ',
    ko: '정답: ',
    zh: '答案：',
    vi: 'Đáp án: ',
  },
  next: {
    ja: '次の問題 →',
    en: 'Next →',
    ko: '다음 문제 →',
    zh: '下一题 →',
    vi: 'Câu tiếp →',
  },
  complete: {
    ja: '🎉 {size}問完了！\n\n結果（けっか）: {correct}/{size} 正解（{percent}%）',
    en: '🎉 {size} questions done!\n\nResult: {correct}/{size} correct ({percent}%)',
    ko: '🎉 {size}문제 완료!\n\n결과: {correct}/{size} 정답 ({percent}%)',
    zh: '🎉 {size}题完成！\n\n结果：{correct}/{size} 正确（{percent}%）',
    vi: '🎉 Hoàn thành {size} câu!\n\nKết quả: {correct}/{size} đúng ({percent}%)',
  },
  retry: {
    ja: 'もう1セット',
    en: 'Another set',
    ko: '한 세트 더',
    zh: '再来一组',
    vi: 'Thêm 1 bộ',
  },
  changeLevel: {
    ja: 'レベル変更',
    en: 'Change level',
    ko: '레벨 변경',
    zh: '更换级别',
    vi: 'Đổi cấp độ',
  },
  exit: {
    ja: '終了',
    en: 'Exit',
    ko: '종료',
    zh: '结束',
    vi: 'Thoát',
  },
  chooseByCategory: {
    ja: 'カテゴリで選ぶ',
    en: 'By category',
    ko: '카테고리 선택',
    zh: '按类别选择',
    vi: 'Chọn theo loại',
  },
};

function t(key: keyof typeof MSG, lang: string): string {
  return MSG[key][lang as keyof (typeof MSG)[typeof key]] || MSG[key].en;
}

// ============ メインハンドラー ============

/**
 * JLPT学習モードを開始（レベル選択）
 */
export async function startJlptMode(
  userId: string,
  replyToken: string,
  lang: string
): Promise<void> {
  await saveConversationState(userId, { mode: 'jlpt_chat' as any });

  await replyWithQuickReply(
    replyToken,
    t('welcome', lang),
    Object.keys(LEVEL_LABELS).map((level) => ({
      type: 'action' as const,
      action: {
        type: 'message' as const,
        label: LEVEL_LABELS[level][lang] || LEVEL_LABELS[level].en,
        text: `JLPT_${level}`,
      },
    }))
  );
}

/**
 * JLPTクイズメッセージを処理（モード中の全メッセージがここに来る）
 */
export async function handleJlptChatMessage(
  userId: string,
  replyToken: string,
  text: string,
  lang: string
): Promise<void> {
  const state = await getConversationState(userId);

  // レベル選択
  const levelMatch = text.match(/^JLPT_(N[1-5])$/);
  if (levelMatch) {
    await handleLevelSelection(userId, replyToken, levelMatch[1], lang);
    return;
  }

  // カテゴリ選択
  const catMatch = text.match(/^JLPT_CAT_(\w+)$/);
  if (catMatch) {
    await handleCategorySelection(userId, replyToken, catMatch[1], lang, state);
    return;
  }

  // 回答
  const ansMatch = text.match(/^JLPT_ANS_([0-3])$/);
  if (ansMatch) {
    await handleAnswer(userId, replyToken, parseInt(ansMatch[1]), lang, state);
    return;
  }

  // 次の問題
  if (text === 'JLPT_NEXT') {
    await sendNextQuestion(userId, replyToken, lang, state);
    return;
  }

  // もう1セット
  if (text === 'JLPT_RETRY') {
    const jlptLevel = (state as any)?.jlptLevel;
    const jlptCategory = (state as any)?.jlptCategory;
    if (jlptLevel && jlptCategory) {
      await startQuizSet(userId, replyToken, jlptLevel, jlptCategory, lang);
    } else {
      await startJlptMode(userId, replyToken, lang);
    }
    return;
  }

  // カテゴリ選択画面を表示
  if (text === 'JLPT_CHOOSE_CAT') {
    const jlptLevel = (state as any)?.jlptLevel || 'N5';
    await showCategorySelection(userId, replyToken, jlptLevel, lang);
    return;
  }

  // レベル変更
  if (text === 'JLPT_CHANGE_LEVEL') {
    await startJlptMode(userId, replyToken, lang);
    return;
  }

  // 終了
  if (text === 'JLPT_EXIT') {
    await clearConversationState(userId);
    const exitMsg: Record<string, string> = {
      ja: 'JLPT学習を終了しました。またいつでも始められます！',
      en: 'JLPT study ended. You can start again anytime!',
      ko: 'JLPT 학습을 종료했습니다. 언제든 다시 시작할 수 있어요!',
      zh: 'JLPT学习已结束。随时可以重新开始！',
      vi: 'Đã kết thúc học JLPT. Bạn có thể bắt đầu lại bất cứ lúc nào!',
    };
    await replyMessage(replyToken, { type: 'text', text: exitMsg[lang] || exitMsg.en });
    return;
  }

  // 不明なメッセージ → レベル選択に戻す
  await startJlptMode(userId, replyToken, lang);
}

// ============ 内部関数 ============

async function handleLevelSelection(
  userId: string,
  replyToken: string,
  level: string,
  lang: string
): Promise<void> {
  // レベル選択後、全カテゴリからランダムで即出題
  await startQuizSet(userId, replyToken, level, 'all', lang);
}

async function handleCategorySelection(
  userId: string,
  replyToken: string,
  category: string,
  lang: string,
  state: any
): Promise<void> {
  const level = state?.jlptLevel || 'N5';
  await startQuizSet(userId, replyToken, level, category, lang);
}

async function startQuizSet(
  userId: string,
  replyToken: string,
  level: string,
  category: string,
  lang: string
): Promise<void> {
  const questions = await getJlptQuestions(userId, level, category, QUIZ_SIZE);

  if (questions.length === 0) {
    await replyWithQuickReply(replyToken, t('noQuestions', lang), [
      {
        type: 'action',
        action: { type: 'message', label: t('changeLevel', lang), text: 'JLPT_CHANGE_LEVEL' },
      },
      {
        type: 'action',
        action: { type: 'message', label: t('exit', lang), text: 'JLPT_EXIT' },
      },
    ]);
    return;
  }

  const questionIds = questions.map((q) => q.id);
  const firstQ = questions[0];

  // 選択肢をシャッフル
  const opts = firstQ.options as string[];
  const correctOpt = opts[firstQ.correct_index];
  const shuffled = [...opts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const shuffledCorrectIndex = shuffled.indexOf(correctOpt);

  await saveConversationState(userId, {
    mode: 'jlpt_chat',
    jlptLevel: level,
    jlptCategory: category,
    jlptQuestionIds: questionIds,
    jlptCurrentIndex: 0,
    jlptCorrectCount: 0,
    jlptCurrentQuestionId: questionIds[0],
    jlptShuffledCorrectIndex: shuffledCorrectIndex,
  } as any);

  await sendQuestion(replyToken, firstQ.question_text, shuffled, 0, questions.length, lang);
}

async function sendNextQuestion(
  userId: string,
  replyToken: string,
  lang: string,
  state: any
): Promise<void> {
  const questionIds: string[] = state?.jlptQuestionIds || [];
  const currentIndex: number = (state?.jlptCurrentIndex ?? 0) + 1;
  const correctCount: number = state?.jlptCorrectCount ?? 0;

  if (currentIndex >= questionIds.length) {
    // クイズ完了
    await showResults(userId, replyToken, correctCount, questionIds.length, lang, state);
    return;
  }

  const questionId = questionIds[currentIndex];

  // DBから問題を取得
  const { supabase } = await import('../database/supabase');
  const { data } = await supabase
    .from('jlpt_questions')
    .select('id, level, category, question_text, options, correct_index')
    .eq('id', questionId)
    .single();

  if (!data) {
    await showResults(userId, replyToken, correctCount, currentIndex, lang, state);
    return;
  }

  // 選択肢をシャッフルして正解位置をstateに保存
  const options = (data as JlptQuestion).options as string[];
  const correctIndex = (data as JlptQuestion).correct_index;
  const correctOption = options[correctIndex];

  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const shuffledCorrectIndex = shuffled.indexOf(correctOption);

  await saveConversationState(userId, {
    ...state,
    jlptCurrentIndex: currentIndex,
    jlptCurrentQuestionId: questionId,
    jlptShuffledCorrectIndex: shuffledCorrectIndex,
  } as any);

  await sendQuestion(replyToken, (data as JlptQuestion).question_text, shuffled, currentIndex, questionIds.length, lang);
}

async function sendQuestion(
  replyToken: string,
  questionText: string,
  shuffledOptions: string[],
  index: number,
  total: number,
  lang: string
): Promise<void> {
  const numberEmoji = ['①', '②', '③', '④'];

  const text =
    `📝 (${index + 1}/${total})\n\n` +
    questionText +
    '\n\n' +
    shuffledOptions.map((opt, i) => `${numberEmoji[i]} ${opt}`).join('\n');

  const quickReplyItems = shuffledOptions.map((opt, i) => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: `${numberEmoji[i]} ${opt}`.slice(0, 20),
      text: `JLPT_ANS_${i}`,
    },
  }));

  await replyWithQuickReply(replyToken, text, quickReplyItems);
}

async function handleAnswer(
  userId: string,
  replyToken: string,
  answerIndex: number,
  lang: string,
  state: any
): Promise<void> {
  const questionId = state?.jlptCurrentQuestionId;
  if (!questionId) {
    await startJlptMode(userId, replyToken, lang);
    return;
  }

  // DBから問題を取得
  const { supabase } = await import('../database/supabase');
  const { data: question } = await supabase
    .from('jlpt_questions')
    .select('id, question_text, options, correct_index')
    .eq('id', questionId)
    .single();

  if (!question) {
    await startJlptMode(userId, replyToken, lang);
    return;
  }

  // stateに保存されたシャッフル後の正解位置で判定
  const shuffledCorrectIndex = state?.jlptShuffledCorrectIndex ?? question.correct_index;
  const isCorrect = answerIndex === shuffledCorrectIndex;
  const options = question.options as string[];
  const correctOption = options[question.correct_index];

  // 進捗を保存
  await saveJlptAnswer(userId, questionId, isCorrect);

  // 正解数を更新
  let correctCount: number = state?.jlptCorrectCount ?? 0;
  if (isCorrect) correctCount++;

  await saveConversationState(userId, {
    ...state,
    jlptCorrectCount: correctCount,
  } as any);

  let resultText = isCorrect ? t('correct', lang) : t('incorrect', lang);
  resultText += '\n\n' + t('answer', lang) + correctOption;

  const questionIds: string[] = state?.jlptQuestionIds || [];
  const currentIndex: number = state?.jlptCurrentIndex ?? 0;
  const isLast = currentIndex >= questionIds.length - 1;

  if (isLast) {
    // 最後の問題 → 結果表示ボタン
    resultText += '\n\n---';
    await replyWithQuickReply(replyToken, resultText, [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📊 ' + (lang === 'ja' ? '結果を見る' : 'See results'),
          text: 'JLPT_NEXT',
        },
      },
    ]);
  } else {
    await replyWithQuickReply(replyToken, resultText, [
      {
        type: 'action',
        action: { type: 'message', label: t('next', lang), text: 'JLPT_NEXT' },
      },
    ]);
  }
}

async function showCategorySelection(
  userId: string,
  replyToken: string,
  level: string,
  lang: string
): Promise<void> {
  await saveConversationState(userId, {
    mode: 'jlpt_chat',
    jlptLevel: level,
  } as any);

  const items = Object.keys(CATEGORY_LABELS).map((cat) => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: CATEGORY_LABELS[cat][lang] || CATEGORY_LABELS[cat].en,
      text: `JLPT_CAT_${cat}`,
    },
  }));

  await replyWithQuickReply(replyToken, t('chooseCategory', lang), items);
}

async function showResults(
  userId: string,
  replyToken: string,
  correctCount: number,
  totalCount: number,
  lang: string,
  state: any
): Promise<void> {
  const percent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  let resultText = t('complete', lang)
    .replace(/{size}/g, String(totalCount))
    .replace(/{correct}/g, String(correctCount))
    .replace(/{percent}/g, String(percent));

  // 励ましメッセージ
  if (percent >= 80) {
    const great: Record<string, string> = {
      ja: '\n\n⭐ すばらしい！この調子（ちょうし）で頑張（がんば）りましょう！',
      en: '\n\n⭐ Excellent! Keep up the great work!',
      ko: '\n\n⭐ 훌륭합니다! 이 조자로 힘내세요!',
      zh: '\n\n⭐ 太棒了！继续加油！',
      vi: '\n\n⭐ Tuyệt vời! Hãy tiếp tục cố gắng!',
    };
    resultText += great[lang] || great.en;
  } else if (percent >= 50) {
    const good: Record<string, string> = {
      ja: '\n\n📚 いい感じです！もう少し練習（れんしゅう）しましょう！',
      en: '\n\n📚 Good job! Let\'s practice a bit more!',
      ko: '\n\n📚 잘하고 있어요! 조금 더 연습합시다!',
      zh: '\n\n📚 不错！再多练习一下吧！',
      vi: '\n\n📚 Tốt lắm! Hãy luyện tập thêm nhé!',
    };
    resultText += good[lang] || good.en;
  } else {
    const encourage: Record<string, string> = {
      ja: '\n\n💪 あきらめないで！繰（く）り返（かえ）し練習（れんしゅう）すれば必（かなら）ずできるようになります！',
      en: '\n\n💪 Don\'t give up! With practice, you\'ll definitely improve!',
      ko: '\n\n💪 포기하지 마세요! 반복 연습하면 반드시 잘할 수 있어요!',
      zh: '\n\n💪 不要放弃！反复练习一定能进步！',
      vi: '\n\n💪 Đừng bỏ cuộc! Luyện tập nhiều sẽ tiến bộ!',
    };
    resultText += encourage[lang] || encourage.en;
  }

  await replyWithQuickReply(replyToken, resultText, [
    {
      type: 'action',
      action: { type: 'message', label: t('retry', lang), text: 'JLPT_RETRY' },
    },
    {
      type: 'action',
      action: { type: 'message', label: t('chooseByCategory', lang), text: 'JLPT_CHOOSE_CAT' },
    },
    {
      type: 'action',
      action: { type: 'message', label: t('changeLevel', lang), text: 'JLPT_CHANGE_LEVEL' },
    },
    {
      type: 'action',
      action: { type: 'message', label: t('exit', lang), text: 'JLPT_EXIT' },
    },
  ]);
}
