import { LineEvent } from '@/types/line';
import { ConversationState, FollowupStep } from '@/types/conversation';
import { getConversationState, saveConversationState, getUserLang } from '../database/queries';
import { replyMessage, replyWithQuickReply } from '../line/client';

// LIFF経由で外部ブラウザを開くためのURL生成
const LIFF_ID = '2006973060-cAgpaZ0y';
const LIFF_URL_BASE = `https://liff.line.me/${LIFF_ID}`;

function createExternalBrowserUrl(targetUrl: string): string {
  return `${LIFF_URL_BASE}#url=${encodeURIComponent(targetUrl)}`;
}

// 多言語メッセージ
const FOLLOWUP_MESSAGES = {
  ask_applied: {
    ja: '応募（おうぼ）できましたか？',
    en: 'Did you apply for any jobs?',
    ko: '지원하셨나요?',
    zh: '您申请了吗？',
    vi: 'Bạn đã ứng tuyển chưa?',
  },
  ask_count: {
    ja: '何件（なんけん）応募（おうぼ）しましたか？',
    en: 'How many jobs did you apply for?',
    ko: '몇 개에 지원하셨나요?',
    zh: '您申请了几份工作？',
    vi: 'Bạn đã ứng tuyển bao nhiêu công việc?',
  },
  ask_trouble: {
    ja: '何（なに）かお困（こま）りですか？',
    en: 'Is there anything troubling you?',
    ko: '어려운 점이 있으신가요?',
    zh: '有什么困难吗？',
    vi: 'Bạn có gặp khó khăn gì không?',
  },
  encourage_1: {
    ja: '1件（けん）応募（おうぼ）ですね！\n\n複数（ふくすう）の仕事（しごと）に応募すると、採用（さいよう）されやすくなります。\n平均（へいきん）5件（けん）応募で採用率（さいようりつ）が大（おお）きくアップします✨\n\nもっと応募してみませんか？',
    en: 'You applied for 1 job!\n\nApplying to multiple jobs increases your chances. On average, 5 applications greatly improve your success rate ✨\n\nWould you like to apply for more?',
    ko: '1개에 지원하셨네요!\n\n여러 곳에 지원하면 채용 확률이 높아집니다. 평균 5곳 지원으로 성공률이 크게 올라갑니다 ✨\n\n더 지원해 보시겠어요?',
    zh: '您申请了1份工作！\n\n申请多个工作可以提高成功率。平均申请5份工作会大大提高成功率 ✨\n\n要不要再申请更多？',
    vi: 'Bạn đã ứng tuyển 1 công việc!\n\nỨng tuyển nhiều công việc sẽ tăng cơ hội được nhận. Trung bình 5 đơn ứng tuyển sẽ tăng đáng kể tỷ lệ thành công ✨\n\nBạn có muốn ứng tuyển thêm không?',
  },
  encourage_2_3: {
    ja: 'いい調子（ちょうし）です！2〜3件応募ですね。\n\nもう少（すこ）し増（ふ）やすと採用（さいよう）確率（かくりつ）がさらにアップします💪\n平均5件応募で結果が出やすくなります！',
    en: "Good progress! You applied for 2-3 jobs.\n\nA few more applications will further increase your chances 💪\nOn average, 5 applications lead to better results!",
    ko: '잘하고 계세요! 2-3개에 지원하셨네요.\n\n조금 더 지원하면 채용 확률이 더 올라갑니다 💪\n평균 5곳 지원하면 결과가 좋습니다!',
    zh: '做得好！您申请了2-3份工作。\n\n再多申请一些会进一步提高成功率 💪\n平均5份申请效果最好！',
    vi: 'Tuyệt vời! Bạn đã ứng tuyển 2-3 công việc.\n\nỨng tuyển thêm vài nơi sẽ tăng thêm cơ hội 💪\nTrung bình 5 đơn sẽ có kết quả tốt hơn!',
  },
  encourage_4_plus: {
    ja: '素晴（すば）らしい！4件（けん）以上（いじょう）応募（おうぼ）ですね🎉\n\n採用（さいよう）の連絡（れんらく）を待（ま）ちましょう。\n良（よ）い結果（けっか）が届（とど）くことを祈（いの）っています！',
    en: "Excellent! You applied for 4 or more jobs 🎉\n\nLet's wait for the hiring response.\nWishing you good results!",
    ko: '훌륭해요! 4개 이상 지원하셨네요 🎉\n\n채용 연락을 기다려 봐요.\n좋은 결과가 있기를 바랍니다!',
    zh: '太棒了！您申请了4份以上的工作 🎉\n\n让我们等待招聘回复。\n祝您好运！',
    vi: 'Tuyệt vời! Bạn đã ứng tuyển 4 công việc trở lên 🎉\n\nHãy chờ phản hồi từ nhà tuyển dụng.\nChúc bạn có kết quả tốt!',
  },
  trouble_no_match: {
    ja: '希望（きぼう）に合（あ）う仕事（しごと）が見（み）つからないのですね。\n\n条件（じょうけん）を少（すこ）し広（ひろ）げて探（さが）してみると、良（よ）い仕事（しごと）が見（み）つかることがあります！\n\nもう一度（いちど）サイトで探（さが）してみませんか？',
    en: "You couldn't find jobs matching your preferences.\n\nTry broadening your search criteria - you might find better opportunities!\n\nWould you like to search again?",
    ko: '원하는 조건에 맞는 일자리를 못 찾으셨군요.\n\n조건을 조금 넓혀서 찾아보면 좋은 일자리를 찾을 수 있어요!\n\n다시 찾아보시겠어요?',
    zh: '没有找到符合您条件的工作。\n\n试着放宽搜索条件，可能会找到更好的机会！\n\n要不要再搜索一次？',
    vi: 'Bạn chưa tìm được công việc phù hợp.\n\nHãy thử mở rộng tiêu chí tìm kiếm - bạn có thể tìm được cơ hội tốt hơn!\n\nBạn có muốn tìm kiếm lại không?',
  },
  trouble_language: {
    ja: '日本語（にほんご）が不安（ふあん）なのですね。\n\n日本語が少（すこ）しできれば大丈夫（だいじょうぶ）な仕事（しごと）もたくさんあります！\n「日本語不要（ふよう）」で検索（けんさく）してみてください。\n\n外国語（がいこくご）が活（い）かせる仕事（しごと）もあります。',
    en: "You're worried about Japanese.\n\nMany jobs only require basic Japanese! Try searching for \"No Japanese required\".\n\nThere are also jobs where you can use your native language.",
    ko: '일본어가 걱정되시는군요.\n\n기초 일본어만 있으면 되는 일자리도 많아요! "일본어 불필요"로 검색해 보세요.\n\n모국어를 활용할 수 있는 일자리도 있어요.',
    zh: '您担心日语问题。\n\n很多工作只需要基础日语！试着搜索"不需要日语"。\n\n也有可以使用母语的工作。',
    vi: 'Bạn lo lắng về tiếng Nhật.\n\nNhiều công việc chỉ cần tiếng Nhật cơ bản! Hãy thử tìm kiếm "Không yêu cầu tiếng Nhật".\n\nCũng có những công việc bạn có thể sử dụng tiếng mẹ đẻ.',
  },
  trouble_how_to: {
    ja: '応募（おうぼ）方法（ほうほう）がわからないのですね。\n\n【応募（おうぼ）の方法（ほうほう）】\n1. 気（き）になる仕事（しごと）をタップ\n2. 「応募（おうぼ）する」ボタンを押（お）す\n3. 必要（ひつよう）な情報（じょうほう）を入力（にゅうりょく）\n\n簡単（かんたん）に応募できます！やってみてください。',
    en: "You don't know how to apply.\n\n【How to Apply】\n1. Tap on a job you're interested in\n2. Press the \"Apply\" button\n3. Fill in the required information\n\nIt's easy! Give it a try.",
    ko: '지원 방법을 모르시는군요.\n\n【지원 방법】\n1. 관심 있는 일자리 탭하기\n2. "지원하기" 버튼 누르기\n3. 필요한 정보 입력하기\n\n쉬워요! 해보세요.',
    zh: '您不知道如何申请。\n\n【申请方法】\n1. 点击您感兴趣的工作\n2. 按"申请"按钮\n3. 填写必要信息\n\n很简单！试试看。',
    vi: 'Bạn không biết cách ứng tuyển.\n\n【Cách ứng tuyển】\n1. Nhấn vào công việc bạn quan tâm\n2. Nhấn nút "Ứng tuyển"\n3. Điền thông tin cần thiết\n\nRất đơn giản! Hãy thử nhé.',
  },
  trouble_not_yet: {
    ja: 'まだ見（み）ていないのですね。\n\n良（よ）い仕事（しごと）はすぐに埋（う）まってしまうことがあります。\n早（はや）めにチェックしてみてください！',
    en: "You haven't checked yet.\n\nGood jobs can fill up quickly. Try checking soon!",
    ko: '아직 안 보셨군요.\n\n좋은 일자리는 금방 마감될 수 있어요. 빨리 확인해 보세요!',
    zh: '您还没有看。\n\n好工作可能很快就招满了。请尽早查看！',
    vi: 'Bạn chưa xem.\n\nNhững công việc tốt có thể hết nhanh. Hãy kiểm tra sớm nhé!',
  },
  complete: {
    ja: 'お仕事（しごと）探（さが）しを応援（おうえん）しています！\n何（なに）かあればいつでもメッセージしてください😊',
    en: "We're supporting your job search!\nFeel free to message us anytime 😊",
    ko: '구직 활동을 응원합니다!\n언제든지 메시지해 주세요 😊',
    zh: '我们支持您找工作！\n随时给我们发消息 😊',
    vi: 'Chúng tôi hỗ trợ bạn tìm việc!\nHãy nhắn tin cho chúng tôi bất cứ lúc nào 😊',
  },
};

