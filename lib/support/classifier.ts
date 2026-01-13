// =====================================================
// FAQ Classifier - AIは分類のみ、回答は定型文
// =====================================================

import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// UTMパラメータ
const UTM = '?utm_source=line&utm_medium=inquiry&utm_campaign=line_inquiry';

/**
 * FAQ項目の定義
 */
export interface FAQItem {
  id: string;
  keywords: string[];  // 分類用キーワード
  responses: {
    ja: string;
    en: string;
    ko: string;
    zh: string;
    vi: string;
  };
}

/**
 * YOLO JAPAN用FAQ定型文
 */
export const YOLO_JAPAN_FAQ: FAQItem[] = [
  {
    id: 'no_contact_from_company',
    keywords: ['連絡がない', '連絡取れない', '連絡こない', '返事がない', '面接の連絡', '企業から連絡', '会社から連絡', 'no reply', 'no contact', 'no response'],
    responses: {
      ja: `まだ連絡がない時は、自分で会社に連絡をお願いしています。

会社のメールアドレスまたは電話番号は2つの方法で調べることができます：
①面接の予約をした時の確認メール
②マイページの「面接日程」

マイページからメッセージを送ることもできます：
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      en: `If you haven't received a reply, please contact the company directly.

You can find the company's email or phone number:
①In the confirmation email when you scheduled the interview
②In "Interview Schedule" on My Page

You can also send a message from My Page:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      ko: `아직 연락이 없다면, 직접 회사에 연락해 주세요.

회사 이메일 또는 전화번호 확인 방법:
①면접 예약 시 받은 확인 메일
②마이페이지의 "면접 일정"

마이페이지에서 메시지를 보낼 수도 있습니다:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      zh: `如果还没有收到回复，请直接联系公司。

您可以通过以下方式查找公司的邮箱或电话：
①预约面试时收到的确认邮件
②我的页面中的"面试日程"

您也可以从我的页面发送消息：
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      vi: `Nếu chưa nhận được phản hồi, vui lòng liên hệ trực tiếp với công ty.

Bạn có thể tìm email hoặc số điện thoại của công ty:
①Trong email xác nhận khi đặt lịch phỏng vấn
②Trong "Lịch phỏng vấn" trên Trang cá nhân

Bạn cũng có thể gửi tin nhắn từ Trang cá nhân:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
    },
  },
  {
    id: 'withdraw_account',
    keywords: ['退会', '解約', 'アカウント削除', 'やめたい', 'delete account', 'cancel', 'withdraw', '탈퇴', '删除账户'],
    responses: {
      ja: `こちらからアカウントを削除できます：
https://www.yolo-japan.com/ja/withdraw/${UTM}

※メールマガジンやSMSを完全に停止するには時間がかかる場合があります。`,
      en: `You can delete your account here:
https://www.yolo-japan.com/ja/withdraw/${UTM}

*It may take some time to completely stop newsletters and SMS.`,
      ko: `여기에서 계정을 삭제할 수 있습니다:
https://www.yolo-japan.com/ja/withdraw/${UTM}

※뉴스레터 및 SMS 수신 중지에는 시간이 걸릴 수 있습니다.`,
      zh: `您可以在此处删除账户：
https://www.yolo-japan.com/ja/withdraw/${UTM}

※完全停止邮件和短信可能需要一些时间。`,
      vi: `Bạn có thể xóa tài khoản tại đây:
https://www.yolo-japan.com/ja/withdraw/${UTM}

*Có thể mất một thời gian để ngừng hoàn toàn bản tin và SMS.`,
    },
  },
  {
    id: 'forgot_password',
    keywords: ['パスワード忘れ', 'パスワードわからない', 'ログインできない', 'forgot password', 'cant login', 'password reset', '비밀번호', '密码'],
    responses: {
      ja: `パスワードをリセットできます：
https://www.yolo-japan.com/ja/recruit/login${UTM}

「パスワードを忘れた」をクリックしてください。`,
      en: `You can reset your password here:
https://www.yolo-japan.com/ja/recruit/login${UTM}

Click "Forgot password".`,
      ko: `여기에서 비밀번호를 재설정할 수 있습니다:
https://www.yolo-japan.com/ja/recruit/login${UTM}

"비밀번호를 잊으셨나요?"를 클릭하세요.`,
      zh: `您可以在此重置密码：
https://www.yolo-japan.com/ja/recruit/login${UTM}

点击"忘记密码"。`,
      vi: `Bạn có thể đặt lại mật khẩu tại đây:
https://www.yolo-japan.com/ja/recruit/login${UTM}

Nhấp vào "Quên mật khẩu".`,
    },
  },
  {
    id: 'stop_newsletter',
    keywords: ['メルマガ停止', 'メール停止', 'メールを止め', 'unsubscribe', 'stop email', '이메일 중지', '停止邮件'],
    responses: {
      ja: `メールマガジンの設定はこちらから変更できます：
https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM}`,
      en: `You can change your newsletter settings here:
https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM}`,
      ko: `뉴스레터 설정은 여기에서 변경할 수 있습니다:
https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM}`,
      zh: `您可以在此更改邮件订阅设置：
