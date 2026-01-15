// =====================================================
// Special Pattern Detector - バグ報告・企業トラブル検出
// =====================================================

import { ServiceType } from '@/types/support';

/**
 * 特殊パターンの種類
 */
export type SpecialPatternType =
  | 'bug_report'           // バグ報告 → Googleフォーム案内
  | 'enterprise_trouble'   // 企業トラブル → CS+Cマーケ通知
  | null;                  // 通常のFAQ処理

/**
 * 特殊パターン検出結果
 */
export interface SpecialPatternResult {
  type: SpecialPatternType;
  patternId: string | null;
  patternName: string | null;
  confidence: number;
}

// =====================================================
// バグ報告パターン定義（Googleフォーム案内）
// =====================================================

interface BugPattern {
  id: string;
  service: ServiceType | 'ALL';
  keywords: string[];
  description: string;
}

const BUG_PATTERNS: BugPattern[] = [
  // === YOLO JAPAN ===
  {
    id: 'yj_password_reset_mail',
    service: 'YOLO_JAPAN',
    keywords: ['パスワード', 'メール届かない', 'reset mail', 'パスワード再設定', 'メールが来ない'],
    description: 'パスワード再設定メールが届かない',
  },
  {
    id: 'yj_email_change',
    service: 'YOLO_JAPAN',
    keywords: ['メアド変更', 'メールアドレス変更', 'メール変更したい', 'メアド変えたい'],
    description: 'メールアドレス変更（マイページ不可）',
  },
  {
    id: 'yj_login_disabled',
    service: 'YOLO_JAPAN',
    keywords: ['ログインできない', '無効なアカウント', 'アカウント無効', "can't login", 'cannot login'],
    description: 'ログインできない / アカウント無効',
  },
  {
    id: 'yj_residence_card_upload',
    service: 'YOLO_JAPAN',
    keywords: ['在留カード', 'アップロードできない', '在留カードが登録', '身分証アップロード'],
    description: '在留カードをアップロードできない',
  },
  {
    id: 'yj_unknown_registration',
    service: 'YOLO_JAPAN',
    keywords: ['知らない人', '勝手に登録', '登録された覚え', '身に覚えがない'],
    description: '知らない人に登録された・退会したい',
  },
  {
    id: 'yj_application_history',
    service: 'YOLO_JAPAN',
    keywords: ['応募履歴', '重複', '表示されない', '履歴がおかしい', '同じ求人が'],
    description: '応募履歴の重複/欠落',
  },
  {
    id: 'yj_nationality_id',
    service: 'YOLO_JAPAN',
    keywords: ['外国籍', '身分証', 'パスポートしか', '運転免許証しか', '選択肢がない'],
    description: '外国籍なのに日本国籍の身分証選択肢',
  },
  {
    id: 'yj_work_history',
    service: 'YOLO_JAPAN',
    keywords: ['職歴', '追加できない', '職歴が保存', '経歴が登録'],
    description: '職歴が追加できない',
  },
  {
    id: 'yj_system_mail',
    service: 'YOLO_JAPAN',
    keywords: ['システムメール', 'メールが届かない', '通知メール', 'お知らせメール'],
    description: 'システムメールが届かない',
  },

  // === YOLO DISCOVER ===
  {
    id: 'yd_screen_not_display',
    service: 'YOLO_DISCOVER',
    keywords: ['画面', '表示されない', '真っ白', 'ページが開かない', '表示できない'],
    description: '画面が表示されない',
  },
  {
    id: 'yd_message_not_work',
    service: 'YOLO_DISCOVER',
    keywords: ['メッセージ', '使えない', '送れない', 'メッセージ機能', 'メッセージが送信'],
    description: 'メッセージ機能が使えない',
  },
  {
    id: 'yd_project_detail',
    service: 'YOLO_DISCOVER',
    keywords: ['条件', '確認できない', '詳細が見れない', 'プロジェクト詳細'],
    description: 'プロジェクト詳細が確認できない',
  },
  {
    id: 'yd_push_notification',
    service: 'YOLO_DISCOVER',
    keywords: ['プッシュ', '通知', '送れない', '通知が来ない', 'プッシュ通知'],
    description: 'プッシュ通知を送れない',
  },
  {
    id: 'yd_login',
    service: 'YOLO_DISCOVER',
    keywords: ['ログイン', 'できない', 'ログインエラー', 'ログインが'],
    description: 'ログインできない',
  },
  {
    id: 'yd_withdraw',
    service: 'YOLO_DISCOVER',
    keywords: ['退会', 'アカウント削除', '退会したい', 'アカウントを消'],
    description: '退会したい（マイページ不可）',
  },
  {
    id: 'yd_instagram_tiktok',
    service: 'YOLO_DISCOVER',
    keywords: ['Instagram', 'TikTok', 'エラー', 'インスタ', 'ティックトック'],
    description: 'Instagram投稿でTikTokエラー',
  },
  {
    id: 'yd_yellow_card_apply',
    service: 'YOLO_DISCOVER',
    keywords: ['イエローカード', '応募できない', '停止', '応募停止'],
    description: 'イエローカード2枚で応募不可',
  },
  {
    id: 'yd_prefecture_alert',
    service: 'YOLO_DISCOVER',
    keywords: ['居住地', '都道府県', 'アラート', '別の都道府県'],
    description: '居住地プロジェクトで別都道府県アラート',
  },
  {
    id: 'yd_auto_cancel_reapply',
    service: 'YOLO_DISCOVER',
    keywords: ['自動キャンセル', '応募済み', '再応募', '再応募できない'],
    description: '自動キャンセルが応募済み表示で再応募不可',
  },
  {
    id: 'yd_auto_approve_yellow',
    service: 'YOLO_DISCOVER',
    keywords: ['自動承認', 'イエローカード', 'アラート'],
    description: '自動承認でイエローカードアラート表示',
  },
  {
    id: 'yd_completion_alert',
    service: 'YOLO_DISCOVER',
    keywords: ['完了報告', 'アラート', '表示', '出たまま'],
    description: '完了報告後もアラート表示継続',
  },
  {
    id: 'yd_yellow_card_bug',
    service: 'YOLO_DISCOVER',
    keywords: ['イエローカード', '不具合', 'バグ', 'おかしい'],
    description: 'イエローカード実装不具合',
  },
  {
    id: 'yd_yellow_card_unexperienced',
    service: 'YOLO_DISCOVER',
    keywords: ['体験していない', 'イエローカード', 'メール', '届いた'],
    description: '未体験でイエローカードメール',
  },
  {
    id: 'yd_status_bug',
    service: 'YOLO_DISCOVER',
    keywords: ['ステータス', '変更', '不具合', 'ステータス名'],
    description: 'ステータス名変更不具合',
  },
  {
    id: 'yd_language_mail',
    service: 'YOLO_DISCOVER',
    keywords: ['言語', '設定', 'メール', '違う言語', '別の言語'],
    description: '設定外言語でメール届く',
  },
  {
    id: 'yd_apply_error',
    service: 'YOLO_DISCOVER',
    keywords: ['エラー', '応募', '完了しない', '応募できない'],
    description: 'エラーで応募完了しない',
  },

  // === YOLO HOME ===
  {
    id: 'yh_contact_404',
    service: 'YOLO_HOME',
    keywords: ['問い合わせ', 'ボタン', '見つかりません', '404', 'ページがない'],
    description: 'ログアウト状態で問い合わせボタン404',
  },
];

