// =====================================================
// Categories - ファネル型絞り込みフローのカテゴリー階層
// =====================================================

/**
 * カテゴリーのアクション種別
 */
export type CategoryActionType =
  | 'faq'           // FAQ回答を返す
  | 'diagnosis'     // AI診断を発火
  | 'url'           // URLを送信
  | 'escalate'      // 有人対応へエスカレーション
  | 'subcategory';  // サブカテゴリーを表示

/**
 * カテゴリーアクション定義
 */
export interface CategoryAction {
  type: CategoryActionType;
  faqId?: string;           // FAQ IDまたはレスポンスキー
  url?: string;             // 送信するURL
  presetData?: {            // AI診断へのプリセットデータ
    prefecture?: string;
    industry?: string;
    workingDays?: string;
    region?: string;
  };
}

/**
 * カテゴリー定義
 */
export interface Category {
  id: string;
  keywords: string[];               // 検出用キーワード（多言語対応）
  labels: Record<string, string>;   // 言語別ラベル
  children?: Category[];            // 子カテゴリー
  action?: CategoryAction;          // 最終アクション
}

// =====================================================
// 多言語ラベル定義
// =====================================================

const LABELS = {
  // トップレベルカテゴリー
  job_search: {
    ja: '仕事を探す',
    en: 'Find Jobs',
    ko: '일자리 찾기',
    zh: '找工作',
    vi: 'Tìm việc làm',
  },
  account: {
    ja: 'アカウント・登録',
    en: 'Account/Registration',
    ko: '계정/등록',
    zh: '账户/注册',
    vi: 'Tài khoản/Đăng ký',
  },
  service_trouble: {
    ja: 'サービスに関する問題',
    en: 'Service Issues',
    ko: '서비스 문제',
    zh: '服务问题',
    vi: 'Vấn đề dịch vụ',
  },
  other: {
    ja: 'その他',
    en: 'Other',
    ko: '기타',
    zh: '其他',
    vi: 'Khác',
  },

  // 仕事探しのサブカテゴリー
  ai_search: {
    ja: 'AIでぴったりの仕事を探す',
    en: 'Find jobs with AI',
    ko: 'AI로 적합한 일자리 찾기',
    zh: '用AI找工作',
    vi: 'Tìm việc bằng AI',
  },
  site_search: {
    ja: 'サイトで探す',
    en: 'Search on site',
    ko: '사이트에서 검색',
    zh: '在网站上搜索',
    vi: 'Tìm trên trang web',
  },
  visa_support: {
    ja: 'ビザサポート求人',
    en: 'Visa Support Jobs',
    ko: '비자 지원 일자리',
    zh: '签证支持工作',
    vi: 'Việc hỗ trợ visa',
  },

  // アカウント関連サブカテゴリー
  login_issue: {
    ja: 'ログインできない',
    en: "Can't login",
    ko: '로그인 불가',
    zh: '无法登录',
    vi: 'Không thể đăng nhập',
  },
  password_reset: {
    ja: 'パスワードを忘れた',
    en: 'Forgot password',
    ko: '비밀번호를 잊었습니다',
    zh: '忘记密码',
    vi: 'Quên mật khẩu',
  },
  change_email: {
    ja: 'メールアドレスを変更したい',
    en: 'Change email address',
    ko: '이메일 주소 변경',
    zh: '更改邮箱地址',
    vi: 'Thay đổi địa chỉ email',
  },
  profile_edit: {
    ja: 'プロフィールを編集したい',
    en: 'Edit profile',
    ko: '프로필 편집',
    zh: '编辑个人资料',
    vi: 'Chỉnh sửa hồ sơ',
  },
  withdraw: {
    ja: '退会したい',
    en: 'Delete account',
    ko: '탈퇴하고 싶습니다',
    zh: '注销账户',
    vi: 'Xóa tài khoản',
  },

  // 応募・面接関連カテゴリー
  application_interview: {
    ja: '応募・面接について',
    en: 'Application/Interview',
    ko: '지원/면접',
    zh: '申请/面试',
    vi: 'Ứng tuyển/Phỏng vấn',
  },
  no_contact_from_company: {
    ja: '企業から連絡がない',
    en: 'No contact from company',
    ko: '회사에서 연락이 없습니다',
    zh: '公司没有联系',
    vi: 'Công ty không liên hệ',
  },
  application_no_reply: {
    ja: '応募後の流れを知りたい',
    en: 'What happens after applying',
    ko: '지원 후 진행 과정',
    zh: '申请后的流程',
    vi: 'Quy trình sau khi ứng tuyển',
  },
  cancel_interview: {
    ja: '面接をキャンセルしたい',
    en: 'Cancel interview',
    ko: '면접 취소',
    zh: '取消面试',
    vi: 'Hủy phỏng vấn',
  },
  auto_cancelled: {
    ja: '自動キャンセルされた',
    en: 'Auto cancelled',
    ko: '자동 취소됨',
    zh: '自动取消',
    vi: 'Tự động hủy',
  },

  // メール配信関連カテゴリー
  email_delivery: {
    ja: 'メール配信について',
    en: 'Email Delivery',
    ko: '이메일 수신',
    zh: '邮件订阅',
    vi: 'Nhận email',
  },
  stop_newsletter: {
    ja: 'メルマガを停止したい',
    en: 'Stop newsletter',
    ko: '뉴스레터 중지',
    zh: '停止订阅',
    vi: 'Dừng bản tin',
  },
  confirmation_email_not_received: {
    ja: '確認メールが届かない',
    en: 'Confirmation email not received',
    ko: '확인 이메일이 오지 않습니다',
    zh: '没有收到确认邮件',
    vi: 'Không nhận được email xác nhận',
  },
};