https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM}`,
      vi: `Bạn có thể thay đổi cài đặt bản tin tại đây:
https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM}`,
    },
  },
  {
    id: 'cancel_interview',
    keywords: ['面接キャンセル', '面接をやめ', '面接辞退', 'cancel interview', '면접 취소', '取消面试'],
    responses: {
      ja: `面接前のキャンセルはこちらから：
https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM}

「お断りする」をクリックするとキャンセルできます。

日程変更の場合は、会社に直接連絡してください。`,
      en: `You can cancel the interview here:
https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM}

Click "Decline" to cancel.

To reschedule, please contact the company directly.`,
      ko: `면접 취소는 여기에서:
https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM}

"거절"을 클릭하면 취소됩니다.

일정 변경은 회사에 직접 연락해 주세요.`,
      zh: `您可以在此取消面试：
https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM}

点击"拒绝"即可取消。

如需改期，请直接联系公司。`,
      vi: `Bạn có thể hủy phỏng vấn tại đây:
https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM}

Nhấp "Từ chối" để hủy.

Để đổi lịch, vui lòng liên hệ trực tiếp với công ty.`,
    },
  },
  {
    id: 'application_no_reply',
    keywords: ['応募したのに', '応募後', '返事が来ない', 'after applying', 'no response after', '지원 후', '申请后'],
    responses: {
      ja: `面接に進む方にのみ連絡されます。応募から14日以内に連絡するよう企業にお願いしています。

もう少しお待ちいただくか、他の求人にも応募してみてください。`,
      en: `Only candidates who proceed to interviews will be contacted. We ask companies to respond within 14 days.

Please wait a little longer, or try applying to other jobs.`,
      ko: `면접에 진행되는 분에게만 연락됩니다. 기업에 14일 이내 연락하도록 요청하고 있습니다.

조금만 더 기다려 주시거나, 다른 구인에도 지원해 보세요.`,
      zh: `只有进入面试的候选人会收到联系。我们要求企业在14天内回复。

请再等待一下，或者尝试申请其他职位。`,
      vi: `Chỉ những ứng viên được chọn phỏng vấn mới nhận được liên hệ. Chúng tôi yêu cầu công ty phản hồi trong vòng 14 ngày.

Vui lòng đợi thêm hoặc thử ứng tuyển các công việc khác.`,
    },
  },
  {
    id: 'auto_cancelled',
    keywords: ['勝手にキャンセル', '自動キャンセル', '勝手に辞退', 'auto cancel', '자동 취소', '自动取消'],
    responses: {
      ja: `一定期間、企業からの連絡に返信がない場合や、面接日程の調整が完了しない場合は、システムにより自動的にキャンセルされます。

これは仕様となっております。`,
      en: `Applications are automatically cancelled if you don't respond to company messages within a certain period, or if interview scheduling isn't completed.

This is by design.`,
      ko: `일정 기간 내에 회사 메시지에 답변하지 않거나 면접 일정 조정이 완료되지 않으면 자동으로 취소됩니다.