// =====================================================
// 企業トラブルパターン定義（CS+Cマーケ通知）
// =====================================================

interface EnterpriseTroublePattern {
  id: string;
  keywords: string[];
  description: string;
}

const ENTERPRISE_TROUBLE_PATTERNS: EnterpriseTroublePattern[] = [
  // キャンセル・イエローカード関連
  {
    id: 'et_cancel_yellow_card',
    keywords: ['キャンセル', '合意', 'イエローカード'],
    description: 'キャンセル合意後にイエローカード受領',
  },
  {
    id: 'et_ring_post',
    keywords: ['指輪', '投稿', '体験'],
    description: '体験で作成した指輪の投稿不可',
  },
  {
    id: 'et_unauthorized_cancel',
    keywords: ['無断キャンセル', '勝手にキャンセル', '企業がキャンセル'],
    description: '企業に無断キャンセルされた',
  },
  {
    id: 'et_rude_response',
    keywords: ['無礼', '失礼', '不快', 'ひどい', '対応が悪い'],
    description: '企業から無礼な対応を受けた',
  },
  {
    id: 'et_no_response',
    keywords: ['返事がない', '連絡ない', '連絡つかない', '返信ない', '企業から連絡'],
    description: '企業から返事がない/連絡つかない',
  },
  {
    id: 'et_completion_link',
    keywords: ['完了報告', 'リンク', '見れない', '開けない'],
    description: '完了報告のリンクが見れない',
  },
  {
    id: 'et_closed_day',
    keywords: ['承認', '定休日', '閉まって', 'お休み'],
    description: '承認されて訪れたのに定休日',
  },
  {
    id: 'et_checkin_wrong',
    keywords: ['チェックイン', '番号', '間違', 'コードが違う'],
    description: 'チェックイン番号が間違っている',
  },
  {
    id: 'et_no_checkin_post',
    keywords: ['チェックイン', '投稿', 'ない', 'していない'],
    description: 'チェックインせず投稿がない',
  },
  {
    id: 'et_yellow_card_double',
    keywords: ['イエローカード', '2枚', '誤', '間違'],
    description: 'イエローカード2枚溜まった（企業誤操作）',
  },
  {
    id: 'et_deposit',
    keywords: ['デポジット', '金額', '払', '求め', 'お金'],
    description: '企業にデポジット/金額を求められた',
  },
  {
    id: 'et_no_post_private',
    keywords: ['投稿', '非公開', 'しない', '投稿なし'],
    description: '体験後投稿なし/非公開',
  },
  {
    id: 'et_multiple_no_checkin',
    keywords: ['チェックイン', 'していない', 'プロジェクト', '複数'],
    description: 'チェックインしていないプロジェクト複数',
  },
  {
    id: 'et_wrong_checkin',
    keywords: ['企業', '間違え', 'チェックイン'],
    description: '企業が間違えてチェックイン',
  },
  {
    id: 'et_revision_request',
    keywords: ['修正依頼', '分からない', '何を修正'],
    description: '企業の修正依頼が分からない',
  },
  {
    id: 'et_shop_closed',
    keywords: ['訪問', '閉まって', '閉店', 'お店がない'],
    description: '訪問したらお店が閉まっていた',
  },
  {
    id: 'et_self_pay',
    keywords: ['自腹', '自費', 'チェックイン', '自分で払'],
    description: '自腹で参加/チェックインできない',
  },
  {
    id: 'et_not_participated',
    keywords: ['参加していない', 'チェックイン', '勝手に'],
    description: '参加していないのにチェックインされた',
  },
  {
    id: 'et_cancel_then_experience',
    keywords: ['キャンセル', '体験', 'お店', '体験することに'],
    description: 'キャンセル後にお店で体験することに',
  },
  {
    id: 'et_disappointed',
    keywords: ['がっかり', 'サービス', '不満', '期待外れ'],
    description: 'お店のサービスにがっかり',
  },
  {
    id: 'et_message_experience',
    keywords: ['メッセージ', '体験できな', '連絡取れず'],
    description: 'メッセージ使えず体験できなかった',
  },
  {
    id: 'et_approved_but_cant',
    keywords: ['承認', '体験できない', 'ステータス', '変えてくれない'],
    description: '承認後に体験不可と言われた',
  },
  {
    id: 'et_penalty_after_contact',
    keywords: ['連絡', 'ペナルティ', 'キャンセル', '伝えた'],
    description: '連絡したがペナルティキャンセル',
  },
  {
    id: 'et_construction',
    keywords: ['工事中', '場所', '間違', '違う場所'],
    description: '到着したら工事中/場所間違い',
  },
  {
    id: 'et_not_approved',
    keywords: ['完了報告', '承認されない', '承認待ち'],
    description: '完了報告が承認されない',
  },
  {
    id: 'et_hashtag_wrong',
    keywords: ['ハッシュタグ', '間違', 'タグが違う'],
    description: 'ハッシュタグが間違っている',
  },
  {
    id: 'et_datetime_status',
    keywords: ['日時変更', 'ステータス', '変更されない', '反映されない'],
    description: '日時変更応じたがステータス変更されない',
  },
  {
    id: 'et_not_hired',
    keywords: ['採用', 'されない', 'なかなか', '採用待ち'],
    description: '採用がなかなかされない',
  },
  {
    id: 'et_checkin_before_visit',
    keywords: ['来店前', 'チェックイン', '到着前'],
    description: '来店前にチェックインになった',
  },
  {
    id: 'et_penalty_then_invite',
    keywords: ['ペナルティ', 'キャンセル', '来ないか', '招待'],
    description: 'ペナキャン後に来ないかと言われた',
  },
  {
    id: 'et_message_schedule',
    keywords: ['メッセージ', '日程変更', '管理', 'システム外'],
    description: 'メッセージ内で日程変更して管理不能',
  },
  {
    id: 'et_upsell',
    keywords: ['アップセル', '追加購入', '追加で買', '勧められ'],
    description: '企業からアップセル',
  },
  {
    id: 'et_late_cancel',
    keywords: ['遅れ', '遅刻', '無断キャンセル', '遅れて到着'],
    description: '遅れて無断キャンセルになった',
  },
  {
    id: 'et_approve_checkin_same',
    keywords: ['承認', 'チェックイン', '同時', '同じタイミング'],
    description: '承認とチェックインが同時',
  },
  {
    id: 'et_no_code',
    keywords: ['チェックイン', 'コード', 'もらえない', '教えてくれない'],
    description: 'チェックインコードもらえない',
  },
  {
    id: 'et_checkin_failed',
    keywords: ['チェックイン', 'できなかった', '失敗', 'チェックインが'],
    description: 'チェックインができなかった',
  },
  {
    id: 'et_different_course',
    keywords: ['コース', '参加', '可能', '別のコース'],
    description: '違うコース体験に参加可能か',
  },
  {
    id: 'et_content_mismatch',
    keywords: ['掲載', '実際', '相違', '違う', '写真と違う'],
    description: '掲載内容と実際の相違',
  },
];