// QuickReplyのラベル
const QUICK_REPLY_LABELS = {
  yes: { ja: 'はい', en: 'Yes', ko: '네', zh: '是的', vi: 'Có' },
  no: { ja: 'いいえ', en: 'No', ko: '아니오', zh: '没有', vi: 'Không' },
  not_yet: { ja: 'まだ見ていない', en: 'Not yet', ko: '아직', zh: '还没', vi: 'Chưa' },
  count_1: { ja: '1件', en: '1 job', ko: '1개', zh: '1份', vi: '1' },
  count_2_3: { ja: '2〜3件', en: '2-3 jobs', ko: '2-3개', zh: '2-3份', vi: '2-3' },
  count_4_plus: { ja: '4件以上', en: '4+ jobs', ko: '4개 이상', zh: '4份以上', vi: '4+' },
  no_match: { ja: '希望に合わない', en: 'No match', ko: '조건 안 맞음', zh: '不符合', vi: 'Không phù hợp' },
  language: { ja: '日本語が不安', en: 'Language worry', ko: '일본어 걱정', zh: '语言担心', vi: 'Lo về tiếng Nhật' },
  how_to: { ja: '応募方法がわからない', en: "Don't know how", ko: '방법 모름', zh: '不知道怎么申请', vi: 'Không biết cách' },
  search_more: { ja: 'サイトで探す', en: 'Search site', ko: '사이트 검색', zh: '搜索网站', vi: 'Tìm trên web' },
  done: { ja: '大丈夫です', en: "I'm good", ko: '괜찮아요', zh: '没事了', vi: 'Tôi ổn' },
};