이는 시스템 사양입니다.`,
      zh: `如果在一定期限内未回复公司消息，或面试日程未确定，申请将被自动取消。

这是系统设定。`,
      vi: `Đơn ứng tuyển sẽ tự động bị hủy nếu bạn không phản hồi tin nhắn của công ty trong thời gian nhất định, hoặc nếu lịch phỏng vấn chưa được xác nhận.

Đây là quy định của hệ thống.`,
    },
  },
  {
    id: 'change_email',
    keywords: ['メールアドレス変更', 'メアド変更', 'change email', '이메일 변경', '更改邮箱'],
    responses: {
      ja: `メールアドレス変更には本人確認が必要です。

以下の情報を yolostaff@yolo-japan.co.jp にお送りください：
・YOLO JAPAN ID
・氏名
・生年月日
・性別
・郵便番号
・電話番号
・変更前のアドレス
・変更後のアドレス`,
      en: `To change your email address, identity verification is required.

Please send the following to yolostaff@yolo-japan.co.jp:
・YOLO JAPAN ID
・Full name
・Date of birth
・Gender
・Postal code
・Phone number
・Current email
・New email`,
      ko: `이메일 주소 변경에는 본인 확인이 필요합니다.

다음 정보를 yolostaff@yolo-japan.co.jp로 보내주세요:
・YOLO JAPAN ID
・이름
・생년월일
・성별
・우편번호
・전화번호
・현재 이메일
・새 이메일`,
      zh: `更改邮箱需要身份验证。

请将以下信息发送至 yolostaff@yolo-japan.co.jp：
・YOLO JAPAN ID
・姓名
・出生日期
・性别
・邮编
・电话号码
・原邮箱
・新邮箱`,
      vi: `Để thay đổi địa chỉ email, cần xác minh danh tính.

Vui lòng gửi thông tin sau đến yolostaff@yolo-japan.co.jp:
・YOLO JAPAN ID
・Họ tên
・Ngày sinh
・Giới tính
・Mã bưu điện
・Số điện thoại
・Email hiện tại
・Email mới`,
    },
  },
  {
    id: 'error_report',
    keywords: ['エラー', 'バグ', '不具合', '動かない', 'error', 'bug', 'not working', '오류', '错误'],
    responses: {
      ja: `エラーや不具合の報告は、こちらのフォームからお願いします：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

できるだけ詳しく状況を教えていただけると、調査がスムーズに進みます。`,
      en: `Please report errors or bugs using this form:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

The more details you provide, the faster we can investigate.`,
      ko: `오류나 버그 신고는 이 양식을 사용해 주세요:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

자세한 상황을 알려주시면 조사가 빨라집니다.`,
      zh: `请使用此表单报告错误或故障：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

提供越详细的信息，我们调查得越快。`,
      vi: `Vui lòng báo cáo lỗi hoặc sự cố qua biểu mẫu này:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

Càng chi tiết, chúng tôi càng điều tra nhanh hơn.`,
    },
  },
  {
    id: 'how_to_apply',
    keywords: ['応募したい', '応募方法', '応募するには', 'how to apply', 'apply for job', '지원하고 싶', '想申请'],
    responses: {
      ja: `【登録済みの方】