// =====================================================
// バグ報告フォームURL
// =====================================================
export const BUG_REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform';

// =====================================================
// バグ報告案内メッセージ
// =====================================================
export const BUG_REPORT_MESSAGES: Record<string, string> = {
  ja: `この問題はシステム側で調査が必要です。
お手数ですが、以下のフォームから詳細を報告してください。

${BUG_REPORT_FORM_URL}

担当者が確認次第、ご連絡いたします。`,
  en: `This issue requires investigation by our technical team.
Please report the details using the form below:

${BUG_REPORT_FORM_URL}

We will contact you once our team reviews it.`,
  ko: `이 문제는 기술팀의 조사가 필요합니다.
아래 양식에서 자세한 내용을 보고해 주세요:

${BUG_REPORT_FORM_URL}

확인 후 연락드리겠습니다.`,
  zh: `此问题需要技术团队调查。
请通过以下表单报告详情：

${BUG_REPORT_FORM_URL}

我们的团队审核后会与您联系。`,
  vi: `Vấn đề này cần được đội ngũ kỹ thuật điều tra.
Vui lòng báo cáo chi tiết qua biểu mẫu dưới đây:

${BUG_REPORT_FORM_URL}

Chúng tôi sẽ liên hệ sau khi xem xét.`,
};