function getLabel(key: keyof typeof QUICK_REPLY_LABELS, lang: string): string {
  const labels = QUICK_REPLY_LABELS[key];
  return labels[lang as keyof typeof labels] || labels.ja;
}

function getMessage(key: keyof typeof FOLLOWUP_MESSAGES, lang: string): string {
  const messages = FOLLOWUP_MESSAGES[key];
  return messages[lang as keyof typeof messages] || messages.ja;
}

export async function startFollowup(
  userId: string,
  replyToken: string,
  lang: string,
  existingState: ConversationState
): Promise<void> {
  const state: ConversationState = {
    ...existingState,
    mode: 'followup',
    followupStep: 'ask_applied',
    followupAnswers: {},
  };
  await saveConversationState(userId, state);

  await replyWithQuickReply(replyToken, getMessage('ask_applied', lang), [
    {
      type: 'action',
      action: { type: 'message', label: getLabel('yes', lang), text: 'FOLLOWUP_YES' },
    },
    {
      type: 'action',
      action: { type: 'message', label: getLabel('no', lang), text: 'FOLLOWUP_NO' },
    },
    {
      type: 'action',
      action: { type: 'message', label: getLabel('not_yet', lang), text: 'FOLLOWUP_NOT_YET' },
    },
  ]);
}

export async function handleFollowupAnswer(event: LineEvent): Promise<void> {
  const userId = event.source.userId;
  if (!userId) return;

  const state = await getConversationState(userId);
  if (!state || state.mode !== 'followup') return;

  const lang = await getUserLang(userId);
  const text = event.message?.text || '';
  const replyToken = event.replyToken;

  switch (state.followupStep) {
    case 'ask_applied':
      await handleAppliedAnswer(userId, replyToken, text, lang, state);
      break;
    case 'ask_count':
      await handleCountAnswer(userId, replyToken, text, lang, state);
      break;
    case 'ask_trouble':
      await handleTroubleAnswer(userId, replyToken, text, lang, state);
      break;
    default:
      await finishFollowup(userId, replyToken, lang, state);
  }
}