マイページにログインし、気になる求人の「応募する」ボタンから応募できます。
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【まだ登録していない方】
まずYOLO JAPANに会員登録をお願いします：
https://www.yolo-japan.com/ja/recruit/regist/input${UTM}`,
      en: `【If registered】
Login to My Page and click "Apply" on the job you're interested in:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【If not registered】
Please register first:
https://www.yolo-japan.com/ja/recruit/regist/input${UTM}`,
      ko: `【등록된 경우】
마이페이지에 로그인하고 관심 있는 구인의 "지원하기" 버튼을 클릭하세요:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【아직 등록하지 않은 경우】
먼저 회원 등록을 해주세요:
https://www.yolo-japan.com/ja/recruit/regist/input${UTM}`,
      zh: `【已注册】
登录我的页面，点击感兴趣职位的"申请"按钮：
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【未注册】
请先注册：
https://www.yolo-japan.com/ja/recruit/regist/input${UTM}`,
      vi: `【Đã đăng ký】
Đăng nhập Trang cá nhân và nhấp "Ứng tuyển" cho công việc bạn quan tâm:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【Chưa đăng ký】
Vui lòng đăng ký trước:
https://www.yolo-japan.com/ja/recruit/regist/input${UTM}`,
    },
  },
  {
    id: 'search_jobs',
    keywords: ['仕事を探', '求人', '仕事ありますか', 'looking for job', 'find job', '일자리', '找工作'],
    responses: {
      ja: `求人検索はこちらから：
https://www.yolo-japan.com/ja/recruit/${UTM}

特集ページもご覧ください：
https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
      en: `Search for jobs here:
https://www.yolo-japan.com/ja/recruit/${UTM}

Also check our featured jobs:
https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
      ko: `구인 검색은 여기에서:
https://www.yolo-japan.com/ja/recruit/${UTM}

특집 페이지도 확인하세요:
https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
      zh: `在这里搜索职位：
https://www.yolo-japan.com/ja/recruit/${UTM}

也请查看特集页面：
https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
      vi: `Tìm việc làm tại đây:
https://www.yolo-japan.com/ja/recruit/${UTM}

Cũng xem trang đặc biệt:
https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
    },
  },
];

/**
 * YOLO DISCOVER用FAQ定型文
 */
export const YOLO_DISCOVER_FAQ: FAQItem[] = [
  {
    id: 'cancel_project',
    keywords: ['キャンセル', 'やめたい', '取り消し', 'cancel', '취소', '取消'],
    responses: {
      ja: `プロジェクトのキャンセルはこちらから：
https://wom.yolo-japan.com/ja/mypage/entries/${UTM}

選考前まではキャンセル可能です。

承認後の場合は、メッセージ機能でプロジェクト担当者にご連絡ください。`,
      en: `You can cancel your project here:
https://wom.yolo-japan.com/ja/mypage/entries/${UTM}

Cancellation is possible until the selection process.

If already approved, please contact the project manager via message.`,
      ko: `프로젝트 취소는 여기에서:
https://wom.yolo-japan.com/ja/mypage/entries/${UTM}

선발 전까지 취소 가능합니다.

승인 후에는 메시지 기능으로 프로젝트 담당자에게 연락해 주세요.`,
      zh: `您可以在此取消项目：
https://wom.yolo-japan.com/ja/mypage/entries/${UTM}

选拔前可以取消。

如已获批准，请通过消息功能联系项目负责人。`,
      vi: `Bạn có thể hủy dự án tại đây:
https://wom.yolo-japan.com/ja/mypage/entries/${UTM}

Có thể hủy trước khi được chọn.

Nếu đã được duyệt, vui lòng liên hệ quản lý dự án qua tin nhắn.`,
    },
  },
  {
    id: 'completion_report',
    keywords: ['完了報告', '報告方法', 'レポート', 'completion report', 'how to report', '완료 보고', '完成报告'],
    responses: {
      ja: `完了報告はこちらから提出できます：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

プロジェクトを選択して、完了報告書を提出してください。`,
      en: `You can submit your completion report here:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Select the project and submit the completion report.`,
      ko: `완료 보고서는 여기에서 제출할 수 있습니다:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

프로젝트를 선택하고 완료 보고서를 제출하세요.`,
      zh: `您可以在此提交完成报告：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

选择项目并提交完成报告。`,
      vi: `Bạn có thể nộp báo cáo hoàn thành tại đây:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Chọn dự án và nộp báo cáo hoàn thành.`,
    },
  },
  {
    id: 'contact_manager',
    keywords: ['担当者', 'マネージャー', '連絡したい', 'contact manager', 'message', '담당자', '联系负责人'],
    responses: {
      ja: `プロジェクト担当者へはメッセージ機能で連絡できます：

①マイページにアクセス：https://wom.yolo-japan.com/ja/mypage/${UTM}
②実行中のプロジェクト：https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}
③該当プロジェクトの「メッセージを送信」をクリック`,
      en: `You can contact the project manager via message:

①Access My Page: https://wom.yolo-japan.com/ja/mypage/${UTM}
②Active Projects: https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}
③Click "Send Message" on the relevant project`,
      ko: `프로젝트 담당자에게 메시지로 연락할 수 있습니다:

