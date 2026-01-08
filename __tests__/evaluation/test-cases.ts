// =====================================================
// AI評価テスト用ケース
// 過去の問い合わせ事例をベースに作成
// =====================================================

export interface TestCase {
  id: string;
  category: 'bug' | 'feedback' | 'faq';
  service: 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN' | null;
  userInput: string;
  expectedKeywords: string[];      // 応答に含まれるべきキーワード
  forbiddenKeywords?: string[];    // 応答に含まれてはいけないキーワード
  expectedUrl?: string;            // 応答に含まれるべきURL
  notes?: string;                  // テストの補足説明
}

// =====================================================
// 既知の不具合報告ケース
// =====================================================
export const BUG_REPORT_CASES: TestCase[] = [
  {
    id: 'BUG-HOME-001',
    category: 'bug',
    service: 'YOLO_HOME',
    userInput: 'ログアウト状態で物件のお問い合わせボタンを押すと「ページが見つかりません」と出る',
    expectedKeywords: ['確認', '調査'],
    notes: '既知の不具合。調査中であることを伝えるべき',
  },
  {
    id: 'BUG-DISCOVER-001',
    category: 'bug',
    service: 'YOLO_DISCOVER',
    userInput: 'Instagramの投稿リンクを入れると「TikTok投稿のURLを入力してください」と表示される',
    expectedKeywords: ['確認', '調査'],
    notes: 'Instagram/TikTok混同バグ',
  },
  {
    id: 'BUG-DISCOVER-002',
    category: 'bug',
    service: 'YOLO_DISCOVER',
    userInput: 'イエローカード2枚で応募停止になったけど、完了報告済みのプロジェクトに応募できない',
    expectedKeywords: ['確認', '調査'],
    notes: 'イエローカード累積による応募停止の不具合',
  },
  {
    id: 'BUG-DISCOVER-003',
    category: 'bug',
    service: 'YOLO_DISCOVER',
    userInput: '自分の居住地のプロジェクトなのに「住んでいる場所とは別の都道府県です」と出る',
    expectedKeywords: ['確認', '調査'],
    notes: '居住地判定の不具合',
  },
  {
    id: 'BUG-DISCOVER-004',
    category: 'bug',
    service: 'YOLO_DISCOVER',
    userInput: 'メッセージ機能が使えないときがある',
    expectedKeywords: ['確認', '調査'],
    notes: 'メッセージ機能の断続的な不具合',
  },
];

// =====================================================
// FAQ（よくある質問）ケース
// =====================================================
export const FAQ_CASES: TestCase[] = [
  {
    id: 'FAQ-HOME-001',
    category: 'faq',
    service: 'YOLO_HOME',
    userInput: '物件について質問したい',
    expectedKeywords: ['お問い合わせ', 'ボタン', '物件ページ'],
    notes: '物件ページの問い合わせボタンを案内',
  },
  {
    id: 'FAQ-JOB-001',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: 'メルマガ停止したい',
    expectedKeywords: ['設定'],
    expectedUrl: 'https://www.yolo-japan.com/ja/recruit/mypage/mail/input',
    notes: 'メルマガ設定ページを案内',
  },
  {
    id: 'FAQ-JOB-002',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: '退会したい',
    expectedKeywords: ['退会'],
    expectedUrl: 'https://www.yolo-japan.com/ja/withdraw/',
    notes: '退会ページを案内',
  },
  {
    id: 'FAQ-JOB-003',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: '新しい動画をアップしたい',
    expectedKeywords: ['動画'],
    expectedUrl: 'https://www.yolo-japan.com/en/my-page/introduction-video',
    notes: '動画アップロードページを案内',
  },
  {
    id: 'FAQ-JOB-004',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: '勝手に辞退になった',
    expectedKeywords: ['自動', 'キャンセル'],
    forbiddenKeywords: ['バグ', '不具合'],
    notes: '自動キャンセルの仕様説明',
  },
  {
    id: 'FAQ-JOB-005',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: 'すぐに不採用になった。なんで？',
    expectedKeywords: ['理由', '開示'],
    notes: '不採用理由は開示不可と説明',
  },
  {
    id: 'FAQ-JOB-006',
    category: 'faq',
    service: 'YOLO_JAPAN',
    userInput: 'スカウトってボットが送ってるの？',
    expectedKeywords: ['企業', '直接'],
    notes: '企業が直接送っていることを説明（「ボットではない」という否定文脈はOK）',
  },
];

// =====================================================
// 全テストケース
// =====================================================
export const ALL_TEST_CASES: TestCase[] = [
  ...BUG_REPORT_CASES,
  ...FAQ_CASES,
];

// =====================================================
// テスト結果の型
// =====================================================
export interface TestResult {
  caseId: string;
  passed: boolean;
  userInput: string;
  aiResponse: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  foundForbiddenKeywords: string[];
  urlFound: boolean;
  score: number; // 0-100
}

// =====================================================
// テスト結果集計
// =====================================================
export interface TestSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  successRate: number;
  results: TestResult[];
}