// =====================================================
// カテゴリー階層定義
// =====================================================

/**
 * YOLO JAPAN用カテゴリー
 */
export const YOLO_JAPAN_CATEGORIES: Category[] = [
  {
    id: 'job_search',
    keywords: ['仕事', '求人', 'job', 'work', '探し', '일자리', '找工作', 'việc làm', 'アルバイト', 'パート', 'バイト', '働き'],
    labels: LABELS.job_search,
    children: [
      {
        id: 'ai_search',
        keywords: ['AI', 'おすすめ', 'recommend', 'ぴったり', '診断'],
        labels: LABELS.ai_search,
        action: { type: 'diagnosis' },
      },
      {
        id: 'site_search',
        keywords: ['サイト', '検索', 'search', 'site', '一覧'],
        labels: LABELS.site_search,
        action: {
          type: 'url',
          url: 'https://www.yolo-japan.com/ja/recruit/',
        },
      },
      {
        id: 'visa_support',
        keywords: [
          'ビザ', 'visa', '就労', 'サポート', 'support', '特定技能',
          '在留資格', 'スポンサー', 'sponsorship', 'ワーホリ', 'ワーキングホリデー',
          '留学生', '技人国', '特定活動', '資格外活動',
        ],
        labels: LABELS.visa_support,
        action: {
          type: 'url',
          url: 'https://www.yolo-japan.com/ja/recruit/feature/category/jobs_that_match_with_your_residence_status',
        },
      },
    ],
  },
  {
    id: 'application_interview',
    keywords: ['応募', '面接', 'apply', 'interview', '지원', '면접', '申请', '面试', 'ứng tuyển', 'phỏng vấn', '連絡がない', '連絡こない'],
    labels: LABELS.application_interview,
    children: [
      {
        id: 'no_contact_from_company',
        keywords: ['連絡がない', '連絡こない', '連絡取れない', '返事がない', 'no contact', 'no reply', '연락이 없'],
        labels: LABELS.no_contact_from_company,
        action: { type: 'faq', faqId: 'no_contact_from_company' },
      },
      {
        id: 'application_no_reply',
        keywords: ['応募後', '流れ', 'after applying', '지원 후', '申请后'],
        labels: LABELS.application_no_reply,
        action: { type: 'faq', faqId: 'application_no_reply' },
      },
      {
        id: 'cancel_interview',
        keywords: ['キャンセル', 'cancel', '辞退', '취소', '取消'],
        labels: LABELS.cancel_interview,
        action: { type: 'faq', faqId: 'cancel_interview' },
      },
      {
        id: 'auto_cancelled',
        keywords: ['自動', '勝手に', 'auto', '자동', '自动'],
        labels: LABELS.auto_cancelled,
        action: { type: 'faq', faqId: 'auto_cancelled' },
      },
    ],
  },
  {
    id: 'account',
    keywords: ['アカウント', 'account', '登録', 'register', 'ログイン', 'login', '계정', '账户', 'tài khoản'],
    labels: LABELS.account,
    children: [
      {
        id: 'login_issue',
        keywords: ['ログイン', 'login', '入れない', "can't login", '로그인'],
        labels: LABELS.login_issue,
        action: { type: 'faq', faqId: 'forgot_password' },
      },
      {
        id: 'password_reset',
        keywords: ['パスワード', 'password', '忘れ', 'forgot', '비밀번호', '密码'],
        labels: LABELS.password_reset,
        action: { type: 'faq', faqId: 'forgot_password' },
      },
      {
        id: 'change_email',
        keywords: ['メールアドレス', 'メアド', 'email', 'change email', '이메일', '邮箱'],
        labels: LABELS.change_email,
        action: { type: 'faq', faqId: 'change_email' },
      },
      {
        id: 'profile_edit',
        keywords: ['プロフィール', 'profile', '編集', 'edit', '履歴書'],
        labels: LABELS.profile_edit,
        action: {
          type: 'url',
          url: 'https://www.yolo-japan.com/ja/recruit/mypage/',
        },
      },
      {
        id: 'withdraw',
        keywords: ['退会', 'withdraw', '削除', 'delete', '解約', 'cancel', '탈퇴', '注销'],
        labels: LABELS.withdraw,
        action: { type: 'faq', faqId: 'withdraw_account' },
      },
    ],
  },
  {
    id: 'email_delivery',
    keywords: ['メール', 'email', 'メルマガ', 'newsletter', '이메일', '邮件', '届かない', '停止'],
    labels: LABELS.email_delivery,
    children: [
      {
        id: 'stop_newsletter',
        keywords: ['停止', 'メルマガ', 'stop', 'unsubscribe', '중지', '停止订阅'],
        labels: LABELS.stop_newsletter,
        action: { type: 'faq', faqId: 'stop_newsletter' },
      },
      {
        id: 'confirmation_email_not_received',
        keywords: ['届かない', '来ない', 'not received', '오지 않', '没有收到', '確認メール'],
        labels: LABELS.confirmation_email_not_received,
        action: { type: 'faq', faqId: 'confirmation_email_not_received' },
      },
    ],
  },
  {
    id: 'service_trouble',
    keywords: ['問題', 'problem', 'issue', 'trouble', '困って', 'トラブル', 'エラー', 'error', '使えない'],
    labels: LABELS.service_trouble,
    action: { type: 'escalate' },
  },
  {
    id: 'other',
    keywords: ['その他', 'other', '기타', '其他', 'khác', '別の', '違う'],
    labels: LABELS.other,
    action: { type: 'escalate' },
  },
];