①마이페이지 접속: https://wom.yolo-japan.com/ja/mypage/${UTM}
②진행 중인 프로젝트: https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}
③해당 프로젝트의 "메시지 보내기" 클릭`,
      zh: `您可以通过消息功能联系项目负责人：

①访问我的页面：https://wom.yolo-japan.com/ja/mypage/${UTM}
②进行中的项目：https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}
③点击相关项目的"发送消息"`,
      vi: `Bạn có thể liên hệ quản lý dự án qua tin nhắn:

①Truy cập Trang cá nhân: https://wom.yolo-japan.com/ja/mypage/${UTM}
②Dự án đang thực hiện: https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}
③Nhấp "Gửi tin nhắn" trên dự án liên quan`,
    },
  },
];

/**
 * 分類結果
 */
export interface ClassificationResult {
  matched: boolean;
  faqId: string | null;
  confidence: number;
  response: string | null;
}

/**
 * AIでFAQを分類
 */
export async function classifyMessage(
  message: string,
  service: 'YOLO_JAPAN' | 'YOLO_DISCOVER' | 'YOLO_HOME' | undefined,
  lang: string
): Promise<ClassificationResult> {
  // サービスに応じたFAQリストを取得
  const faqList = service === 'YOLO_DISCOVER' ? YOLO_DISCOVER_FAQ : YOLO_JAPAN_FAQ;

  // FAQ IDとキーワードのリストを作成
  const faqOptions = faqList.map(faq => ({
    id: faq.id,
    keywords: faq.keywords.join(', '),
  }));

  const prompt = `あなたはカスタマーサポートの分類器です。
ユーザーのメッセージを見て、最も適切なFAQ項目を選んでください。

## ユーザーのメッセージ
「${message}」

## FAQ項目リスト
${faqOptions.map((faq, i) => `${i + 1}. ID: ${faq.id} - キーワード: ${faq.keywords}`).join('\n')}

## 回答形式
JSONのみで回答してください（説明不要）：
- 該当するFAQがある場合: {"matched": true, "faq_id": "該当するID", "confidence": 0.8}
- 該当するFAQがない場合: {"matched": false, "faq_id": null, "confidence": 0.0}