async function handleAppliedAnswer(
  userId: string,
  replyToken: string,
  text: string,
  lang: string,
  state: ConversationState
): Promise<void> {
  if (text === 'FOLLOWUP_YES') {
    state.followupAnswers = { ...state.followupAnswers, hasApplied: 'yes' };
    state.followupStep = 'ask_count';
    await saveConversationState(userId, state);

    await replyWithQuickReply(replyToken, getMessage('ask_count', lang), [
      {
        type: 'action',
        action: { type: 'message', label: getLabel('count_1', lang), text: 'FOLLOWUP_COUNT_1' },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('count_2_3', lang), text: 'FOLLOWUP_COUNT_2_3' },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('count_4_plus', lang), text: 'FOLLOWUP_COUNT_4+' },
      },
    ]);
  } else if (text === 'FOLLOWUP_NO' || text === 'FOLLOWUP_NOT_YET') {
    state.followupAnswers = {
      ...state.followupAnswers,
      hasApplied: text === 'FOLLOWUP_NO' ? 'no' : 'not_yet',
    };
    state.followupStep = 'ask_trouble';
    await saveConversationState(userId, state);

    await replyWithQuickReply(replyToken, getMessage('ask_trouble', lang), [
      {
        type: 'action',
        action: { type: 'message', label: getLabel('no_match', lang), text: 'FOLLOWUP_TROUBLE_NO_MATCH' },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('language', lang), text: 'FOLLOWUP_TROUBLE_LANGUAGE' },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('how_to', lang), text: 'FOLLOWUP_TROUBLE_HOW_TO' },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('not_yet', lang), text: 'FOLLOWUP_TROUBLE_NOT_YET' },
      },
    ]);
  }
}

async function handleCountAnswer(
  userId: string,
  replyToken: string,
  text: string,
  lang: string,
  state: ConversationState
): Promise<void> {
  let encourageKey: keyof typeof FOLLOWUP_MESSAGES = 'encourage_1';
  let count: '1' | '2-3' | '4+' = '1';

  if (text === 'FOLLOWUP_COUNT_1') {
    encourageKey = 'encourage_1';
    count = '1';
  } else if (text === 'FOLLOWUP_COUNT_2_3') {
    encourageKey = 'encourage_2_3';
    count = '2-3';
  } else if (text === 'FOLLOWUP_COUNT_4+') {
    encourageKey = 'encourage_4_plus';
    count = '4+';
  }

  state.followupAnswers = { ...state.followupAnswers, applicationCount: count };
  state.followupStep = 'complete';
  await saveConversationState(userId, state);

  const encourageMessage = getMessage(encourageKey, lang);

  if (count === '4+') {
    await replyMessage(replyToken, { type: 'text', text: encourageMessage });
    await finishFollowup(userId, '', lang, state);
  } else {
    const targetUrl = `https://www.yolo-japan.com/${lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh' : lang === 'vi' ? 'vi' : 'en'}/recruit?utm_source=line&utm_medium=followup`;
    await replyWithQuickReply(replyToken, encourageMessage, [
      {
        type: 'action',
        action: {
          type: 'uri',
          label: getLabel('search_more', lang),
          uri: createExternalBrowserUrl(targetUrl),
        },
      },
      {
        type: 'action',
        action: { type: 'message', label: getLabel('done', lang), text: 'FOLLOWUP_DONE' },
      },
    ]);
  }
}

async function handleTroubleAnswer(
  userId: string,
  replyToken: string,
  text: string,
  lang: string,
  state: ConversationState
): Promise<void> {
  let troubleKey: keyof typeof FOLLOWUP_MESSAGES = 'trouble_not_yet';
  let trouble: 'no_match' | 'language' | 'how_to' | 'not_yet' = 'not_yet';

  if (text === 'FOLLOWUP_TROUBLE_NO_MATCH') {
    troubleKey = 'trouble_no_match';
    trouble = 'no_match';
  } else if (text === 'FOLLOWUP_TROUBLE_LANGUAGE') {
    troubleKey = 'trouble_language';
    trouble = 'language';
  } else if (text === 'FOLLOWUP_TROUBLE_HOW_TO') {
    troubleKey = 'trouble_how_to';
    trouble = 'how_to';
  } else if (text === 'FOLLOWUP_TROUBLE_NOT_YET') {
    troubleKey = 'trouble_not_yet';
    trouble = 'not_yet';
  }

  state.followupAnswers = { ...state.followupAnswers, trouble };
  state.followupStep = 'complete';
  await saveConversationState(userId, state);

  const troubleMessage = getMessage(troubleKey, lang);
  const targetUrl = `https://www.yolo-japan.com/${lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh' : lang === 'vi' ? 'vi' : 'en'}/recruit?utm_source=line&utm_medium=followup`;

  await replyWithQuickReply(replyToken, troubleMessage, [
    {
      type: 'action',
      action: {
        type: 'uri',
        label: getLabel('search_more', lang),
        uri: createExternalBrowserUrl(targetUrl),
      },
    },
    {
      type: 'action',
      action: { type: 'message', label: getLabel('done', lang), text: 'FOLLOWUP_DONE' },
    },
  ]);
}

async function finishFollowup(
  userId: string,
  replyToken: string,
  lang: string,
  state: ConversationState
): Promise<void> {
  state.mode = 'ai_chat';
  state.followupStep = undefined;
  await saveConversationState(userId, state);

  if (replyToken) {
    await replyMessage(replyToken, { type: 'text', text: getMessage('complete', lang) });
  }
}