/**
 * YOLO DISCOVER用カテゴリー
 */
export const YOLO_DISCOVER_CATEGORIES: Category[] = [
  {
    id: 'project_search',
    keywords: ['プロジェクト', 'project', '体験', 'experience', '探し', '참여', '项目', 'dự án'],
    labels: {
      ja: 'プロジェクトを探す',
      en: 'Find Projects',
      ko: '프로젝트 찾기',
      zh: '找项目',
      vi: 'Tìm dự án',
    },
    action: {
      type: 'url',
      url: 'https://discover.yolo-japan.com/',
    },
  },
  {
    id: 'account',
    keywords: ['アカウント', 'account', '登録', 'register', 'ログイン', 'login', 'eKYC', '本人確認'],
    labels: LABELS.account,
    children: [
      {
        id: 'ekyc_issue',
        keywords: ['eKYC', '本人確認', '認証', '写真', 'verification'],
        labels: {
          ja: '本人確認(eKYC)ができない',
          en: "Can't complete eKYC",
          ko: 'eKYC를 완료할 수 없습니다',
          zh: '无法完成eKYC',
          vi: 'Không thể hoàn thành eKYC',
        },
        action: { type: 'faq', faqId: 'ekyc_issue' },
      },
      {
        id: 'login_issue',
        keywords: ['ログイン', 'login', '入れない'],
        labels: LABELS.login_issue,
        action: { type: 'escalate' }, // バグ報告フォームへ
      },
    ],
  },
  {
    id: 'checkin_issue',
    keywords: ['チェックイン', 'checkin', 'check-in', 'コード', 'code'],
    labels: {
      ja: 'チェックインの問題',
      en: 'Check-in Issues',
      ko: '체크인 문제',
      zh: '签到问题',
      vi: 'Vấn đề check-in',
    },
    action: { type: 'escalate' }, // 企業トラブルへ
  },
  {
    id: 'enterprise_trouble',
    keywords: ['企業', 'company', '店舗', 'store', 'トラブル', 'trouble', '対応', '連絡'],
    labels: {
      ja: '企業・店舗の問題',
      en: 'Company/Store Issues',
      ko: '기업/매장 문제',
      zh: '企业/店铺问题',
      vi: 'Vấn đề công ty/cửa hàng',
    },
    action: { type: 'escalate' }, // CS+Cマーケ通知へ
  },
  {
    id: 'other',
    keywords: ['その他', 'other', '기타', '其他', 'khác'],
    labels: LABELS.other,
    action: { type: 'escalate' },
  },
];