confidenceは0.0〜1.0で、0.7以上なら確信あり。`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '';

    // JSONを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { matched: false, faqId: null, confidence: 0, response: null };
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.matched && result.faq_id && result.confidence >= 0.6) {
      // 該当するFAQを探す
      const faq = faqList.find(f => f.id === result.faq_id);
      if (faq) {
        const response = faq.responses[lang as keyof typeof faq.responses] || faq.responses.ja;
        return {
          matched: true,
          faqId: result.faq_id,
          confidence: result.confidence,
          response,
        };
      }
    }

    return { matched: false, faqId: null, confidence: result.confidence || 0, response: null };
  } catch (error) {
    console.error('❌ 分類エラー:', error);
    return { matched: false, faqId: null, confidence: 0, response: null };
  }
}

/**
 * エスカレーション時の定型文
 */
export const ESCALATION_MESSAGES: Record<string, string> = {
  ja: '担当者に確認いたします。少々お待ちください。',
  en: 'Let me check with our team. Please wait a moment.',
  ko: '담당자에게 확인하겠습니다. 잠시만 기다려 주세요.',
  zh: '我将与团队确认。请稍等。',
  vi: 'Tôi sẽ kiểm tra với đội ngũ. Vui lòng đợi.',
};

/**
 * 挨拶への定型文
 */
export const GREETING_MESSAGES: Record<string, string> = {
  ja: 'こんにちは！どのようなことでお困りですか？',
  en: 'Hello! How can I help you today?',
  ko: '안녕하세요! 어떻게 도와드릴까요?',
  zh: '您好！有什么可以帮您的？',
  vi: 'Xin chào! Tôi có thể giúp gì cho bạn?',
};

/**
 * 挨拶かどうかを判定
 */
export function isGreeting(message: string): boolean {
  const greetings = [
    'こんにちは', 'こんばんは', 'おはよう', 'はじめまして', 'ヘルプ', '助けて',
    'hello', 'hi', 'hey', 'help',
    '안녕', '도움',
    '你好', '帮助',
    'xin chào', 'giúp',
  ];
  const lowerMessage = message.toLowerCase();
  return greetings.some(g => lowerMessage.includes(g));
}

/**
 * クイックリプライ用の選択肢定義
 */
export interface QuickReplyChoice {
  label: string;
  faqId: string;
}

/**
 * 曖昧なパターンとクイックリプライ選択肢
 */
export interface AmbiguousPattern {
  keywords: string[];
  question: Record<string, string>;
  choices: QuickReplyChoice[];
}

/**
 * 曖昧なパターン一覧（クイックリプライで選択させる）
 */
export const AMBIGUOUS_PATTERNS: AmbiguousPattern[] = [
  {
    keywords: ['できない', 'うまくいかない', '困って'],
    question: {
      ja: 'どのようなことでお困りですか？',
      en: 'What are you having trouble with?',
      ko: '어떤 문제가 있으신가요?',
      zh: '您遇到什么问题？',
      vi: 'Bạn đang gặp vấn đề gì?',
    },
    choices: [
      { label: 'ログインできない', faqId: 'forgot_password' },
      { label: '応募できない', faqId: 'how_to_apply' },
      { label: '企業と連絡取れない', faqId: 'no_contact_from_company' },
      { label: 'エラーが出る', faqId: 'error_report' },
    ],
  },
  {
    keywords: ['変更したい', '変えたい'],
    question: {
      ja: '何を変更されたいですか？',
      en: 'What would you like to change?',
      ko: '무엇을 변경하시겠습니까?',
      zh: '您想更改什么？',
      vi: 'Bạn muốn thay đổi gì?',
    },
    choices: [
      { label: 'メールアドレス', faqId: 'change_email' },
      { label: 'パスワード', faqId: 'forgot_password' },
      { label: '面接日程', faqId: 'cancel_interview' },
    ],
  },
  {
    keywords: ['キャンセル', 'やめたい', '取り消し'],
    question: {
      ja: '何をキャンセルされたいですか？',
      en: 'What would you like to cancel?',
      ko: '무엇을 취소하시겠습니까?',
      zh: '您想取消什么？',
      vi: 'Bạn muốn hủy gì?',
    },
    choices: [
      { label: '面接', faqId: 'cancel_interview' },
      { label: 'アカウント（退会）', faqId: 'withdraw_account' },
      { label: 'メルマガ', faqId: 'stop_newsletter' },
    ],
  },
];

/**
 * 曖昧なパターンを検出
 */
export function detectAmbiguousPattern(
  message: string,
  lang: string
): { pattern: AmbiguousPattern; question: string } | null {
  const lowerMessage = message.toLowerCase();

  for (const pattern of AMBIGUOUS_PATTERNS) {
    const matched = pattern.keywords.some(k => lowerMessage.includes(k.toLowerCase()));
    if (matched) {
      const question = pattern.question[lang] || pattern.question.ja;
      return { pattern, question };
    }
  }

  return null;
}

/**
 * FAQ IDから定型文を取得
 */
export function getFAQResponseById(
  faqId: string,
  service: 'YOLO_JAPAN' | 'YOLO_DISCOVER' | 'YOLO_HOME' | undefined,
  lang: string
): string | null {
  const faqList = service === 'YOLO_DISCOVER' ? YOLO_DISCOVER_FAQ : YOLO_JAPAN_FAQ;
  const faq = faqList.find(f => f.id === faqId);

  if (faq) {
    return faq.responses[lang as keyof typeof faq.responses] || faq.responses.ja;
  }

  return null;
}
