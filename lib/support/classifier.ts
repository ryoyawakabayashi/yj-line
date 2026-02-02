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
    id: 'confirmation_email_not_received',
    keywords: ['確認メール', '届かない', '来ない', 'メールが届', 'confirmation email', 'email not received', '확인 이메일', '确认邮件'],
    responses: {
      ja: `確認メールが届かない場合は、以下をご確認ください：

1. 迷惑メールフォルダを確認
2. 入力したメールアドレスに間違いがないか確認
3. @yolo-japan.com からのメールを受信許可

それでも届かない場合は、少し時間をおいてから再度お試しください。`,
      en: `If you haven't received the confirmation email, please check:

1. Your spam/junk folder
2. The email address you entered is correct
3. Allow emails from @yolo-japan.com

If it still doesn't arrive, please wait a moment and try again.`,
      ko: `확인 이메일이 도착하지 않으면 다음을 확인해 주세요:

1. 스팸/정크 폴더 확인
2. 입력한 이메일 주소가 올바른지 확인
3. @yolo-japan.com에서 오는 이메일 허용

그래도 도착하지 않으면 잠시 후 다시 시도해 주세요.`,
      zh: `如果没有收到确认邮件，请检查：

1. 垃圾邮件文件夹
2. 输入的邮箱地址是否正确
3. 允许接收来自 @yolo-japan.com 的邮件

如果仍未收到，请稍等片刻后重试。`,
      vi: `Nếu chưa nhận được email xác nhận, vui lòng kiểm tra:

1. Thư mục spam/rác
2. Địa chỉ email đã nhập có chính xác không
3. Cho phép nhận email từ @yolo-japan.com

Nếu vẫn không nhận được, vui lòng đợi một lát rồi thử lại.`,
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
https://www.yolo-japan.com/ja/${UTM}`,
      en: `【If registered】
Login to My Page and click "Apply" on the job you're interested in:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【If not registered】
Please register first:
https://www.yolo-japan.com/ja/${UTM}`,
      ko: `【등록된 경우】
마이페이지에 로그인하고 관심 있는 구인의 "지원하기" 버튼을 클릭하세요:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【아직 등록하지 않은 경우】
먼저 회원 등록을 해주세요:
https://www.yolo-japan.com/ja/${UTM}`,
      zh: `【已注册】
登录我的页面，点击感兴趣职位的"申请"按钮：
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【未注册】
请先注册：
https://www.yolo-japan.com/ja/${UTM}`,
      vi: `【Đã đăng ký】
Đăng nhập Trang cá nhân và nhấp "Ứng tuyển" cho công việc bạn quan tâm:
https://www.yolo-japan.com/ja/recruit/mypage/${UTM}

【Chưa đăng ký】
Vui lòng đăng ký trước:
https://www.yolo-japan.com/ja/${UTM}`,
    },
  },
  {
    id: 'search_specific_job',
    keywords: [
      // 職種（英語）
      'dishwashing', 'dishwasher', 'cleaning', 'cleaner', 'factory', 'warehouse', 'restaurant', 'hotel', 'convenience store', 'konbini', 'delivery', 'driver', 'kitchen', 'cooking', 'server', 'waiter', 'waitress', 'cashier', 'retail', 'shop', 'store', 'supermarket', 'construction', 'manufacturing', 'packing', 'sorting', 'assembly', 'food processing', 'bento', 'laundry', 'housekeeping', 'caregiver', 'nursing', 'translator', 'interpreter', 'office', 'it job', 'engineer', 'part-time', 'full-time', 'baito', 'arubaito',
      // 地域（英語）
      'job in tokyo', 'job in osaka', 'job in nagoya', 'job in kyoto', 'job in fukuoka', 'job in yokohama', 'job in sapporo', 'job in kobe', 'job in hiroshima', 'job in sendai', 'work in tokyo', 'work in osaka', 'work in japan', 'jobs near', 'jobs around',
      // 職種（日本語）
      '皿洗い', '洗い場', '清掃', 'クリーニング', '工場', '倉庫', 'レストラン', 'ホテル', 'コンビニ', '配達', 'ドライバー', 'キッチン', '調理', 'ホール', 'ウェイター', 'レジ', '販売', 'スーパー', '建設', '製造', '梱包', '仕分け', '組立', '食品加工', '弁当', 'ランドリー', 'ハウスキーピング', '介護', '通訳', '翻訳', 'オフィス', 'エンジニア', 'アルバイト', 'パート', '正社員',
      // 地域（日本語）
      '東京の仕事', '大阪の仕事', '名古屋の仕事', '京都の仕事', '福岡の仕事', '横浜の仕事', '札幌の仕事', '神戸の仕事', '広島の仕事', '仙台の仕事', '近くの仕事', '周辺の仕事',
      // 韓国語
      '도쿄 일자리', '오사카 일자리', '공장', '창고', '레스토랑', '호텔', '편의점', '배달', '청소', '주방', '아르바이트',
      // 中国語
      '东京工作', '大阪工作', '工厂', '仓库', '餐厅', '酒店', '便利店', '送货', '清洁', '厨房', '兼职',
      // ベトナム語
      'việc làm tokyo', 'việc làm osaka', 'nhà máy', 'nhà kho', 'nhà hàng', 'khách sạn', 'cửa hàng tiện lợi', 'giao hàng', 'dọn dẹp', 'bếp', 'bán thời gian',
    ],
    responses: {
      ja: `こちらのメッセージから特定の仕事を検索することはできません。

メニューの「仕事を探す」から、以下の方法で探してください：
・AIで探す → 条件を伝えて仕事を探せます
・サイトから探す → 自分で検索できます

まだ登録していない方は、まず会員登録をお願いします：
https://www.yolo-japan.com/ja/${UTM}`,
      en: `I cannot search for specific jobs from this message.

Please use "Find Jobs" in the menu:
・AI Search → Tell us your conditions and we'll find jobs for you
・Search on Site → Search by yourself

If you haven't registered yet, please sign up first:
https://www.yolo-japan.com/ja/${UTM}`,
      ko: `이 메시지에서는 특정 일자리를 검색할 수 없습니다.

메뉴의 "일자리 찾기"를 이용해 주세요:
・AI 검색 → 조건을 말씀해 주시면 일자리를 찾아드립니다
・사이트에서 검색 → 직접 검색할 수 있습니다

아직 등록하지 않으셨다면 먼저 회원가입을 해주세요:
https://www.yolo-japan.com/ja/${UTM}`,
      zh: `无法从此消息中搜索特定工作。

请使用菜单中的"找工作"：
・AI搜索 → 告诉我们您的条件，我们会为您找工作
・网站搜索 → 自己搜索

如果您还没有注册，请先注册：
https://www.yolo-japan.com/ja/${UTM}`,
      vi: `Tôi không thể tìm kiếm công việc cụ thể từ tin nhắn này.

Vui lòng sử dụng "Tìm việc" trong menu:
・Tìm bằng AI → Cho chúng tôi biết điều kiện của bạn
・Tìm trên trang web → Tự tìm kiếm

Nếu bạn chưa đăng ký, vui lòng đăng ký trước:
https://www.yolo-japan.com/ja/${UTM}`,
    },
  },
  {
    id: 'search_jobs',
    keywords: ['仕事を探', '求人', '仕事ありますか', 'looking for job', 'find job', '일자리', '找工作'],
    responses: {
      ja: `メニューの「仕事を探す」から、以下の方法で探してください：
・AIで探す → 条件を伝えて仕事を探せます
・サイトから探す → 自分で検索できます`,
      en: `Please use "Find Jobs" in the menu:
・AI Search → Tell us your conditions and we'll find jobs for you
・Search on Site → Search by yourself`,
      ko: `메뉴의 "일자리 찾기"를 이용해 주세요:
・AI 검색 → 조건을 말씀해 주시면 일자리를 찾아드립니다
・사이트에서 검색 → 직접 검색할 수 있습니다`,
      zh: `请使用菜单中的"找工作"：
・AI搜索 → 告诉我们您的条件，我们会为您找工作
・网站搜索 → 自己搜索`,
      vi: `Vui lòng sử dụng "Tìm việc" trong menu:
・Tìm bằng AI → Cho chúng tôi biết điều kiện của bạn
・Tìm trên trang web → Tự tìm kiếm`,
    },
  },
  // ===== CSV追加FAQ: General =====
  {
    id: 'what_is_yolo_japan',
    keywords: ['YOLO JAPANとは', 'ヨロジャパンとは', 'what is yolo japan', '요로재팬이란', 'YOLO JAPAN是什么', 'YOLO JAPAN là gì'],
    responses: {
      ja: `YOLO JAPANは外国人向けのアルバイト・求人サイトです。
日本で仕事を探している外国人のための求人情報を掲載しています。

詳しくはこちら：
https://www.yolo-japan.com/ja/${UTM}`,
      en: `YOLO JAPAN is a job site for foreigners in Japan.
We post job listings for foreigners looking for work in Japan.

Learn more here:
https://www.yolo-japan.com/ja/${UTM}`,
      ko: `YOLO JAPAN은 외국인을 위한 아르바이트·구인 사이트입니다.
일본에서 일자리를 찾는 외국인을 위한 구인 정보를 게재하고 있습니다.

자세한 내용은 여기:
https://www.yolo-japan.com/ja/${UTM}`,
      zh: `YOLO JAPAN是面向外国人的兼职·求职网站。
我们发布面向在日本找工作的外国人的招聘信息。

了解更多：
https://www.yolo-japan.com/ja/${UTM}`,
      vi: `YOLO JAPAN là trang web việc làm bán thời gian dành cho người nước ngoài.
Chúng tôi đăng thông tin tuyển dụng cho người nước ngoài đang tìm việc tại Nhật Bản.

Tìm hiểu thêm tại:
https://www.yolo-japan.com/ja/${UTM}`,
    },
  },
  {
    id: 'registration_free',
    keywords: ['登録無料', '料金', 'お金かかる', '無料ですか', 'is it free', 'free to register', '무료인가요', '免费吗', 'có miễn phí không'],
    responses: {
      ja: `はい、YOLO JAPANへの登録・利用は完全無料です。
求人への応募や企業とのやり取りに料金は一切かかりません。`,
      en: `Yes, registration and use of YOLO JAPAN is completely free.
There are no fees for applying to jobs or communicating with companies.`,
      ko: `네, YOLO JAPAN 등록 및 이용은 완전 무료입니다.
구인 지원이나 기업과의 연락에 요금이 들지 않습니다.`,
      zh: `是的，YOLO JAPAN的注册和使用完全免费。
申请工作或与公司沟通不收取任何费用。`,
      vi: `Có, việc đăng ký và sử dụng YOLO JAPAN hoàn toàn miễn phí.
Không mất phí khi ứng tuyển công việc hoặc liên lạc với công ty.`,
    },
  },
  {
    id: 'how_to_register',
    keywords: ['登録方法', '会員登録', 'アカウント作成', '新規登録', '登録したい', 'sign up', 'how to register', 'create account', 'register', '등록 방법', '등록하고 싶', '가입', '如何注册', '想注册', '注册', 'cách đăng ký', 'muốn đăng ký'],
    responses: {
      ja: `YOLO JAPANへの新規登録はこちらからできます：
https://www.yolo-japan.com/ja/${UTM}

登録に必要なもの：
・メールアドレス（またはGoogleアカウント）
・在留カード（外国籍の方）

登録後、求人への応募が可能になります。`,
      en: `You can register for YOLO JAPAN here:
https://www.yolo-japan.com/ja/${UTM}

What you need:
・Email address (or Google account)
・Residence card (for non-Japanese)

After registration, you can apply for jobs.`,
      ko: `YOLO JAPAN 신규 등록은 여기에서 가능합니다:
https://www.yolo-japan.com/ja/${UTM}

등록에 필요한 것:
・이메일 주소(또는 Google 계정)
・재류카드(외국 국적인 경우)

등록 후 구인에 지원할 수 있습니다.`,
      zh: `YOLO JAPAN新用户注册请点击这里：
https://www.yolo-japan.com/ja/${UTM}

注册所需：
・电子邮件地址（或Google账户）
・在留卡（外国籍人员）

注册后即可申请工作。`,
      vi: `Đăng ký YOLO JAPAN tại đây:
https://www.yolo-japan.com/ja/${UTM}

Những gì bạn cần:
・Địa chỉ email (hoặc tài khoản Google)
・Thẻ cư trú (đối với người nước ngoài)

Sau khi đăng ký, bạn có thể ứng tuyển việc làm.`,
    },
  },
  {
    id: 'visa_requirements',
    keywords: ['ビザ', '在留資格', 'visa', '비자', '签证', 'thị thực', '就労ビザ', 'work permit'],
    responses: {
      ja: `応募できる仕事はあなたの在留資格（ビザ）によって異なります。

各求人ページに応募可能な在留資格が記載されていますので、ご確認ください。

在留資格について不明な場合は、入国管理局にお問い合わせください。`,
      en: `The jobs you can apply for depend on your visa status.

Each job posting shows the eligible visa types, so please check before applying.

If you're unsure about your visa status, please contact the Immigration Bureau.`,
      ko: `지원할 수 있는 일자리는 체류 자격(비자)에 따라 다릅니다.

각 구인 페이지에 지원 가능한 체류 자격이 기재되어 있으니 확인해 주세요.

체류 자격에 대해 불명확한 경우 입국관리국에 문의해 주세요.`,
      zh: `您可以申请的工作取决于您的在留资格（签证）。

每个职位页面都会显示可申请的在留资格，请查看后申请。

如果您不确定自己的在留资格，请联系入国管理局。`,
      vi: `Công việc bạn có thể ứng tuyển phụ thuộc vào tư cách lưu trú (visa) của bạn.

Mỗi trang tuyển dụng sẽ hiển thị các loại visa đủ điều kiện, vui lòng kiểm tra trước khi ứng tuyển.

Nếu bạn không chắc về tình trạng visa của mình, vui lòng liên hệ Cục Quản lý Xuất nhập cảnh.`,
    },
  },
  // ===== CSV追加FAQ: Account/Profile =====
  {
    id: 'edit_profile',
    keywords: ['プロフィール編集', 'プロフィール変更', '情報変更', 'edit profile', 'update profile', '프로필 수정', '编辑资料', 'chỉnh sửa hồ sơ'],
    responses: {
      ja: `プロフィールの編集はマイページから行えます：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

ログイン後、「プロフィール編集」から変更してください。`,
      en: `You can edit your profile from My Page:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

After logging in, click "Edit Profile" to make changes.`,
      ko: `마이페이지에서 프로필을 수정할 수 있습니다:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

로그인 후 "프로필 수정"을 클릭하여 변경하세요.`,
      zh: `您可以从我的页面编辑个人资料：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

登录后，点击"编辑资料"进行更改。`,
      vi: `Bạn có thể chỉnh sửa hồ sơ từ Trang cá nhân:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

Sau khi đăng nhập, nhấp "Chỉnh sửa hồ sơ" để thay đổi.`,
    },
  },
  {
    id: 'change_phone',
    keywords: ['電話番号変更', '電話変更', 'change phone', 'update phone', '전화번호 변경', '更改电话', 'thay đổi số điện thoại'],
    responses: {
      ja: `電話番号の変更はマイページから行えます：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

ログイン後、プロフィール編集から電話番号を変更してください。`,
      en: `You can change your phone number from My Page:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

After logging in, edit your profile to change the phone number.`,
      ko: `마이페이지에서 전화번호를 변경할 수 있습니다:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

로그인 후 프로필 수정에서 전화번호를 변경하세요.`,
      zh: `您可以从我的页面更改电话号码：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

登录后，编辑个人资料以更改电话号码。`,
      vi: `Bạn có thể thay đổi số điện thoại từ Trang cá nhân:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

Sau khi đăng nhập, chỉnh sửa hồ sơ để thay đổi số điện thoại.`,
    },
  },
  {
    id: 'upload_resume',
    keywords: ['履歴書', 'レジュメ', '職務経歴書', 'resume', 'CV', '이력서', '简历', 'hồ sơ xin việc'],
    responses: {
      ja: `履歴書・職務経歴書はマイページからアップロードできます：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

ログイン後、「履歴書・職務経歴書」から追加・編集してください。`,
      en: `You can upload your resume/CV from My Page:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

After logging in, add or edit from "Resume/CV" section.`,
      ko: `마이페이지에서 이력서를 업로드할 수 있습니다:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

로그인 후 "이력서" 섹션에서 추가 또는 편집하세요.`,
      zh: `您可以从我的页面上传简历：
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

登录后，从"简历"部分添加或编辑。`,
      vi: `Bạn có thể tải lên CV từ Trang cá nhân:
https://www.yolo-japan.com/ja/recruit/mypage/profile/${UTM}

Sau khi đăng nhập, thêm hoặc chỉnh sửa từ phần "CV".`,
    },
  },
  {
    id: 'login_issue',
    keywords: ['ログインできない', 'サインインできない', 'cant login', 'cannot sign in', '로그인 안됨', '无法登录', 'không thể đăng nhập'],
    responses: {
      ja: `ログインできない場合は、以下をお試しください：

1. パスワードを忘れた場合は、こちらからリセット：
https://www.yolo-japan.com/ja/recruit/login${UTM}
「パスワードを忘れた」をクリックしてください。

2. メールアドレスが間違っている可能性がある場合は、登録時のメールアドレスをご確認ください。

3. それでも解決しない場合は、お問い合わせフォームからご連絡ください。`,
      en: `If you can't login, please try the following:

1. If you forgot your password, reset it here:
https://www.yolo-japan.com/ja/recruit/login${UTM}
Click "Forgot password".

2. If the email might be wrong, please check the email address you used during registration.

3. If the issue persists, please contact us through the inquiry form.`,
      ko: `로그인이 안 되는 경우 다음을 시도해 주세요:

1. 비밀번호를 잊으셨다면 여기에서 재설정:
https://www.yolo-japan.com/ja/recruit/login${UTM}
"비밀번호를 잊으셨나요?"를 클릭하세요.

2. 이메일이 틀렸을 수 있다면 등록 시 사용한 이메일을 확인해 주세요.

3. 문제가 지속되면 문의 양식으로 연락해 주세요.`,
      zh: `如果无法登录，请尝试以下方法：

1. 如果忘记密码，请在此重置：
https://www.yolo-japan.com/ja/recruit/login${UTM}
点击"忘记密码"。

2. 如果邮箱可能有误，请确认注册时使用的邮箱。

3. 如果问题仍然存在，请通过咨询表单联系我们。`,
      vi: `Nếu không thể đăng nhập, vui lòng thử các cách sau:

1. Nếu quên mật khẩu, đặt lại tại đây:
https://www.yolo-japan.com/ja/recruit/login${UTM}
Nhấp "Quên mật khẩu".

2. Nếu email có thể sai, vui lòng kiểm tra email bạn đã dùng khi đăng ký.

3. Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ qua biểu mẫu hỏi đáp.`,
    },
  },
  {
    id: 'no_verification_email',
    keywords: ['認証メール届かない', '確認メール届かない', 'verification email', 'confirmation email not received', '인증 메일', '验证邮件', 'email xác minh'],
    responses: {
      ja: `認証メールが届かない場合：

1. 迷惑メールフォルダをご確認ください
2. メールアドレスが正しいかご確認ください
3. @yolo-japan.com からのメールを受信できるよう設定してください

それでも届かない場合は、再度登録をお試しいただくか、お問い合わせください。`,
      en: `If you haven't received the verification email:

1. Please check your spam folder
2. Make sure your email address is correct
3. Enable receiving emails from @yolo-japan.com

If you still don't receive it, please try registering again or contact us.`,
      ko: `인증 메일이 오지 않는 경우:

1. 스팸 폴더를 확인해 주세요
2. 이메일 주소가 올바른지 확인해 주세요
3. @yolo-japan.com에서 오는 메일을 수신할 수 있도록 설정해 주세요

그래도 오지 않으면 다시 등록하거나 문의해 주세요.`,
      zh: `如果没有收到验证邮件：

1. 请检查垃圾邮件文件夹
2. 请确认邮箱地址是否正确
3. 请设置允许接收来自 @yolo-japan.com 的邮件

如果仍然收不到，请尝试重新注册或联系我们。`,
      vi: `Nếu không nhận được email xác minh:

1. Vui lòng kiểm tra thư mục spam
2. Đảm bảo địa chỉ email của bạn chính xác
3. Cho phép nhận email từ @yolo-japan.com

Nếu vẫn không nhận được, vui lòng thử đăng ký lại hoặc liên hệ với chúng tôi.`,
    },
  },
  // ===== CSV追加FAQ: About Jobs =====
  {
    id: 'job_requirements',
    keywords: ['応募条件', '必要な資格', 'job requirements', 'qualifications', '지원 조건', '应聘条件', 'điều kiện ứng tuyển'],
    responses: {
      ja: `応募条件は求人ごとに異なります。

各求人ページに記載されている「応募資格」「必要なスキル」をご確認ください。

一般的に確認される項目：
・在留資格（ビザ）
・日本語レベル
・勤務可能時間`,
      en: `Job requirements vary by position.

Please check the "Requirements" and "Required Skills" on each job listing.

Common requirements include:
・Visa status
・Japanese language level
・Available working hours`,
      ko: `지원 조건은 구인마다 다릅니다.

각 구인 페이지의 "지원 자격", "필요한 스킬"을 확인해 주세요.

일반적으로 확인되는 항목:
・체류 자격(비자)
・일본어 레벨
・근무 가능 시간`,
      zh: `应聘条件因职位而异。

请查看每个职位页面上的"应聘资格"和"所需技能"。

一般需要确认的项目：
・在留资格（签证）
・日语水平
・可工作时间`,
      vi: `Yêu cầu công việc khác nhau theo từng vị trí.

Vui lòng kiểm tra "Yêu cầu" và "Kỹ năng cần thiết" trên mỗi trang tuyển dụng.

Các yêu cầu phổ biến bao gồm:
・Tư cách lưu trú (visa)
・Trình độ tiếng Nhật
・Thời gian làm việc khả dụng`,
    },
  },
  {
    id: 'salary_payment',
    keywords: ['給料', '賃金', '時給', 'salary', 'wage', 'payment', '급여', '工资', 'lương', '支払い'],
    responses: {
      ja: `給与に関する情報は各求人ページに記載されています。

支払い方法・支払い日は企業によって異なりますので、面接時にご確認ください。

YOLO JAPANは求人情報の掲載サイトであり、給与の支払いは雇用企業が行います。`,
      en: `Salary information is listed on each job posting.

Payment method and pay day vary by company, so please confirm during the interview.

YOLO JAPAN is a job listing site - salary is paid by the hiring company.`,
      ko: `급여 정보는 각 구인 페이지에 기재되어 있습니다.

지불 방법과 지급일은 회사마다 다르므로 면접 시 확인해 주세요.

YOLO JAPAN은 구인 정보 사이트이며, 급여는 고용 기업이 지급합니다.`,
      zh: `工资信息列在每个职位页面上。

付款方式和发薪日因公司而异，请在面试时确认。

YOLO JAPAN是招聘信息网站，工资由雇用公司支付。`,
      vi: `Thông tin lương được liệt kê trên mỗi trang tuyển dụng.

Phương thức thanh toán và ngày trả lương khác nhau tùy công ty, vui lòng xác nhận khi phỏng vấn.

YOLO JAPAN là trang đăng tin tuyển dụng - lương được trả bởi công ty tuyển dụng.`,
    },
  },
  {
    id: 'interview_preparation',
    keywords: ['面接準備', '面接対策', 'interview tips', 'interview preparation', '면접 준비', '面试准备', 'chuẩn bị phỏng vấn'],
    responses: {
      ja: `面接準備のポイント：

1. 時間厳守（5-10分前に到着）
2. 清潔な服装
3. 必要書類の準備（在留カード、履歴書など）
4. 志望動機を準備
5. 質問があれば用意しておく

面接の詳細は予約確認メールをご確認ください。`,
      en: `Interview preparation tips:

1. Be punctual (arrive 5-10 minutes early)
2. Dress neatly
3. Prepare necessary documents (residence card, resume, etc.)
4. Prepare your motivation for applying
5. Prepare questions if you have any

Check your booking confirmation email for interview details.`,
      ko: `면접 준비 팁:

1. 시간 엄수 (5-10분 전에 도착)
2. 깔끔한 복장
3. 필요 서류 준비 (재류카드, 이력서 등)
4. 지원 동기 준비
5. 질문이 있으면 준비

면접 세부사항은 예약 확인 메일을 확인하세요.`,
      zh: `面试准备提示：

1. 准时（提前5-10分钟到达）
2. 穿着整洁
3. 准备必要文件（在留卡、简历等）
4. 准备应聘动机
5. 如有问题请准备好

请查看预约确认邮件了解面试详情。`,
      vi: `Mẹo chuẩn bị phỏng vấn:

1. Đúng giờ (đến sớm 5-10 phút)
2. Ăn mặc gọn gàng
3. Chuẩn bị giấy tờ cần thiết (thẻ lưu trú, CV, v.v.)
4. Chuẩn bị động cơ ứng tuyển
5. Chuẩn bị câu hỏi nếu có

Kiểm tra email xác nhận đặt lịch để biết chi tiết phỏng vấn.`,
    },
  },
  {
    id: 'working_hours',
    keywords: ['勤務時間', '働く時間', 'シフト', 'working hours', 'shift', '근무 시간', '工作时间', 'giờ làm việc'],
    responses: {
      ja: `勤務時間やシフトは求人ごとに異なります。

各求人ページの「勤務時間」欄をご確認ください。

※留学生の方は週28時間以内の制限があります（長期休暇中は除く）。在留資格の条件をご確認ください。`,
      en: `Working hours and shifts vary by job.

Please check the "Working Hours" section on each job listing.

*Students are limited to 28 hours per week (except during long vacations). Please check your visa conditions.`,
      ko: `근무 시간과 시프트는 구인마다 다릅니다.

각 구인 페이지의 "근무 시간" 란을 확인해 주세요.

※유학생은 주 28시간 이내 제한이 있습니다(장기 휴가 제외). 체류 자격 조건을 확인해 주세요.`,
      zh: `工作时间和班次因工作而异。

请查看每个职位页面的"工作时间"部分。

※留学生每周工作不得超过28小时（长假除外）。请确认您的签证条件。`,
      vi: `Giờ làm việc và ca làm khác nhau tùy công việc.

Vui lòng kiểm tra phần "Giờ làm việc" trên mỗi trang tuyển dụng.

*Sinh viên bị giới hạn 28 giờ/tuần (trừ kỳ nghỉ dài). Vui lòng kiểm tra điều kiện visa của bạn.`,
    },
  },
  {
    id: 'job_not_available',
    keywords: ['求人がない', '仕事が見つからない', 'no jobs available', 'job not found', '일자리가 없어요', '没有工作', 'không có việc làm'],
    responses: {
      ja: `お探しの条件に合う求人が見つからない場合：

1. 検索条件を広げてみてください（エリア、職種など）
2. 定期的に新しい求人が追加されるので、後日再度ご確認ください
3. メルマガに登録すると新着求人のお知らせを受け取れます

求人検索はこちら：
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      en: `If you can't find jobs matching your criteria:

1. Try broadening your search (area, job type, etc.)
2. New jobs are added regularly, so please check again later
3. Subscribe to our newsletter to get notified about new jobs

Search jobs here:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      ko: `조건에 맞는 일자리를 찾을 수 없는 경우:

1. 검색 조건을 넓혀보세요 (지역, 직종 등)
2. 정기적으로 새 구인이 추가되니 나중에 다시 확인해 주세요
3. 뉴스레터에 등록하면 새 구인 알림을 받을 수 있습니다

일자리 검색:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      zh: `如果找不到符合条件的工作：

1. 尝试扩大搜索范围（地区、职种等）
2. 定期会有新工作添加，请稍后再查看
3. 订阅邮件可以收到新工作通知

搜索工作：
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      vi: `Nếu không tìm thấy việc làm phù hợp:

1. Thử mở rộng tìm kiếm (khu vực, loại công việc, v.v.)
2. Công việc mới được thêm thường xuyên, vui lòng kiểm tra lại sau
3. Đăng ký nhận bản tin để nhận thông báo việc làm mới

Tìm việc tại đây:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
    },
  },
  {
    id: 'transportation_expenses',
    keywords: ['交通費', '通勤手当', 'transportation', 'commute allowance', '교통비', '交通费', 'phí đi lại'],
    responses: {
      ja: `交通費支給の有無は求人ごとに異なります。

各求人ページの「待遇・福利厚生」欄をご確認ください。
詳細は面接時に企業にご確認いただくことをお勧めします。`,
      en: `Transportation allowance varies by job.

Please check the "Benefits" section on each job listing.
We recommend confirming details with the company during the interview.`,
      ko: `교통비 지급 여부는 구인마다 다릅니다.

각 구인 페이지의 "대우/복리후생" 란을 확인해 주세요.
면접 시 회사에 자세한 내용을 확인하시는 것을 권장합니다.`,
      zh: `交通费因工作而异。

请查看每个职位页面的"待遇/福利"部分。
建议在面试时向公司确认详情。`,
      vi: `Phụ cấp đi lại khác nhau tùy công việc.

Vui lòng kiểm tra phần "Phúc lợi" trên mỗi trang tuyển dụng.
Chúng tôi khuyên bạn nên xác nhận chi tiết với công ty khi phỏng vấn.`,
    },
  },
  // ===== CSV追加FAQ: YOLO HOME =====
  {
    id: 'what_is_yolo_home',
    keywords: ['YOLO HOMEとは', 'ヨロホームとは', 'what is yolo home', 'YOLO HOME是什么', 'YOLO HOME là gì', '요로홈이란'],
    responses: {
      ja: `YOLO HOMEは外国人向けの賃貸物件を紹介するサービスです。

初期費用が安い物件や、外国人でも入居しやすい物件を掲載しています。

詳しくはこちら：
https://yolohome.jp/${UTM}`,
      en: `YOLO HOME is a service that introduces rental properties for foreigners.

We list properties with low initial costs and properties that are foreigner-friendly.

Learn more here:
https://yolohome.jp/${UTM}`,
      ko: `YOLO HOME은 외국인을 위한 임대 물건을 소개하는 서비스입니다.

초기 비용이 저렴한 물건과 외국인도 입주하기 쉬운 물건을 게재하고 있습니다.

자세한 내용은 여기:
https://yolohome.jp/${UTM}`,
      zh: `YOLO HOME是为外国人介绍租赁房产的服务。

我们刊登初期费用低、外国人也容易入住的房产。

了解更多：
https://yolohome.jp/${UTM}`,
      vi: `YOLO HOME là dịch vụ giới thiệu bất động sản cho thuê dành cho người nước ngoài.

Chúng tôi đăng các bất động sản với chi phí ban đầu thấp và thân thiện với người nước ngoài.

Tìm hiểu thêm tại:
https://yolohome.jp/${UTM}`,
    },
  },
  {
    id: 'search_property',
    keywords: ['物件を探す', '部屋探し', 'search property', 'find apartment', '물건 찾기', '找房子', 'tìm nhà'],
    responses: {
      ja: `YOLO HOMEで物件を探す：
https://yolohome.jp/${UTM}

エリア、家賃、部屋タイプなどで検索できます。
気になる物件があれば、お問い合わせください。`,
      en: `Search properties on YOLO HOME:
https://yolohome.jp/${UTM}

You can search by area, rent, room type, etc.
If you find a property you like, please contact us.`,
      ko: `YOLO HOME에서 물건 검색:
https://yolohome.jp/${UTM}

지역, 임대료, 방 타입 등으로 검색할 수 있습니다.
관심 있는 물건이 있으면 문의해 주세요.`,
      zh: `在YOLO HOME搜索房产：
https://yolohome.jp/${UTM}

您可以按地区、租金、房型等搜索。
如果找到喜欢的房产，请联系我们。`,
      vi: `Tìm kiếm bất động sản trên YOLO HOME:
https://yolohome.jp/${UTM}

Bạn có thể tìm theo khu vực, giá thuê, loại phòng, v.v.
Nếu bạn tìm thấy bất động sản ưng ý, vui lòng liên hệ với chúng tôi.`,
    },
  },
  {
    id: 'rental_requirements',
    keywords: ['入居条件', '賃貸条件', 'rental requirements', 'lease conditions', '입주 조건', '入住条件', 'điều kiện thuê nhà'],
    responses: {
      ja: `外国人の方の入居に必要なもの（一般的な例）：

・在留カード
・収入証明（給与明細など）
・緊急連絡先
・保証人または保証会社の利用

詳細は物件ごとに異なりますので、YOLO HOMEにお問い合わせください：
https://yolohome.jp/${UTM}`,
      en: `What foreigners generally need to rent (common requirements):

・Residence card
・Proof of income (pay slips, etc.)
・Emergency contact
・Guarantor or use of guarantee company

Details vary by property, so please contact YOLO HOME:
https://yolohome.jp/${UTM}`,
      ko: `외국인 입주에 필요한 것 (일반적인 예):

・재류카드
・수입 증명 (급여명세서 등)
・긴급 연락처
・보증인 또는 보증회사 이용

자세한 내용은 물건마다 다르므로 YOLO HOME에 문의하세요:
https://yolohome.jp/${UTM}`,
      zh: `外国人入住一般需要的东西：

・在留卡
・收入证明（工资单等）
・紧急联系人
・担保人或使用担保公司

详情因房产而异，请联系YOLO HOME：
https://yolohome.jp/${UTM}`,
      vi: `Những gì người nước ngoài thường cần để thuê nhà:

・Thẻ lưu trú
・Chứng minh thu nhập (phiếu lương, v.v.)
・Liên hệ khẩn cấp
・Người bảo lãnh hoặc sử dụng công ty bảo lãnh

Chi tiết khác nhau tùy bất động sản, vui lòng liên hệ YOLO HOME:
https://yolohome.jp/${UTM}`,
    },
  },
  // ===== 実問い合わせCSV追加: YOLO JAPAN =====
  {
    id: 'passport_registration_error',
    keywords: ['パスポート登録', 'パスポートエラー', '在留カードが必要', 'passport registration', 'passport error', '여권 등록', '护照注册'],
    responses: {
      ja: `パスポート登録でエラーが出る場合：

外国籍の方は在留カードの登録が必要です。
パスポートだけでは登録できません。

在留カードをお持ちでない場合は、登録・応募ができません。`,
      en: `If you get an error during passport registration:

Foreign nationals need to register their residence card.
Registration with passport only is not possible.

If you don't have a residence card, you cannot register or apply.`,
      ko: `여권 등록 시 오류가 발생하는 경우:

외국인은 재류카드 등록이 필요합니다.
여권만으로는 등록할 수 없습니다.

재류카드가 없으면 등록 및 지원이 불가능합니다.`,
      zh: `护照注册出现错误时：

外国人需要注册在留卡。
仅凭护照无法注册。

如果没有在留卡，则无法注册或申请。`,
      vi: `Nếu gặp lỗi khi đăng ký hộ chiếu:

Người nước ngoài cần đăng ký thẻ lưu trú.
Không thể đăng ký chỉ với hộ chiếu.

Nếu không có thẻ lưu trú, bạn không thể đăng ký hoặc ứng tuyển.`,
    },
  },
  {
    id: 'invalid_account',
    keywords: ['無効なアカウント', 'アカウントが無効', 'invalid account', 'account invalid', '무효 계정', '无效账户'],
    responses: {
      ja: `「無効なアカウント」と表示される場合：

Googleで作成したアカウントは、Googleでログインしてください。
メールアドレスとパスワードでのログインはできません。

ログインページで「Googleでログイン」を選択してください：
https://www.yolo-japan.com/ja/recruit/login${UTM}`,
      en: `If you see "Invalid account":

Accounts created with Google must log in with Google.
You cannot log in with email and password.

Select "Login with Google" on the login page:
https://www.yolo-japan.com/ja/recruit/login${UTM}`,
      ko: `"무효한 계정"이 표시되는 경우:

Google로 만든 계정은 Google로 로그인해야 합니다.
이메일과 비밀번호로는 로그인할 수 없습니다.

로그인 페이지에서 "Google로 로그인"을 선택하세요:
https://www.yolo-japan.com/ja/recruit/login${UTM}`,
      zh: `如果显示"无效账户"：

用Google创建的账户必须用Google登录。
无法用邮箱和密码登录。

在登录页面选择"用Google登录"：
https://www.yolo-japan.com/ja/recruit/login${UTM}`,
      vi: `Nếu thấy "Tài khoản không hợp lệ":

Tài khoản tạo bằng Google phải đăng nhập bằng Google.
Không thể đăng nhập bằng email và mật khẩu.

Chọn "Đăng nhập bằng Google" trên trang đăng nhập:
https://www.yolo-japan.com/ja/recruit/login${UTM}`,
    },
  },
  {
    id: 'video_upload_error',
    keywords: ['動画アップロード', '動画をアップ', 'ビデオアップロード', 'video upload', 'upload video', '동영상 업로드', '视频上传'],
    responses: {
      ja: `動画がアップロードできない場合：

1. 動画ファイルを確認してください（MP4推奨）
2. ブラウザのキャッシュを削除してください
3. Wi-Fi環境で再度お試しください

それでも解決しない場合は、障害報告フォームからご連絡ください：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
      en: `If you cannot upload video:

1. Check your video file (MP4 recommended)
2. Clear your browser cache
3. Try again with Wi-Fi

If the issue persists, please report it:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
      ko: `동영상 업로드가 안 되는 경우:

1. 동영상 파일을 확인하세요 (MP4 권장)
2. 브라우저 캐시를 삭제하세요
3. Wi-Fi 환경에서 다시 시도하세요

그래도 해결되지 않으면 장애 신고 양식으로 연락해 주세요:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
      zh: `如果无法上传视频：

1. 检查视频文件（推荐MP4）
2. 清除浏览器缓存
3. 在Wi-Fi环境下重试

如果问题仍然存在，请通过故障报告表单联系我们：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
      vi: `Nếu không thể tải video lên:

1. Kiểm tra file video (khuyến nghị MP4)
2. Xóa bộ nhớ cache trình duyệt
3. Thử lại trong môi trường Wi-Fi

Nếu vấn đề vẫn tiếp diễn, vui lòng báo cáo:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
    },
  },
  {
    id: 'interview_link_not_received',
    keywords: ['面接リンク', '面接URLが届かない', 'interview link', 'interview URL', '면접 링크', '面试链接'],
    responses: {
      ja: `面接リンクが届かない場合は、企業へ直接連絡をお願いします。

会社の連絡先は以下で確認できます：
・面接予約時の確認メール
・マイページの「面接日程」

マイページ：
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      en: `If you haven't received the interview link, please contact the company directly.

You can find the company's contact:
・In the confirmation email when you scheduled the interview
・In "Interview Schedule" on My Page

My Page:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      ko: `면접 링크를 받지 못한 경우 기업에 직접 연락해 주세요.

회사 연락처 확인 방법:
・면접 예약 시 받은 확인 메일
・마이페이지의 "면접 일정"

마이페이지:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      zh: `如果没有收到面试链接，请直接联系公司。

您可以在以下位置找到公司联系方式：
・预约面试时收到的确认邮件
・我的页面中的"面试日程"

我的页面：
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
      vi: `Nếu chưa nhận được link phỏng vấn, vui lòng liên hệ trực tiếp với công ty.

Bạn có thể tìm thông tin liên hệ của công ty:
・Trong email xác nhận khi đặt lịch phỏng vấn
・Trong "Lịch phỏng vấn" trên Trang cá nhân

Trang cá nhân:
https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM}`,
    },
  },
  {
    id: 'site_error',
    keywords: ['サイトエラー', 'サイト障害', 'サイトが動かない', 'site error', 'website error', '사이트 오류', '网站错误'],
    responses: {
      ja: `サイトに障害・エラーがある場合は、障害報告フォームからご連絡ください：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

できるだけ詳しく状況を教えていただけると、調査がスムーズに進みます。
・エラーが起きた画面のスクリーンショット
・エラーメッセージの内容
・使用しているデバイス・ブラウザ`,
      en: `If you experience site errors, please report using this form:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

The more details you provide, the faster we can investigate:
・Screenshot of the error screen
・Error message content
・Device and browser you're using`,
      ko: `사이트 오류가 발생한 경우 이 양식으로 신고해 주세요:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

자세한 정보를 제공해 주시면 조사가 빨라집니다:
・오류 화면 스크린샷
・오류 메시지 내용
・사용 중인 기기 및 브라우저`,
      zh: `如果遇到网站错误，请使用此表单报告：
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

提供越详细的信息，我们调查得越快：
・错误界面截图
・错误消息内容
・使用的设备和浏览器`,
      vi: `Nếu gặp lỗi trang web, vui lòng báo cáo qua biểu mẫu này:
https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform

Càng chi tiết, chúng tôi càng điều tra nhanh hơn:
・Ảnh chụp màn hình lỗi
・Nội dung thông báo lỗi
・Thiết bị và trình duyệt đang sử dụng`,
    },
  },
  {
    id: 'residence_card_rejected',
    keywords: ['在留カード不採用', '在留カードが承認されない', 'residence card rejected', 'card not approved', '재류카드 미승인', '在留卡未通过'],
    responses: {
      ja: `在留カードが承認されない場合：

登録情報と在留カードの情報が一致していない可能性があります。
以下を確認してください：
・氏名（ローマ字）
・生年月日
・在留カード番号

情報を修正して再申請してください。`,
      en: `If your residence card is not approved:

The registered information may not match the residence card.
Please check:
・Name (in Roman letters)
・Date of birth
・Residence card number

Correct the information and reapply.`,
      ko: `재류카드가 승인되지 않는 경우:

등록 정보와 재류카드 정보가 일치하지 않을 수 있습니다.
다음을 확인하세요:
・이름 (로마자)
・생년월일
・재류카드 번호

정보를 수정하고 다시 신청하세요.`,
      zh: `如果在留卡未获批准：

注册信息可能与在留卡不符。
请检查：
・姓名（罗马字母）
・出生日期
・在留卡号码

更正信息后重新申请。`,
      vi: `Nếu thẻ lưu trú không được phê duyệt:

Thông tin đăng ký có thể không khớp với thẻ lưu trú.
Vui lòng kiểm tra:
・Tên (chữ La Mã)
・Ngày sinh
・Số thẻ lưu trú

Sửa thông tin và nộp lại.`,
    },
  },
  {
    id: 'why_rejected',
    keywords: ['なぜ不採用', '不採用の理由', 'why rejected', 'rejection reason', '왜 불합격', '为什么落选'],
    responses: {
      ja: `不採用の理由は開示されておりません。

企業が候補者を選考する際の詳細な理由は、YOLO JAPANでは把握しておりません。

他の求人にも積極的に応募してみてください：
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      en: `Rejection reasons are not disclosed.

YOLO JAPAN does not have access to the detailed reasons companies use to select candidates.

Please try applying to other jobs:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      ko: `불합격 이유는 공개되지 않습니다.

YOLO JAPAN은 기업이 후보자를 선발하는 상세한 이유를 파악하지 못합니다.

다른 구인에도 적극적으로 지원해 보세요:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      zh: `不公开落选原因。

YOLO JAPAN无法获知企业选拔候选人的详细原因。

请尝试申请其他职位：
https://www.yolo-japan.com/ja/recruit/${UTM}`,
      vi: `Lý do từ chối không được công khai.

YOLO JAPAN không có thông tin về lý do chi tiết mà công ty sử dụng để chọn ứng viên.

Vui lòng thử ứng tuyển các công việc khác:
https://www.yolo-japan.com/ja/recruit/${UTM}`,
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
  // ===== 実問い合わせCSV追加 =====
  {
    id: 'change_schedule',
    keywords: ['日程変更', '日程を変更', 'スケジュール変更', 'reschedule', 'change date', '일정 변경', '更改日期', 'thay đổi lịch'],
    responses: {
      ja: `日程変更はメッセージ機能からお願いします：

実行中のプロジェクト：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

該当プロジェクトの「メッセージを送信」から企業へ連絡してください。`,
      en: `Please request schedule changes via the message function:

Active Projects:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Click "Send Message" on the relevant project to contact the company.`,
      ko: `일정 변경은 메시지 기능을 통해 요청해 주세요:

진행 중인 프로젝트:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

해당 프로젝트의 "메시지 보내기"를 클릭하여 기업에 연락하세요.`,
      zh: `请通过消息功能申请日程变更：

进行中的项目：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

点击相关项目的"发送消息"联系企业。`,
      vi: `Vui lòng yêu cầu thay đổi lịch qua chức năng tin nhắn:

Dự án đang thực hiện:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Nhấp "Gửi tin nhắn" trên dự án liên quan để liên hệ công ty.`,
    },
  },
  {
    id: 'japanese_participation',
    keywords: ['日本人', '旅行者', '会員カード', 'japanese', 'traveler', 'member card', '일본인', '日本人参加', 'người Nhật'],
    responses: {
      ja: `YOLO DISCOVERには日本人の方も参加可能です。

参加には運転免許証の登録が必要です。
登録・応募・チェックイン・完了報告をすれば参加できます。

詳しくはこちら：
https://wom.yolo-japan.com/${UTM}`,
      en: `Japanese citizens can also participate in YOLO DISCOVER.

Driver's license registration is required to participate.
You can participate by registering, applying, checking in, and submitting completion reports.

Learn more:
https://wom.yolo-japan.com/${UTM}`,
      ko: `일본인도 YOLO DISCOVER에 참가할 수 있습니다.

참가하려면 운전면허증 등록이 필요합니다.
등록, 지원, 체크인, 완료 보고를 하면 참가할 수 있습니다.

자세한 내용:
https://wom.yolo-japan.com/${UTM}`,
      zh: `日本人也可以参加YOLO DISCOVER。

参加需要注册驾驶执照。
完成注册、申请、签到、完成报告即可参加。

了解更多：
https://wom.yolo-japan.com/${UTM}`,
      vi: `Người Nhật cũng có thể tham gia YOLO DISCOVER.

Cần đăng ký giấy phép lái xe để tham gia.
Bạn có thể tham gia bằng cách đăng ký, ứng tuyển, check-in và nộp báo cáo hoàn thành.

Tìm hiểu thêm:
https://wom.yolo-japan.com/${UTM}`,
    },
  },
  {
    id: 'checkin_issue',
    keywords: ['チェックインできない', 'チェックイン', 'check-in', 'check in', '체크인', '签到', 'không thể check-in'],
    responses: {
      ja: `チェックインできない場合は、メッセージ機能で企業にチェックイン処理をお願いしてください：

実行中のプロジェクト：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

該当プロジェクトの「メッセージを送信」から連絡してください。`,
      en: `If you cannot check in, please ask the company to process your check-in via message:

Active Projects:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Click "Send Message" on the relevant project to contact them.`,
      ko: `체크인이 안 되는 경우, 메시지 기능으로 기업에 체크인 처리를 요청해 주세요:

진행 중인 프로젝트:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

해당 프로젝트의 "메시지 보내기"를 클릭하세요.`,
      zh: `如果无法签到，请通过消息功能要求企业处理签到：

进行中的项目：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

点击相关项目的"发送消息"联系他们。`,
      vi: `Nếu không thể check-in, vui lòng yêu cầu công ty xử lý check-in qua tin nhắn:

Dự án đang thực hiện:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}

Nhấp "Gửi tin nhắn" trên dự án liên quan để liên hệ.`,
    },
  },
  {
    id: 'project_cancelled_message',
    keywords: ['キャンセルされた', 'メッセージが見れない', 'プロジェクト消えた', 'cancelled project', 'cannot see message', '취소된 프로젝트', '项目被取消'],
    responses: {
      ja: `キャンセルされたプロジェクトのメッセージを確認したい場合は、緊急連絡先へお問い合わせください：

実行中のプロジェクト → 緊急連絡先
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      en: `If you want to check messages from a cancelled project, please contact the emergency contact:

Active Projects → Emergency Contact
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      ko: `취소된 프로젝트의 메시지를 확인하려면 긴급 연락처로 문의해 주세요:

진행 중인 프로젝트 → 긴급 연락처
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      zh: `如果想查看已取消项目的消息，请联系紧急联系人：

进行中的项目 → 紧急联系人
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      vi: `Nếu muốn xem tin nhắn từ dự án đã hủy, vui lòng liên hệ số khẩn cấp:

Dự án đang thực hiện → Liên hệ khẩn cấp
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
    },
  },
  {
    id: 'work_permit_required',
    keywords: ['就労資格', '資格外許可', 'なぜ資格が必要', 'work permit', 'why qualification', '취업 자격', '为什么需要资格'],
    responses: {
      ja: `YOLO DISCOVERは報酬を伴う活動に該当するため、就労資格が必要です。

留学生の方は「資格外活動許可」があれば参加可能です。
旅行者の方は単発のお仕事に参加できます（資格外活動許可は不要）。`,
      en: `YOLO DISCOVER requires work qualification as it involves compensated activities.

Students can participate with "Permission to Engage in Activity Other Than That Permitted".
Travelers can participate in one-time jobs (no work permit required).`,
      ko: `YOLO DISCOVER는 보수가 수반되는 활동이므로 취업 자격이 필요합니다.

유학생은 "자격외 활동 허가"가 있으면 참가 가능합니다.
여행자는 단발성 일자리에 참가할 수 있습니다(자격외 활동 허가 불필요).`,
      zh: `YOLO DISCOVER涉及有偿活动，因此需要工作资格。

留学生持有"资格外活动许可"即可参加。
旅行者可以参加一次性工作（不需要资格外活动许可）。`,
      vi: `YOLO DISCOVER yêu cầu tư cách làm việc vì liên quan đến hoạt động có thù lao.

Du học sinh có thể tham gia nếu có "Giấy phép hoạt động ngoài tư cách".
Du khách có thể tham gia công việc một lần (không cần giấy phép).`,
    },
  },
  {
    id: 'completion_not_approved',
    keywords: ['完了報告が承認されない', '報告が承認されない', 'report not approved', '보고서 미승인', '报告未批准'],
    responses: {
      ja: `完了報告の承認は企業が7日以内に行います。

7日経っても承認されない場合は、メッセージ機能で企業にお問い合わせください：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      en: `Completion reports are approved by the company within 7 days.

If not approved after 7 days, please contact the company via message:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      ko: `완료 보고서는 기업이 7일 이내에 승인합니다.

7일이 지나도 승인되지 않으면 메시지 기능으로 기업에 문의하세요:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      zh: `完成报告由企业在7天内批准。

如果7天后仍未批准，请通过消息功能联系企业：
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
      vi: `Báo cáo hoàn thành được công ty phê duyệt trong vòng 7 ngày.

Nếu sau 7 ngày vẫn chưa được phê duyệt, vui lòng liên hệ công ty qua tin nhắn:
https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}`,
    },
  },
];

/**
 * 分類結果
 */
export interface FAQCandidate {
  faqId: string;
  confidence: number;
  response: string;
}

export interface ClassificationResult {
  matched: boolean;
  faqId: string | null;
  confidence: number;
  response: string | null;
  candidates?: FAQCandidate[]; // 複数候補（中間信頼度時に使用）
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
  // TODO: YOLO_HOME_FAQ を追加したらここに分岐を追加
  const faqList = service === 'YOLO_DISCOVER'
    ? YOLO_DISCOVER_FAQ
    : YOLO_JAPAN_FAQ; // YOLO_JAPAN と YOLO_HOME は同じFAQを使用（暫定）

  // FAQ IDとキーワードのリストを作成
  const faqOptions = faqList.map(faq => ({
    id: faq.id,
    keywords: faq.keywords.join(', '),
  }));

  const prompt = `あなたはカスタマーサポートの分類器です。
ユーザーのメッセージを見て、適切なFAQ項目を最大3件まで選んでください。

## ユーザーのメッセージ
「${message}」

## FAQ項目リスト
${faqOptions.map((faq, i) => `${i + 1}. ID: ${faq.id} - キーワード: ${faq.keywords}`).join('\n')}

## 回答形式
JSONのみで回答してください（説明不要）：
{
  "candidates": [
    {"faq_id": "該当ID1", "confidence": 0.9},
    {"faq_id": "該当ID2", "confidence": 0.6}
  ]
}

- candidates: 関連度順に最大3件（confidenceが0.4以上のもののみ）
- 該当なしの場合: {"candidates": []}
- confidenceは0.0〜1.0で、0.7以上なら確信あり、0.4〜0.7は可能性あり`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '';

    // JSONを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { matched: false, faqId: null, confidence: 0, response: null };
    }

    const result = JSON.parse(jsonMatch[0]);
    const rawCandidates = result.candidates || [];

    if (rawCandidates.length === 0) {
      return { matched: false, faqId: null, confidence: 0, response: null };
    }

    // 候補をFAQと紐付け
    const candidates: FAQCandidate[] = [];
    for (const c of rawCandidates) {
      const faq = faqList.find(f => f.id === c.faq_id);
      if (faq) {
        const rawResponse = faq.responses[lang as keyof typeof faq.responses] || faq.responses.ja;
        // URLの言語コードをユーザーの言語に置換
        const response = replaceUrlLangCode(rawResponse, lang);
        candidates.push({
          faqId: c.faq_id,
          confidence: c.confidence || 0,
          response,
        });
      }
    }

    if (candidates.length === 0) {
      return { matched: false, faqId: null, confidence: 0, response: null };
    }

    // 最も信頼度の高い候補
    const topCandidate = candidates[0];

    return {
      matched: topCandidate.confidence >= 0.7,
      faqId: topCandidate.faqId,
      confidence: topCandidate.confidence,
      response: topCandidate.response,
      candidates: candidates.length > 1 ? candidates : undefined, // 複数候補がある場合のみ
    };
  } catch (error) {
    console.error('❌ 分類エラー:', error);
    return { matched: false, faqId: null, confidence: 0, response: null };
  }
}

/**
 * エスカレーション時の定型文
 */
export const ESCALATION_MESSAGES: Record<string, string> = {
  ja: 'サポートスタッフが確認の上、ご連絡いたします。',
  en: 'Our support staff will review and get back to you.',
  ko: '지원 담당자가 확인 후 연락드리겠습니다.',
  zh: '客服人员确认后会与您联系。',
  vi: 'Nhân viên hỗ trợ sẽ xem xét và liên hệ lại với bạn.',
};

/**
 * エスカレーション確認メッセージ（スタッフに繋ぐ前の確認）
 */
export const ESCALATION_CONFIRM_MESSAGES: Record<string, string> = {
  ja: 'サポートスタッフにお繋ぎしますか？',
  en: 'Would you like to connect with a support staff member?',
  ko: '지원 담당자와 연결하시겠습니까?',
  zh: '您需要与客服人员联系吗？',
  vi: 'Bạn có muốn kết nối với nhân viên hỗ trợ không?',
};

/**
 * エスカレーション確認の「はい」ラベル
 */
export const ESCALATION_CONFIRM_YES: Record<string, string> = {
  ja: 'はい、お願いします',
  en: 'Yes, please',
  ko: '네, 부탁합니다',
  zh: '是的，请联系',
  vi: 'Vâng, xin vui lòng',
};

/**
 * エスカレーション確認の「いいえ」ラベル
 */
export const ESCALATION_CONFIRM_NO: Record<string, string> = {
  ja: 'いいえ、大丈夫です',
  en: 'No, it\'s okay',
  ko: '아니요, 괜찮습니다',
  zh: '不用了，谢谢',
  vi: 'Không, không cần đâu',
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
 * FAQ確認用の文言（中間confidence時に使用）
 */
export const FAQ_CONFIRM_MESSAGES: Record<string, string> = {
  ja: '「{topic}」についてのお問い合わせですか？',
  en: 'Is your question about "{topic}"?',
  ko: '"{topic}"에 관한 문의이신가요?',
  zh: '您的问题是关于"{topic}"吗？',
  vi: 'Câu hỏi của bạn có phải về "{topic}" không?',
};

/**
 * FAQ確認の「はい」ラベル
 */
export const FAQ_CONFIRM_YES: Record<string, string> = {
  ja: 'はい',
  en: 'Yes',
  ko: '네',
  zh: '是的',
  vi: 'Có',
};

/**
 * FAQ確認の「いいえ」ラベル
 */
export const FAQ_CONFIRM_NO: Record<string, string> = {
  ja: 'いいえ、違います',
  en: 'No, something else',
  ko: '아니요, 다른 문의입니다',
  zh: '不是，是其他问题',
  vi: 'Không, về vấn đề khác',
};

/**
 * FAQ IDからトピック名を取得（確認メッセージ用）
 */
export const FAQ_TOPIC_NAMES: Record<string, Record<string, string>> = {
  no_contact_from_company: {
    ja: '企業からの連絡がない',
    en: 'no response from company',
    ko: '회사로부터 연락이 없음',
    zh: '没有收到公司回复',
    vi: 'không nhận được phản hồi từ công ty',
  },
  withdraw_account: {
    ja: 'アカウント退会',
    en: 'account deletion',
    ko: '계정 탈퇴',
    zh: '删除账户',
    vi: 'xóa tài khoản',
  },
  forgot_password: {
    ja: 'パスワードを忘れた',
    en: 'forgot password',
    ko: '비밀번호 찾기',
    zh: '忘记密码',
    vi: 'quên mật khẩu',
  },
  stop_newsletter: {
    ja: 'メルマガ停止',
    en: 'unsubscribe newsletter',
    ko: '뉴스레터 해지',
    zh: '取消订阅',
    vi: 'hủy đăng ký bản tin',
  },
  cancel_interview: {
    ja: '面接キャンセル',
    en: 'cancel interview',
    ko: '면접 취소',
    zh: '取消面试',
    vi: 'hủy phỏng vấn',
  },
  application_no_reply: {
    ja: '応募後の返事がない',
    en: 'no reply after applying',
    ko: '지원 후 답변이 없음',
    zh: '申请后没有回复',
    vi: 'không có phản hồi sau khi nộp đơn',
  },
  auto_cancelled: {
    ja: '自動キャンセル',
    en: 'auto cancellation',
    ko: '자동 취소',
    zh: '自动取消',
    vi: 'tự động hủy',
  },
  change_email: {
    ja: 'メールアドレス変更',
    en: 'change email address',
    ko: '이메일 변경',
    zh: '更改邮箱',
    vi: 'thay đổi email',
  },
  error_report: {
    ja: 'エラー・不具合報告',
    en: 'error/bug report',
    ko: '오류 신고',
    zh: '错误报告',
    vi: 'báo cáo lỗi',
  },
  how_to_apply: {
    ja: '応募方法',
    en: 'how to apply',
    ko: '지원 방법',
    zh: '如何申请',
    vi: 'cách nộp đơn',
  },
  search_specific_job: {
    ja: '特定の仕事を探す',
    en: 'searching for specific jobs',
    ko: '특정 일자리 검색',
    zh: '搜索特定工作',
    vi: 'tìm công việc cụ thể',
  },
  search_jobs: {
    ja: '仕事を探す',
    en: 'job search',
    ko: '일자리 찾기',
    zh: '找工作',
    vi: 'tìm việc làm',
  },
  // CSV追加: General
  what_is_yolo_japan: {
    ja: 'YOLO JAPANとは',
    en: 'what is YOLO JAPAN',
    ko: 'YOLO JAPAN이란',
    zh: 'YOLO JAPAN是什么',
    vi: 'YOLO JAPAN là gì',
  },
  registration_free: {
    ja: '登録無料',
    en: 'free registration',
    ko: '무료 등록',
    zh: '免费注册',
    vi: 'đăng ký miễn phí',
  },
  how_to_register: {
    ja: '登録方法',
    en: 'how to register',
    ko: '등록 방법',
    zh: '如何注册',
    vi: 'cách đăng ký',
  },
  visa_requirements: {
    ja: 'ビザ・在留資格',
    en: 'visa requirements',
    ko: '비자 요건',
    zh: '签证要求',
    vi: 'yêu cầu visa',
  },
  // CSV追加: Account/Profile
  edit_profile: {
    ja: 'プロフィール編集',
    en: 'edit profile',
    ko: '프로필 수정',
    zh: '编辑资料',
    vi: 'chỉnh sửa hồ sơ',
  },
  change_phone: {
    ja: '電話番号変更',
    en: 'change phone number',
    ko: '전화번호 변경',
    zh: '更改电话号码',
    vi: 'thay đổi số điện thoại',
  },
  upload_resume: {
    ja: '履歴書アップロード',
    en: 'upload resume',
    ko: '이력서 업로드',
    zh: '上传简历',
    vi: 'tải lên CV',
  },
  login_issue: {
    ja: 'ログインできない',
    en: 'login issues',
    ko: '로그인 문제',
    zh: '登录问题',
    vi: 'vấn đề đăng nhập',
  },
  no_verification_email: {
    ja: '認証メールが届かない',
    en: 'verification email not received',
    ko: '인증 메일 미수신',
    zh: '未收到验证邮件',
    vi: 'không nhận được email xác minh',
  },
  // CSV追加: About Jobs
  job_requirements: {
    ja: '応募条件',
    en: 'job requirements',
    ko: '지원 조건',
    zh: '应聘条件',
    vi: 'yêu cầu công việc',
  },
  salary_payment: {
    ja: '給料・賃金',
    en: 'salary and payment',
    ko: '급여',
    zh: '工资',
    vi: 'lương',
  },
  interview_preparation: {
    ja: '面接準備',
    en: 'interview preparation',
    ko: '면접 준비',
    zh: '面试准备',
    vi: 'chuẩn bị phỏng vấn',
  },
  working_hours: {
    ja: '勤務時間',
    en: 'working hours',
    ko: '근무 시간',
    zh: '工作时间',
    vi: 'giờ làm việc',
  },
  job_not_available: {
    ja: '求人が見つからない',
    en: 'no jobs available',
    ko: '일자리를 찾을 수 없음',
    zh: '找不到工作',
    vi: 'không tìm thấy việc làm',
  },
  transportation_expenses: {
    ja: '交通費',
    en: 'transportation allowance',
    ko: '교통비',
    zh: '交通费',
    vi: 'phí đi lại',
  },
  // CSV追加: YOLO HOME
  what_is_yolo_home: {
    ja: 'YOLO HOMEとは',
    en: 'what is YOLO HOME',
    ko: 'YOLO HOME이란',
    zh: 'YOLO HOME是什么',
    vi: 'YOLO HOME là gì',
  },
  search_property: {
    ja: '物件を探す',
    en: 'search property',
    ko: '물건 찾기',
    zh: '找房子',
    vi: 'tìm nhà',
  },
  rental_requirements: {
    ja: '入居条件',
    en: 'rental requirements',
    ko: '입주 조건',
    zh: '入住条件',
    vi: 'điều kiện thuê nhà',
  },
  // YOLO DISCOVER
  cancel_project: {
    ja: 'プロジェクトキャンセル',
    en: 'project cancellation',
    ko: '프로젝트 취소',
    zh: '取消项目',
    vi: 'hủy dự án',
  },
  completion_report: {
    ja: '完了報告',
    en: 'completion report',
    ko: '완료 보고',
    zh: '完成报告',
    vi: 'báo cáo hoàn thành',
  },
  contact_manager: {
    ja: '担当者への連絡',
    en: 'contacting manager',
    ko: '담당자 연락',
    zh: '联系负责人',
    vi: 'liên hệ quản lý',
  },
  // ===== 実問い合わせCSV追加: YOLO DISCOVER =====
  change_schedule: {
    ja: '日程変更',
    en: 'schedule change',
    ko: '일정 변경',
    zh: '更改日程',
    vi: 'thay đổi lịch trình',
  },
  japanese_participation: {
    ja: '日本人の参加',
    en: 'Japanese participation',
    ko: '일본인 참가',
    zh: '日本人参加',
    vi: 'người Nhật tham gia',
  },
  checkin_issue: {
    ja: 'チェックイン問題',
    en: 'check-in issue',
    ko: '체크인 문제',
    zh: '签到问题',
    vi: 'vấn đề check-in',
  },
  project_cancelled_message: {
    ja: 'キャンセル後のメッセージ',
    en: 'message after cancellation',
    ko: '취소 후 메시지',
    zh: '取消后消息',
    vi: 'tin nhắn sau khi hủy',
  },
  work_permit_required: {
    ja: '就労資格',
    en: 'work permit required',
    ko: '취업 자격',
    zh: '工作许可',
    vi: 'giấy phép lao động',
  },
  completion_not_approved: {
    ja: '完了報告が承認されない',
    en: 'completion not approved',
    ko: '완료 보고 미승인',
    zh: '完成报告未批准',
    vi: 'báo cáo hoàn thành chưa được duyệt',
  },
  // ===== 実問い合わせCSV追加: YOLO JAPAN =====
  passport_registration_error: {
    ja: 'パスポート登録エラー',
    en: 'passport registration error',
    ko: '여권 등록 오류',
    zh: '护照注册错误',
    vi: 'lỗi đăng ký hộ chiếu',
  },
  invalid_account: {
    ja: '無効なアカウント',
    en: 'invalid account',
    ko: '유효하지 않은 계정',
    zh: '无效账户',
    vi: 'tài khoản không hợp lệ',
  },
  video_upload_error: {
    ja: '動画アップロードエラー',
    en: 'video upload error',
    ko: '동영상 업로드 오류',
    zh: '视频上传错误',
    vi: 'lỗi tải video lên',
  },
  interview_link_not_received: {
    ja: '面接リンクが届かない',
    en: 'interview link not received',
    ko: '면접 링크 미수신',
    zh: '未收到面试链接',
    vi: 'không nhận được link phỏng vấn',
  },
  site_error: {
    ja: 'サイト障害',
    en: 'site error',
    ko: '사이트 오류',
    zh: '网站错误',
    vi: 'lỗi trang web',
  },
  residence_card_rejected: {
    ja: '在留カード不採用',
    en: 'residence card rejected',
    ko: '재류카드 불합격',
    zh: '在留卡被拒',
    vi: 'thẻ cư trú bị từ chối',
  },
  why_rejected: {
    ja: '不採用の理由',
    en: 'reason for rejection',
    ko: '불합격 사유',
    zh: '拒绝原因',
    vi: 'lý do bị từ chối',
  },
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
/**
 * URLの言語コードを実際の言語に置換
 * /ja/ → ユーザーの言語コードに変換
 */
function replaceUrlLangCode(response: string, lang: string): string {
  const validLangs = ['ja', 'en', 'ko', 'zh', 'vi'];
  const targetLang = validLangs.includes(lang) ? lang : 'ja';

  // yolo-japan.com と wom.yolo-japan.com のURL内の /ja/ を言語コードに置換
  return response
    .replace(/https:\/\/www\.yolo-japan\.com\/ja\//g, `https://www.yolo-japan.com/${targetLang}/`)
    .replace(/https:\/\/wom\.yolo-japan\.com\/ja\//g, `https://wom.yolo-japan.com/${targetLang}/`);
}

export function getFAQResponseById(
  faqId: string,
  service: 'YOLO_JAPAN' | 'YOLO_DISCOVER' | 'YOLO_HOME' | undefined,
  lang: string
): string | null {
  // TODO: YOLO_HOME_FAQ を追加したらここに分岐を追加
  const faqList = service === 'YOLO_DISCOVER'
    ? YOLO_DISCOVER_FAQ
    : YOLO_JAPAN_FAQ; // YOLO_JAPAN と YOLO_HOME は同じFAQを使用（暫定）
  const faq = faqList.find(f => f.id === faqId);

  if (faq) {
    const response = faq.responses[lang as keyof typeof faq.responses] || faq.responses.ja;
    // URLの言語コードをユーザーの言語に置換
    return replaceUrlLangCode(response, lang);
  }

  return null;
}