// =====================================================
// 企業トラブル対応中メッセージ
// =====================================================
export const ENTERPRISE_TROUBLE_MESSAGES: Record<string, string> = {
  ja: `ご連絡ありがとうございます。
担当部署に連絡しました。内容を確認の上、折り返しご連絡いたします。

少々お待ちください。`,
  en: `Thank you for contacting us.
We have notified the relevant department. We will contact you after reviewing the details.

Please wait a moment.`,
  ko: `연락 주셔서 감사합니다.
담당 부서에 연락했습니다. 내용 확인 후 다시 연락드리겠습니다.

잠시만 기다려 주세요.`,
  zh: `感谢您的联系。
我们已通知相关部门。确认内容后会与您联系。

请稍等。`,
  vi: `Cảm ơn bạn đã liên hệ.
Chúng tôi đã thông báo cho bộ phận liên quan. Chúng tôi sẽ liên hệ lại sau khi xem xét.

Vui lòng đợi.`,
};

// =====================================================
// キーワードマッチングによる検出
// =====================================================

/**
 * メッセージ内のキーワードマッチ数をカウント
 */
function countKeywordMatches(message: string, keywords: string[]): number {
  const lowerMessage = message.toLowerCase();
  return keywords.filter(kw => lowerMessage.includes(kw.toLowerCase())).length;
}