/**
 * YOLO HOME用カテゴリー
 */
export const YOLO_HOME_CATEGORIES: Category[] = [
  {
    id: 'property_search',
    keywords: ['物件', 'property', '部屋', 'room', '家', 'house', '賃貸', 'rent', '住まい'],
    labels: {
      ja: '物件を探す',
      en: 'Find Properties',
      ko: '물건 찾기',
      zh: '找房子',
      vi: 'Tìm nhà',
    },
    action: {
      type: 'url',
      url: 'https://home.yolo-japan.com/',
    },
  },
  {
    id: 'property_inquiry',
    keywords: ['問い合わせ', 'inquiry', '質問', 'question', '詳細', 'details'],
    labels: {
      ja: '物件について質問',
      en: 'Property Questions',
      ko: '물건에 대한 질문',
      zh: '关于房源的问题',
      vi: 'Câu hỏi về bất động sản',
    },
    action: { type: 'faq', faqId: 'property_inquiry' },
  },
  {
    id: 'account',
    keywords: ['アカウント', 'account', '登録', 'register', 'ログイン', 'login'],
    labels: LABELS.account,
    action: { type: 'escalate' },
  },
  {
    id: 'other',
    keywords: ['その他', 'other', '기타', '其他', 'khác'],
    labels: LABELS.other,
    action: { type: 'escalate' },
  },
];

// =====================================================
// ヘルパー関数
// =====================================================

import { ServiceType } from '@/types/support';

/**
 * サービスに応じたカテゴリーリストを取得
 */
export function getCategoriesForService(service: ServiceType | undefined): Category[] {
  switch (service) {
    case 'YOLO_JAPAN':
      return YOLO_JAPAN_CATEGORIES;
    case 'YOLO_DISCOVER':
      return YOLO_DISCOVER_CATEGORIES;
    case 'YOLO_HOME':
      return YOLO_HOME_CATEGORIES;
    default:
      return YOLO_JAPAN_CATEGORIES; // デフォルト
  }
}

/**
 * IDでカテゴリーを検索（深さ優先）
 */
export function findCategoryById(
  categories: Category[],
  id: string
): Category | null {
  for (const category of categories) {
    if (category.id === id) {
      return category;
    }
    if (category.children) {
      const found = findCategoryById(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * カテゴリーのラベルを取得
 */
export function getCategoryLabel(category: Category, lang: string): string {
  return category.labels[lang] || category.labels.ja || category.id;
}

/**
 * トップレベルカテゴリーのクイックリプライアイテムを生成
 */
export function generateCategoryQuickReplies(
  categories: Category[],
  lang: string
): Array<{
  type: 'action';
  action: {
    type: 'message';
    label: string;
    text: string;
  };
}> {
  return categories.slice(0, 13).map((category) => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: getCategoryLabel(category, lang).slice(0, 20), // LINEの制限
      text: getCategoryLabel(category, lang),
    },
  }));
}

/**
 * 子カテゴリーのクイックリプライアイテムを生成
 */
export function generateSubcategoryQuickReplies(
  category: Category,
  lang: string
): Array<{
  type: 'action';
  action: {
    type: 'message';
    label: string;
    text: string;
  };
}> | null {
  if (!category.children) return null;

  return category.children.slice(0, 13).map((child) => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: getCategoryLabel(child, lang).slice(0, 20),
      text: getCategoryLabel(child, lang),
    },
  }));
}
