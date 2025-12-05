// lib/constants.ts
export const CONSTANTS = {
  MODE: {
    DIAGNOSIS: "diagnosis",
    AI_CHAT: "ai_chat",
  },
  BUTTON: {
    FIND_JOB: "FIND_JOB",
    VIEW_FEATURES: "VIEW_FEATURES",
    CONTACT: "CONTACT",
    LANG_CHANGE: "LANG_CHANGE",
    AI_MODE: "AI_MODE",
    SITE_MODE: "SITE_MODE",
    START_DIAGNOSIS: "START_DIAGNOSIS",
    NO_THANKS: "NO_THANKS",
  },
  LANG_MAP: {
    ja: "ja",
    en: "en",
    ko: "ko",
    zh: "zh",
    vi: "vi",
  },
} as const;

export type LangCode = keyof typeof CONSTANTS.LANG_MAP;

export type RegionCode = 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku' | 'shikoku' | 'kyushu';

export interface Prefecture {
  code: string;
  label_ja: string;
  label_en: string;
  label_ko: string;
  label_zh: string;
  label_vi: string;
}

export const YOLO_SITE_BASE = "https://www.yolo-japan.com";

// UTM
export const UTM_SOURCE = "line";
export const UTM_MEDIUM = "chatbot";
export const UTM_CAMPAIGN = "yolo_bot";

// LINE API エンドポイント
export const LINE_API = {
  REPLY: "https://api.line.me/v2/bot/message/reply",
  PUSH: "https://api.line.me/v2/bot/message/push",
  RICHMENU_LINK: "https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}",
  LOADING_ANIMATION: "https://api.line.me/v2/bot/chat/loading/start",
} as const;

// OpenAI API エンドポイント
export const OPENAI_API = {
  CHAT: "https://api.openai.com/v1/chat/completions",
} as const;