/**
 * バグ報告パターンを検出
 */
export function detectBugPattern(
  message: string,
  service: ServiceType | undefined
): SpecialPatternResult {
  let bestMatch: BugPattern | null = null;
  let bestScore = 0;

  for (const pattern of BUG_PATTERNS) {
    // サービスが一致するか、ALLの場合のみチェック
    if (pattern.service !== 'ALL' && pattern.service !== service) {
      continue;
    }

    const matchCount = countKeywordMatches(message, pattern.keywords);
    const score = matchCount / pattern.keywords.length;

    // 2つ以上のキーワードがマッチし、スコアが最高の場合
    if (matchCount >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (bestMatch && bestScore >= 0.4) {
    return {
      type: 'bug_report',
      patternId: bestMatch.id,
      patternName: bestMatch.description,
      confidence: Math.min(bestScore + 0.3, 1.0), // スコアにブースト
    };
  }

  return {
    type: null,
    patternId: null,
    patternName: null,
    confidence: 0,
  };
}

/**
 * 企業トラブルパターンを検出（YOLO DISCOVERのみ）
 */
export function detectEnterpriseTroublePattern(
  message: string,
  service: ServiceType | undefined
): SpecialPatternResult {
  // YOLO DISCOVERのみ対象
  if (service !== 'YOLO_DISCOVER') {
    return {
      type: null,
      patternId: null,
      patternName: null,
      confidence: 0,
    };
  }

  let bestMatch: EnterpriseTroublePattern | null = null;
  let bestScore = 0;

  for (const pattern of ENTERPRISE_TROUBLE_PATTERNS) {
    const matchCount = countKeywordMatches(message, pattern.keywords);
    const score = matchCount / pattern.keywords.length;

    // 2つ以上のキーワードがマッチし、スコアが最高の場合
    if (matchCount >= 2 && score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (bestMatch && bestScore >= 0.5) {
    return {
      type: 'enterprise_trouble',
      patternId: bestMatch.id,
      patternName: bestMatch.description,
      confidence: Math.min(bestScore + 0.2, 1.0),
    };
  }

  return {
    type: null,
    patternId: null,
    patternName: null,
    confidence: 0,
  };
}

/**
 * 特殊パターンを総合検出
 * バグ報告 > 企業トラブル の優先順位でチェック
 */
export function detectSpecialPattern(
  message: string,
  service: ServiceType | undefined
): SpecialPatternResult {
  // 1. バグ報告パターンをチェック
  const bugResult = detectBugPattern(message, service);
  if (bugResult.type === 'bug_report' && bugResult.confidence >= 0.6) {
    console.log(`🐛 バグ報告パターン検出: ${bugResult.patternName} (confidence: ${bugResult.confidence})`);
    return bugResult;
  }

  // 2. 企業トラブルパターンをチェック
  const troubleResult = detectEnterpriseTroublePattern(message, service);
  if (troubleResult.type === 'enterprise_trouble' && troubleResult.confidence >= 0.6) {
    console.log(`🏢 企業トラブルパターン検出: ${troubleResult.patternName} (confidence: ${troubleResult.confidence})`);
    return troubleResult;
  }

  // 3. 通常のFAQ処理へ
  return {
    type: null,
    patternId: null,
    patternName: null,
    confidence: 0,
  };
}
