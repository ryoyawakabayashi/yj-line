export const config = {
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  richMenu: {
    init: process.env.RICHMENU_INIT || '',
    ja: process.env.RICHMENU_JA || '',
    en: process.env.RICHMENU_EN || '',
    ko: process.env.RICHMENU_KO || '',
    zh: process.env.RICHMENU_ZH || '',
    vi: process.env.RICHMENU_VI || '',
  },
  utm: {
    source: 'line',
    medium: 'chatbot',
    campaign: 'yolo_bot',
  },
} as const;

export const YOLO_SITE_BASE = 'https://www.yolo-japan.com';

export const LINE_API = {
  REPLY: 'https://api.line.me/v2/bot/message/reply',
  PUSH: 'https://api.line.me/v2/bot/message/push',
  RICHMENU_LINK: 'https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}',
  LOADING_ANIMATION: 'https://api.line.me/v2/bot/chat/loading/start',
} as const;

export const CONSTANTS = {
  MODE: {
    DIAGNOSIS: 'diagnosis' as const,
    AI_CHAT: 'ai_chat' as const,
  },
  BUTTON: {
    FIND_JOB: 'FIND_JOB',
    VIEW_FEATURES: 'VIEW_FEATURES',
    CONTACT: 'CONTACT',
    LANG_CHANGE: 'LANG_CHANGE',
    AI_MODE: 'AI_MODE',
    SITE_MODE: 'SITE_MODE',
    START_DIAGNOSIS: 'START_DIAGNOSIS',
    NO_THANKS: 'NO_THANKS',
  },
  LANG_MAP: {
    ja: 'ja',
    en: 'en',
    ko: 'ko',
    zh: 'zh',
    vi: 'vi',
  },
} as const;

export const FAQ_CONTENT = `
【在留カードについて】
Q: 在留カードの支援や更新は行っていますか？
A: 恐れ入りますが、現在在留カードの更新や支援は行っておりません。

【登録・アカウントについて】
Q: パスワードを忘れました。
A: https://www.yolo-japan.com/ja/recruit/reminder

【仕事について】
Q: お仕事に応募するには？
A: まず登録をお願いします。

Q: 海外から応募できますか？
A: 日本在住の外国人で就労可能な在留カードをお持ちの方のみ応募可能です。
`;
