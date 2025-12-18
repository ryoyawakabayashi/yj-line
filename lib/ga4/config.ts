// GA4 Configuration
export const GA4_CONFIG = {
  propertyId: '254025837',
  serviceAccount: {
    type: 'service_account',
    project_id: 'yolo-japan-com',
    private_key_id: 'ee78dbb7558cd138658ee0ce7c3891015e756175',
    private_key: [
        "-----BEGIN PRIVATE KEY-----",
        "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCcmgyfIc30HCIy",
    "UwqAeg8gVqnBv4qdNrto0/lzM0tbN5zu/UzBnpLzI8r/lNZ0c5sWyWcpMNhhu43T",
    "guK1QE9uXOjCAIgKYEDRiCPgolc6tOm/Dza0zGCQKzml3SoIFvTa+5L7RAnenXry",
    "RVe3aAm9Ckl8Gq18IeouZHVQQBOr3DsSj2kVxnxGjEFWApsO/LVAEnHXOt+DKCeB",
    "NJUgsxW/FWWYr7Xl+TWD/luaYpD4wII3H0bzcoLQzf2jaU346HRiXT/YQUZLdTMG",
    "VSeJIrwSn1w6hhuhQSOc36EeLthVcsXYAKUTB7D6CIvz6HW0CrTrLVLxc6jrpcK1",
    "P2jsq7CfAgMBAAECggEAE/pA/vH4jJokMKhQUCiCEn2LxWgyfjDTwqE8Etqp09ap",
    "4gEVUCPzGipoRKePniZ7U/JYgzQ0fm9HPgLV+gpct7cJiGo58Jzr1+8WqJr9JsOa",
    "iCGgOHtUHEAvZ/3pVUPcc60hSIWa/re3Tf3TnVWb3G5aBod+tzW6YrW1E4pBGCza",
    "kJpxvTNP0bbhrYJaLMzs4y1rIPuzkOP+8r0piMGSs8dCahu7bRwQ2y7QTViaugLl",
    "eTf/1XSrE0t2rmZ8C/6LpbleSYaGepPINGMxt7wubbkfXSDOQI7BgGz8fwEgI/S6",
    "QD5B9cT8Yy83eJrv7JsiakcwUsVrTdtGOqz/P2g9SQKBgQDNFsvJDcDnKHZmmmTt",
    "zlvv0f8CK4Dg96iNNr4ONI+JoBeyPrqE38gAotzmjL9U6ZI6Xix7LBvaZzdYAAsk",
    "uuw+EadoLpapT9JeYZJaL8bcc+CimauMJRCLA4pJvrjrH9LX/wDSuNcVo0CyfaiD",
    "9dstMtYbbRDxBow+uHFmLSAY2QKBgQDDee8v6T85cJ2sbFbglR8O8iWN0cMSWnVV",
    "pgd9ateEysV53bZAK7PBuYDDVDB7txFEvGlHeGJianW/Eod//V+xWq084YnpJcLt",
    "YSeZvax199U2hTa/BvHmQvBbvI69ZMDS+rY8NJcGx6yP5wLq2h/xn2W6TBFT3ZxS",
    "hauE+pDqNwKBgDfswm811+dw6jB6Y5FRV1KjMeWWlVNDVWwEhHj9LjL6O9v4LQZ0",
    "u2YpAxG/SaFO+/f8nCaOVZ4NzVKq2F8QtcELMVpAcgcDZDsmYjFDm/ebhaLxQo05",
    "wjQWKAyJ/ITpLaaGu+O6UbRtywOhLmWlkjnWBfp+mEMRZQbpZsrU/U6pAoGBAIGv",
    "7BiFTwT0yicS2bC2PpzT2kZ03E7Y5O+l72It+D6JqOppRfjdBa2JPPxaZrAtjK9l",
    "sRNRszRIHUZfLLali09HMZgqqiyceO60fmlphXneqv4481FZcjOqRX0XZDwTFDrl",
    "SvI2kdxVrQ7r3OujO346mms2/Gf/py64sErRUkORAoGBALdADgaVqhWaG7+1HhMc",
    "pNfgnxeGNWEyxC5zeC85NW4WgY3zk7pUO5eweqUunCNbq8KrSGkz0UyGUjU7D4YQ",
    "SMfDJNWXOmEP2G5NbGdTGZBszsmRUNvdT4waODG364wnXwKxLh8e1ngG0dZLuH6k",
    "H2j6DajStpDRLfFkWLKVAm7S",
    "-----END PRIVATE KEY-----"
    ].join("\n"),
    client_email: 'reporting-api-v4-ga4@yolo-japan-com.iam.gserviceaccount.com',
    client_id: '106608491340525602643',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      'https://www.googleapis.com/robot/v1/metadata/x509/reporting-api-v4-ga4%40yolo-japan-com.iam.gserviceaccount.com',
    universe_domain: 'googleapis.com',
  },
};

// LINE source parameters to track (all)
export const LINE_SOURCES = [
  'line / message',
  'line / autochat',
  'line / menu',
  'line / feature',  // 特集タップ用
  'step.lme.jp / referral',
  'line / chatbot',
  'instagram / line',
] as const;

// 5種類のコンバージョンファネルソース定義
export const FUNNEL_SOURCES = {
  diagnosis: 'line / chatbot',       // AI診断
  menu: 'line / menu',               // メニュータップ
  feature: 'line / feature',         // 特集タップ
  message: 'line / message',         // メッセージ配信
  autochat: 'line / autochat',       // AIトーク
} as const;

export type FunnelType = keyof typeof FUNNEL_SOURCES;

// ファネルのラベル（日本語表示用）
export const FUNNEL_LABELS: Record<FunnelType, string> = {
  diagnosis: 'AI診断',
  menu: 'メニュータップ',
  feature: '特集タップ',
  message: 'メッセージ配信',
  autochat: 'AIトーク',
};

// LINE Bot funnel sources (for accurate funnel calculation)
// These are the main sources from LINE Bot: menu, chatbot (diagnosis result), message
export const LINE_BOT_FUNNEL_SOURCES = [
  'line / message',
  'line / menu',
  'line / chatbot',
] as const;

// Diagnosis funnel source (chatbot only - for diagnosis → session → CV funnel)
// 診断結果のURLクリック = line / chatbot のみ
export const DIAGNOSIS_FUNNEL_SOURCE = 'line / chatbot' as const;

// Key events for tracking - separated by YJ (YOLO JAPAN) and YD (YOLO DIRECT)
export const GA4_KEY_EVENTS = {
  yj: {
    registration: ['new_registration', 'registration_application_wizard_basic_in'],
    application: ['complete_work'],
  },
  yd: {
    registration: ['new_registration_complete'],
    application: ['pj_application_complete'],
  },
} as const;

// Helper to get all events
export const getAllKeyEvents = () => [
  ...GA4_KEY_EVENTS.yj.registration,
  ...GA4_KEY_EVENTS.yj.application,
  ...GA4_KEY_EVENTS.yd.registration,
  ...GA4_KEY_EVENTS.yd.application,
];

// Source labels for display
export const SOURCE_LABELS: Record<string, string> = {
  'line / message': 'メッセージ',
  'line / autochat': 'AI チャット',
  'line / menu': 'リッチメニュー',
  'line / feature': '特集',
  'step.lme.jp / referral': 'STEP 経由',
  'line / chatbot': 'チャットボット',
  'instagram / line': 'Instagram 経由',
};
