// =====================================================
// FAQ and Prompt for Customer Support AI
// =====================================================

import { ServiceType, KnownIssue } from '@/types/support';
import {
  getFAQsByService,
  getAllFAQs,
  searchFAQsByKeyword,
  FAQ,
} from '@/lib/database/faq-queries';

// UTMパラメータ（統一）
const UTM = '?utm_source=line&utm_medium=inquiry&utm_campaign=line_inquiry';

/**
 * サービス別FAQ
 */
export const SERVICE_FAQ: Record<ServiceType, string[]> = {
  YOLO_HOME: [
    `Q: YOLO HOMEとは何ですか？\nA: 外国人向けの住宅情報サービスです。敷金・礼金なし、保証人不要の物件を多数掲載しています。`,
    `Q: 入居審査はありますか？\nA: はい、簡易的な審査があります。在留カードとパスポートが必要です。`,
    `Q: 契約期間はどのくらいですか？\nA: 最短1ヶ月から契約可能です。`,
    `Q: 家具付き物件はありますか？\nA: はい、多くの物件で家具・家電付きを選べます。`,
    `Q: 物件について質問したい\nA: ご自身で物件を探していただき、物件詳細にあるお問い合わせボタンからお願いします。`,
    `Q: 物件を紹介してください\nA: ご自身で物件を探していただき、物件詳細にあるお問い合わせボタンからお願いします（登録が必要です）。`,
  ],
  YOLO_DISCOVER: [
    // === 基本情報 ===
    `Q: YOLO DISCOVERとは何ですか？\nA: 外国人向けの生活情報・イベント情報プラットフォームです。`,
    `Q: イベントの参加費用は？\nA: イベントによって異なります。無料のものも多数あります。`,
    `Q: 情報は何語で見れますか？\nA: 日本語、英語、中国語、韓国語、ベトナム語に対応しています。`,
    // === キャンセル・日程変更 ===
    `Q: キャンセルしたい\nA: キャンセルのご依頼につきましては、プロジェクトのメッセージシステムにてプロジェクトマネージャーまでご連絡ください。\n\n【体験日の日程変更またはお問い合わせについて】\n承認前：現在の申請をキャンセルし、希望の日程で再申請することで日程変更が可能です。\n承認後：メッセージ機能から、プロジェクトコーディネーターまでご連絡ください。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/${UTM}\n② https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}\n③ 該当プロジェクトページの「メッセージを送信」`,
    `Q: 予約・プロジェクトのキャンセル\nA: ご不便をおかけして申し訳ございません。キャンセルの場合は、https://wom.yolo-japan.com/ja/mypage/entries/${UTM} からお願いいたします。選考前まではキャンセル可能です。`,
    `Q: 体験日の変更\nA: 体験日の変更につきましては\n承認前：変更可能です。現在の応募を取り消し、希望の日程で再度お応募ください。\n承認後：変更はできません。日程変更がどうしても必要な場合は、メッセージ機能にてプロジェクト担当者にご連絡ください。\n※注意：承認後は、同じプロジェクトへの再応募はできません。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/${UTM}\n② https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}\n③ 該当プロジェクトページの「メッセージを送信」`,
    `Q: キャンセルしたいけどメッセージを見てくれない\nA: 実行中のプロジェクト https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM} から緊急連絡先へお願いします。`,
    // === 完了報告・投稿 ===
    `Q: 完了報告はどうする？\nA: プロジェクトにご参加いただきありがとうございます。https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM} から完了報告書を提出することができます。`,
    `Q: 完了報告が承認されない\nA: 企業は7日以内に行います。`,
    `Q: 投稿はどのくらいの期間残しておく必要がありますか？\nA: 完了報告が承認された日から半年間は投稿を残していただく必要があります。期間内にPR投稿を削除・アーカイブすることは、アカウントの利用制限などペナルティ付与の対象となります。`,
    `Q: 修正依頼期限\nA: お忙しいところ恐縮ですが、依頼日から7日以内にご対応いただきますようお願い申し上げます。期間内に完了報告をいただけない場合、ペナルティの対象となる場合がございます。`,
    // === プロジェクト問い合わせ ===
    `Q: プロジェクトの問い合わせ・プロジェクト担当者への連絡方法・友達連れていける？\nA: プロジェクトについてのお問い合わせは、恐れ入りますがプロジェクトのメッセージシステムから、プロジェクト担当者までご連絡いただけますでしょうか。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/${UTM}\n② https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM}\n③ 該当プロジェクトページの「メッセージを送信」`,
    // === 応募関連 ===
    `Q: 応募の流れ・応募と予約の説明\nA: 弊社のプロジェクトは、お客様からのお応募をいただき、その中から企業様が参加者様を採用するという形式をとっております。お応募いただいた後、企業様からの承認を得られますと、ご予約が確定することとなります。つまりましては、お応募は「予約」とは異なり、お応募いただいた時点で、来店が確約されるものではございませんので、ご了承ください。\n\nお申込みから体験、投稿までの流れは https://info.yolo-japan.com/discover/howto${UTM} からご確認いただけます。`,
    `Q: 応募したのに落とされた\nA: この度は、プロジェクトへのご応募いただき、ありがとうございます。採用されるかどうかは企業に判断を委ねていて、不採用理由を公開することはできません。ご応募いただいたプロジェクトの状況は、https://wom.yolo-japan.com/ja/mypage/active-projects/${UTM} からご確認いただけます。\n\nまた、様々なプロジェクトを随時公開しておりますので、今後ともご興味のあるプロジェクトがございましたら、ぜひご応募いただけますと幸いです。`,
    // === その他 ===
    `Q: チェックインできていない\nA: メッセージ機能で企業にチェックイン処理をお願いしてください。`,
    `Q: どうして就労資格が必要なの？\nA: 報酬を伴う活動に該当します。`,
    `Q: 同行者がYOLO会員でないとなれないのはいつから？\nA: 10月9日の応募からです。`,
    `Q: 同行者が会員カードに対して日本人はどうなる？\nA: 登録・応募・チェックイン・完了報告をしただければ参加できます。`,
    `Q: 掲載したい\nA: https://www.yolo-japan.co.jp/yolo-discover/download${UTM} から「外国人行動データ無料相談・資料ダウンロード」をご利用ください。`,
    // === アカウント ===
    `Q: 在留カード・身分証登録できない\nA: 申し訳ございません。在留カードや身分証明書の登録は、カードの情報を読み取る必要があり、スマートフォンのみとなっております。スマートフォンからの登録をお願いいたします。`,
    // === エラー ===
    `Q: エラーが発生した\nA: こちらの障害報告フォームの入力をお願いします。 https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
  ],
  YOLO_JAPAN: [
    // === アカウント・プロフィール ===
    `Q: 新規登録したい・会員登録の方法\nA: YOLO JAPANへの会員登録は https://www.yolo-japan.com/ja/${UTM} からできます。\n\n登録に必要なもの：\n・メールアドレス（またはGoogleアカウント）\n・在留カード（外国籍の方）\n\n登録後、求人への応募が可能になります。`,
    `Q: 求人に応募するには？\nA: 【登録済みの方】\nマイページ https://www.yolo-japan.com/ja/recruit/mypage/${UTM} にログインし、気になる求人の「応募する」ボタンから応募できます。\n\n【まだ登録していない方】\nまずYOLO JAPANに会員登録をお願いします。登録は https://www.yolo-japan.com/ja/${UTM} からできます。`,
    `Q: 海外から応募できますか？\nA: 海外から応募することはできません。\n\na. 日本に住んでいて、仕事ができる在留カードがあっている人\nb. 日本永住者の人、永住ビザを持つ人。\nc. 日本国籍の人\n\nだけ応募できます。\n\nYOLO JAPANの仕事は、誰でも見ることができます。日本に来るときのために、登録してみてください！`,
    `Q: パスワードを忘れました\nA: https://www.yolo-japan.com/ja/recruit/login${UTM} から「パスワードを忘れた」をクリックしてリセットできます。`,
    `Q: 在留カードの更新サポートはありますか？\nA: 恐れ入りますが、現在在留カードの更新や支援は行っておりません。在留資格の詳しい内容は、出入国在留管理庁 https://www.moj.go.jp/isa/consultation/center/japanese.html に相談してください。`,
    `Q: メルマガを停止したい\nA: https://www.yolo-japan.com/ja/recruit/mypage/mail/input${UTM} からメールマガジンの設定を変えることができます。`,
    `Q: 退会したい・解約したい・アカウントを削除したい\nA: https://www.yolo-japan.com/ja/withdraw/${UTM} からアカウントを消すことができます。\n※メールマガジンやSMSを完全にストップするには時間がかかります。そのため、次の送信が届くかもしれません。`,
    `Q: 新しい動画をアップしたい・動画を変更したい\nA: https://www.yolo-japan.com/ja/my-page/introduction-video${UTM} からできます。`,
    `Q: 勝手に辞退になった・応募が自動でキャンセルされた\nA: 一定期間、企業からの連絡に返信がない場合や、面接日程の調整が完了しない場合は、システムにより自動的にキャンセルされる仕組みとなっています。これは不具合ではなく、仕様となります。`,
    `Q: 不採用になった理由が知りたい\nA: 申し訳ございませんが、不採用の理由は企業側から開示されないため、弊社からお伝えすることができません。`,
    `Q: スカウトは自動で送っているのですか？ボットですか？\nA: スカウトメッセージは企業の採用担当者が直接送信しています。ボットや自動システムではありません。企業があなたのプロフィールを見て、直接興味を持った場合に送られるメッセージです。`,
    `Q: 応募後の連絡はどのくらいで来ますか？\nA: 面接に進む人にだけ連絡がされます。応募から14日以内に連絡するようにお願いしているので、もう少し待っていてください。`,
    `Q: メールアドレスを変更したい\nA: メールアドレス変更のお手続きには、本人確認のために以下の情報を yolostaff@yolo-japan.co.jp にお送りください。\n\nYOLO JAPAN ID：\n氏名：\n生年月日：\n性別：\n郵便番号：\n電話番号：\n変更前のアドレス：\n変更後のアドレス：`,
    `Q: ログインできないけどどうすればいいの？\nA: Googleアカウントを利用してアカウント作成・ログインした方は、"Sign in with Google"を選んでログインしてください。アカウント作成時に利用したGoogleアカウントにログインされている状態で行わないと正しくログインできません。`,
    `Q: 二重国籍だけど在留カードないけどどうやって応募するの？\nA: 日本と外国の2つ以上の国籍を持っている人は、在留カードの登録は必要ありません。「ユーザ/スカウト情報」の https://www.yolo-japan.com/ja/recruit/mypage/profile/input/personalInfo${UTM} にある国籍の部分に「日本」を追加してください。`,
    `Q: 運転免許情報はどこで登録するの？\nA: https://www.yolo-japan.com/ja/my-page/drivers-license${UTM} からできます。`,
    `Q: 資格を取得できたけどどこで登録する？\nA: https://www.yolo-japan.com/ja/qualifications/create${UTM} からできます。`,
    // === 仕事・面接 ===
    `Q: 面接日だけど何も連絡が来ない\nA: まだ連絡がない時は、自分で会社に連絡をお願いしています。会社のメールアドレスまたは電話番号は2つの方法で調べることができます。\n①面接の予約をした時の確認メール\n②マイページの「面接日程」\n\nマイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM} からメッセージ機能を使うこともできます。`,
    `Q: オンライン面接のリンクが届いてない\nA: オンライン面接のリンクは面接する会社からメールで送られます。届いていない時は、自分で会社に連絡してください。連絡先はマイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM} から見ることができます。`,
    `Q: 面接をキャンセルしたい\nA: 面接前のキャンセルは、マイページの https://www.yolo-japan.com/ja/recruit/mypage/application/${UTM} からできます。「お断りする」をクリックすると面接をキャンセルすることができます。\n\n面接のスケジュールを変えたい時は、自分で会社に連絡してください。`,
    `Q: 面接場所の詳細はどうやって確認できますか？\nA: マイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/${UTM} から面接場所を確認することができます。`,
    `Q: 色んな仕事に応募したが中々返事が来ないけどなんでですか？\nA: 面接に進む人にだけ連絡がされます。応募から14日以内に連絡するようにお願いしているので、もう少し待っていてください。待っている間、もっと他の仕事に応募してみてください。`,
    `Q: 〇〇エリアに仕事はありますか？ / 〇〇職種の仕事はありますか？\nA: メニューにある「しごとをさがす」を使って仕事を探してください。こちらの特集ページも合わせてご覧ください https://www.yolo-japan.com/ja/recruit/feature/theme${UTM}`,
    // === ビザ関連 ===
    `Q: 観光ビザ、研修ビザ等就労できないビザを持ってて働きたい\nA: こちらのビザでは日本で働くことはできません。在留資格の詳しい内容は、出入国在留管理庁 https://www.moj.go.jp/isa/consultation/center/japanese.html に相談してください。`,
    `Q: SOFAで働けますか？\nA: SOFAビザを持っている人は、基地の中でのみ働けます。`,
    `Q: 採用になったら企業からVISAをスポンサーしてもらえますか？\nA: YOLO JAPANには https://www.yolo-japan.com/ja/recruit/feature/visa_support_available${UTM} から、ビザサポートありの求人の特集があります。また、面接でスポンサーについて必ず聞いてください。`,
    `Q: ビザをサポート(留学ビザなどからの切り替え)してほしい\nA: YOLO JAPANではビザに関するサポートはできません。 https://www.yolo-japan.com/ja/recruit/feature/visa_support_available${UTM} からビザサポートありの特集があるので見てください。そして、面接でスポンサーについて必ず聞いてください。`,
    // === その他 ===
    `Q: アンケートに当選していますか？\nA: マイページと当選発表のお知らせから確認可能です。 https://www.yolo-japan.com/ja/recruit/mypage/winner/${UTM}`,
    `Q: YOLO JAPANが個人情報を流出した？\nA: 私たちは https://www.yolo-japan.co.jp/privacy_policy/${UTM} をもとに、情報を管理しています。関係のない会社にお情報を共有することはありません。応募した会社のみ、一部の情報を見ることができます。`,
    `Q: 求人掲載したい\nA: 求人を掲載したい企業向けのサイトはこちらです。 https://lp.yolo-work.com/consulting${UTM}`,
    // === エラー ===
    `Q: 情報をセーブできない、サインアップできない等\nA: こちらの障害報告フォームの入力をお願いします。 https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform`,
  ],
};

/**
 * 共通FAQ
 */
export const COMMON_FAQ = [
  'Q: 問い合わせの返信はどのくらいかかりますか？\nA: 通常1-2営業日以内にご返信いたします。',
  'Q: 日本語以外でも問い合わせできますか？\nA: はい、英語、中国語、韓国語、ベトナム語でも対応しています。',
  'Q: 電話での問い合わせはできますか？\nA: 恐れ入りますが、現在お電話でのお問い合わせは受け付けておりません。',
];

/**
 * FAQから許可されたURLを抽出
 */
function extractAllowedUrls(): Set<string> {
  const urls = new Set<string>();
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

  // 全サービスのFAQからURLを抽出
  Object.values(SERVICE_FAQ).forEach((faqs) => {
    faqs.forEach((faq) => {
      const matches = faq.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          // UTMパラメータを除去したベースURLを登録
          const baseUrl = url.split('?')[0];
          urls.add(baseUrl);
        });
      }
    });
  });

  return urls;
}

// 許可されたURLのキャッシュ
const ALLOWED_URLS = extractAllowedUrls();

/**
 * AI応答から不正なURLを除去
 * FAQに存在しないURLはすべて削除する
 */
export function sanitizeAiResponse(response: string): string {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\])\]]+/gi;

  return response.replace(urlRegex, (url) => {
    // URLからUTMパラメータを除去してベースURLを取得
    const baseUrl = url.split('?')[0];

    // 許可されたURLリストに存在するかチェック
    if (ALLOWED_URLS.has(baseUrl)) {
      return url; // 許可されたURLはそのまま
    }

    // 許可されていないURLは除去（空文字に置換）
    console.warn(`⚠️ 不正なURL除去: ${url}`);
    return '';
  });
}

/**
 * サポートAIのシステムプロンプト生成
 */
export function generateSupportSystemPrompt(params: {
  ticketType: 'feedback' | 'bug';
  service?: ServiceType;
  lang: string;
  knownIssues?: KnownIssue[];
}): string {
  const { ticketType, service, lang, knownIssues } = params;

  const basePrompt = `あなたはYOLOサービスのカスタマーサポートAIです。
ユーザーからのお問い合わせに対応してください。

## 【最重要】解決策を提示すること
あなたの目的は**ユーザーの問題を解決すること**です。
確認質問ばかりせず、FAQに該当する回答があれば**すぐに解決策を提示**してください。

## 【絶対禁止事項】
1. **URLを自分で作成・推測・生成することは絶対禁止**
2. **FAQに記載されていないURLは絶対に案内しない**
3. **確認質問を2回以上連続で行うことは禁止** - 1回確認したら次は解決策を出す

## 回答の優先順位（この順番で対応）
1. **FAQに該当する回答がある** → 即座にFAQの回答（URLを含む）をそのまま提示
2. **FAQに近い内容がある** → FAQの回答を参考に解決策を提示
3. **曖昧で複数の解釈がある** → 1回だけ確認質問し、次は必ず解決策を出す
4. **FAQに該当がない** → 「担当者に確認します」と伝えて[ESCALATE]タグを付ける

## 確認質問のルール
- **1回だけ**確認質問をしたら、次は必ず解決策を提示する
- ユーザーが「うん」「はい」と答えたら、**即座にFAQの回答を提示**する
- 同じような確認質問を繰り返さない

## よくある問い合わせ → 即答パターン（URLを必ず含めること）

**「企業と連絡取れない」「面接の連絡がない」「相手から連絡がこない」の場合：**
→ 以下のように回答（URLを必ず含める）：
「まだ連絡がない時は、自分で会社に連絡をお願いしています。会社のメールアドレスまたは電話番号は、面接の予約をした時の確認メールか、マイページの「面接日程」から調べることができます。
マイページ：https://www.yolo-japan.com/ja/recruit/mypage/interview/ からメッセージ機能を使うこともできます。」

**「退会したい」「解約したい」の場合：**
→ 「https://www.yolo-japan.com/ja/withdraw/ からアカウントを消すことができます。」

**「パスワード忘れた」の場合：**
→ 「https://www.yolo-japan.com/ja/recruit/login から「パスワードを忘れた」をクリックしてリセットできます。」

## 基本ルール
1. ユーザーの言語（${lang}）に合わせて応答する
2. 応答は簡潔に、解決策を明確に
3. **FAQの回答にURLがある場合は、必ずそのURLも含めて回答すること**
4. 丁寧で親切な対応を心がける

## URLの取り扱い【超重要】
- **FAQの回答にURLが含まれている場合、そのURLを必ず出力すること**
- URLを省略しない。ユーザーが行動できるようにURLを提示する
- FAQセクションに記載されていないURLは絶対に案内しない
- URLを変更・短縮・推測することは禁止

## エスカレーション判定
以下の場合のみ、応答の最後に「[ESCALATE]」タグを付けてください：

1. **FAQを確認しても該当する回答がない場合**
2. **ユーザーが「人と話したい」「オペレーター」と要求した場合**
3. **解決策を提示したが、ユーザーが「それでもできない」と言った場合**
4. **感情的に不満を訴えている場合（怒り、失望など）**

例：
- 「申し訳ございませんが、この件については担当者に確認が必要です。[ESCALATE]」`;


  // サービス別FAQを追加
  let faqSection = '\n## FAQ\n';
  if (service && SERVICE_FAQ[service]) {
    faqSection += `### ${service}に関するFAQ\n`;
    SERVICE_FAQ[service].forEach((qa) => {
      faqSection += qa + '\n\n';
    });
  }
  faqSection += '### 共通FAQ\n';
  COMMON_FAQ.forEach((qa) => {
    faqSection += qa + '\n\n';
  });

  // 既知の問題を追加
  let knownIssuesSection = '';
  if (knownIssues && knownIssues.length > 0) {
    knownIssuesSection = '\n## 現在調査中の既知の問題\n';
    knownIssues.forEach((issue) => {
      knownIssuesSection += `- **${issue.title}**: ${issue.description || '調査中'}\n`;
    });
    knownIssuesSection += '\n上記に該当する場合は、既知の問題であることを伝え、調査中であることを案内してください。\n';
  }

  return basePrompt + faqSection + knownIssuesSection;
}

/**
 * サポートAIのシステムプロンプト生成（DB版 - 非同期）
 * DBからFAQを取得し、失敗した場合はハードコードにフォールバック
 */
export async function generateSupportSystemPromptAsync(params: {
  ticketType: 'feedback' | 'bug';
  service?: ServiceType;
  lang: string;
  knownIssues?: KnownIssue[];
}): Promise<string> {
  const { ticketType, service, lang, knownIssues } = params;

  const basePrompt = `あなたはYOLOサービスのカスタマーサポートAIです。
ユーザーからのお問い合わせに対応してください。

## 【最重要】解決策を提示すること
あなたの目的は**ユーザーの問題を解決すること**です。
確認質問ばかりせず、FAQに該当する回答があれば**すぐに解決策を提示**してください。

## 【絶対禁止事項】
1. **URLを自分で作成・推測・生成することは絶対禁止**
2. **FAQに記載されていないURLは絶対に案内しない**
3. **確認質問を2回以上連続で行うことは禁止** - 1回確認したら次は解決策を出す

## 回答の優先順位（この順番で対応）
1. **FAQに該当する回答がある** → 即座にFAQの回答（URLを含む）をそのまま提示
2. **FAQに近い内容がある** → FAQの回答を参考に解決策を提示
3. **曖昧で複数の解釈がある** → 1回だけ確認質問し、次は必ず解決策を出す
4. **FAQに該当がない** → 「担当者に確認します」と伝えて[ESCALATE]タグを付ける

## 確認質問のルール
- **1回だけ**確認質問をしたら、次は必ず解決策を提示する
- ユーザーが「うん」「はい」と答えたら、**即座にFAQの回答を提示**する
- 同じような確認質問を繰り返さない

## よくある問い合わせ → 即答パターン（URLを必ず含めること）

**「企業と連絡取れない」「面接の連絡がない」「相手から連絡がこない」の場合：**
→ 以下のように回答（URLを必ず含める）：
「まだ連絡がない時は、自分で会社に連絡をお願いしています。会社のメールアドレスまたは電話番号は、面接の予約をした時の確認メールか、マイページの「面接日程」から調べることができます。
マイページ：https://www.yolo-japan.com/ja/recruit/mypage/interview/ からメッセージ機能を使うこともできます。」

**「退会したい」「解約したい」の場合：**
→ 「https://www.yolo-japan.com/ja/withdraw/ からアカウントを消すことができます。」

**「パスワード忘れた」の場合：**
→ 「https://www.yolo-japan.com/ja/recruit/login から「パスワードを忘れた」をクリックしてリセットできます。」

## 基本ルール
1. ユーザーの言語（${lang}）に合わせて応答する
2. 応答は簡潔に、解決策を明確に
3. **FAQの回答にURLがある場合は、必ずそのURLも含めて回答すること**
4. 丁寧で親切な対応を心がける

## URLの取り扱い【超重要】
- **FAQの回答にURLが含まれている場合、そのURLを必ず出力すること**
- URLを省略しない。ユーザーが行動できるようにURLを提示する
- FAQセクションに記載されていないURLは絶対に案内しない
- URLを変更・短縮・推測することは禁止

## エスカレーション判定
以下の場合のみ、応答の最後に「[ESCALATE]」タグを付けてください：

1. **FAQを確認しても該当する回答がない場合**
2. **ユーザーが「人と話したい」「オペレーター」と要求した場合**
3. **解決策を提示したが、ユーザーが「それでもできない」と言った場合**
4. **感情的に不満を訴えている場合（怒り、失望など）**

例：
- 「申し訳ございませんが、この件については担当者に確認が必要です。[ESCALATE]」`;

  // DBからFAQを取得
  let faqSection = '\n## FAQ\n';
  let usedFallback = false;

  try {
    if (service) {
      const dbFaqs = await getFAQsByService(service, lang);
      if (dbFaqs.length > 0) {
        faqSection += `### ${service}に関するFAQ\n`;
        dbFaqs.forEach((faq) => {
          faqSection += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      } else {
        usedFallback = true;
      }
    } else {
      const dbFaqs = await getAllFAQs(lang);
      if (dbFaqs.length > 0) {
        dbFaqs.forEach((faq) => {
          faqSection += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      } else {
        usedFallback = true;
      }
    }
  } catch (error) {
    console.warn('⚠️ DB FAQ取得失敗、フォールバック使用:', error);
    usedFallback = true;
  }

  // フォールバック: ハードコードFAQ使用
  if (usedFallback) {
    if (service && SERVICE_FAQ[service]) {
      faqSection += `### ${service}に関するFAQ\n`;
      SERVICE_FAQ[service].forEach((qa) => {
        faqSection += qa + '\n\n';
      });
    }
    faqSection += '### 共通FAQ\n';
    COMMON_FAQ.forEach((qa) => {
      faqSection += qa + '\n\n';
    });
  }

  // 既知の問題を追加
  let knownIssuesSection = '';
  if (knownIssues && knownIssues.length > 0) {
    knownIssuesSection = '\n## 現在調査中の既知の問題\n';
    knownIssues.forEach((issue) => {
      knownIssuesSection += `- **${issue.title}**: ${issue.description || '調査中'}\n`;
    });
    knownIssuesSection += '\n上記に該当する場合は、既知の問題であることを伝え、調査中であることを案内してください。\n';
  }

  return basePrompt + faqSection + knownIssuesSection;
}

/**
 * サポート完了時の要約プロンプト
 */
export function generateSummaryPrompt(conversation: Array<{ role: string; content: string }>): string {
  const conversationText = conversation
    .map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  return `以下の会話内容を3行以内で要約してください。
要約には以下を含めてください：
- 問い合わせの種類（ご意見/不具合）
- 主な内容
- 対応状況

会話内容：
${conversationText}

要約：`;
}

/**
 * FAQ検索（キーワードマッチング）
 */
export function searchFAQ(keyword: string, service?: ServiceType): string[] {
  const results: string[] = [];
  const lowerKeyword = keyword.toLowerCase();

  // サービス別FAQを検索
  if (service && SERVICE_FAQ[service]) {
    SERVICE_FAQ[service].forEach((qa) => {
      if (qa.toLowerCase().includes(lowerKeyword)) {
        results.push(qa);
      }
    });
  } else {
    // 全サービスのFAQを検索
    Object.values(SERVICE_FAQ).forEach((faqs) => {
      faqs.forEach((qa) => {
        if (qa.toLowerCase().includes(lowerKeyword)) {
          results.push(qa);
        }
      });
    });
  }

  // 共通FAQを検索
  COMMON_FAQ.forEach((qa) => {
    if (qa.toLowerCase().includes(lowerKeyword)) {
      results.push(qa);
    }
  });

  return results;
}

/**
 * FAQ検索結果の型（スコア付き）
 */
export interface FAQSearchResult {
  id: string;
  question: string;
  answer: string;
  faqKey: string;
  score: number; // 0.0 - 1.0 の類似度スコア
}

/**
 * FAQ検索（DB版 - 非同期）
 * DBからFAQを検索し、失敗した場合はハードコードにフォールバック
 * スコア（類似度）付きで結果を返す
 */
export async function searchFAQAsync(
  keyword: string,
  service?: ServiceType,
  lang: string = 'ja'
): Promise<FAQSearchResult[]> {
  try {
    const dbFaqs = await searchFAQsByKeyword(keyword, service, lang);
    if (dbFaqs.length > 0) {
      // キーワードマッチングのスコア計算
      return dbFaqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        faqKey: faq.faqKey,
        score: calculateMatchScore(keyword, faq),
      })).sort((a, b) => b.score - a.score); // スコア降順でソート
    }
  } catch (error) {
    console.warn('⚠️ DB FAQ検索失敗、フォールバック使用:', error);
  }

  // フォールバック: ハードコードFAQ
  const results = searchFAQ(keyword, service);
  return results.map((qa, index) => {
    const match = qa.match(/Q:\s*(.*?)\nA:\s*([\s\S]*)/);
    const question = match ? match[1].trim() : qa;
    const answer = match ? match[2].trim() : qa;
    return {
      id: `fallback-${index}`,
      question,
      answer,
      faqKey: `fallback-${index}`,
      score: calculateFallbackScore(keyword, question, answer),
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * DB FAQのマッチスコアを計算
 * キーワードとFAQの類似度を0.0-1.0で返す
 */
function calculateMatchScore(keyword: string, faq: FAQ): number {
  const lowerKeyword = keyword.toLowerCase();
  const lowerQuestion = faq.question.toLowerCase();
  const lowerAnswer = faq.answer.toLowerCase();
  const lowerKeywords = faq.keywords.map(k => k.toLowerCase());

  let score = 0;

  // キーワード配列に完全一致がある場合（最高スコア）
  if (lowerKeywords.includes(lowerKeyword)) {
    score = 1.0;
  }
  // キーワード配列に部分一致がある場合
  else if (lowerKeywords.some(k => k.includes(lowerKeyword) || lowerKeyword.includes(k))) {
    score = 0.9;
  }
  // 質問文に完全一致がある場合
  else if (lowerQuestion.includes(lowerKeyword)) {
    // キーワードの長さと質問文の長さの比率でスコア調整
    const ratio = lowerKeyword.length / lowerQuestion.length;
    score = 0.7 + (ratio * 0.2); // 0.7 - 0.9
  }
  // 回答文に含まれる場合
  else if (lowerAnswer.includes(lowerKeyword)) {
    const ratio = lowerKeyword.length / lowerAnswer.length;
    score = 0.5 + (ratio * 0.2); // 0.5 - 0.7
  }

  return Math.min(score, 1.0);
}

/**
 * フォールバックFAQのマッチスコアを計算
 */
function calculateFallbackScore(keyword: string, question: string, answer: string): number {
  const lowerKeyword = keyword.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  const lowerAnswer = answer.toLowerCase();

  if (lowerQuestion.includes(lowerKeyword)) {
    const ratio = lowerKeyword.length / lowerQuestion.length;
    return 0.7 + (ratio * 0.2);
  }
  if (lowerAnswer.includes(lowerKeyword)) {
    const ratio = lowerKeyword.length / lowerAnswer.length;
    return 0.5 + (ratio * 0.2);
  }

  return 0.3; // 最低スコア
}

/**
 * FAQ型を取得（DB版）
 */
export type { FAQ };

/**
 * 言語別の定型文
 */
export const SUPPORT_MESSAGES = {
  ja: {
    selectType: 'お問い合わせの種類を選択してください。',
    selectService: 'どのサービスについてのお問い合わせですか？',
    describeIssue: '詳しい内容をお聞かせください。',
    thankYou: 'お問い合わせありがとうございます。内容を確認し、必要に応じてご連絡いたします。',
    confirmReceived: 'ご報告ありがとうございます。担当者が確認し、対応いたします。',
    knownIssue: 'こちらは現在調査中の問題です。解決次第、お知らせいたします。',
    escalate: '担当者に確認し、改めてご連絡いたします。',
  },
  en: {
    selectType: 'Please select the type of inquiry.',
    selectService: 'Which service is this inquiry about?',
    describeIssue: 'Please describe the details.',
    thankYou: 'Thank you for your inquiry. We will review and contact you if necessary.',
    confirmReceived: 'Thank you for your report. Our team will review and respond.',
    knownIssue: 'This is a known issue we are currently investigating. We will notify you once resolved.',
    escalate: 'We will check with our team and get back to you.',
  },
  ko: {
    selectType: '문의 유형을 선택해 주세요.',
    selectService: '어떤 서비스에 대한 문의인가요?',
    describeIssue: '자세한 내용을 알려주세요.',
    thankYou: '문의해 주셔서 감사합니다. 확인 후 필요시 연락드리겠습니다.',
    confirmReceived: '신고해 주셔서 감사합니다. 담당자가 확인 후 대응하겠습니다.',
    knownIssue: '현재 조사 중인 문제입니다. 해결되면 알려드리겠습니다.',
    escalate: '담당자에게 확인 후 다시 연락드리겠습니다.',
  },
  zh: {
    selectType: '请选择咨询类型。',
    selectService: '这是关于哪个服务的咨询？',
    describeIssue: '请详细说明内容。',
    thankYou: '感谢您的咨询。我们将确认内容，如有必要会与您联系。',
    confirmReceived: '感谢您的报告。我们的团队将确认并处理。',
    knownIssue: '这是我们正在调查的已知问题。解决后会通知您。',
    escalate: '我们将与团队确认后再联系您。',
  },
  vi: {
    selectType: 'Vui lòng chọn loại yêu cầu.',
    selectService: 'Yêu cầu này liên quan đến dịch vụ nào?',
    describeIssue: 'Vui lòng mô tả chi tiết.',
    thankYou: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ xem xét và liên hệ lại nếu cần.',
    confirmReceived: 'Cảm ơn báo cáo của bạn. Đội ngũ của chúng tôi sẽ xem xét và phản hồi.',
    knownIssue: 'Đây là vấn đề đã biết mà chúng tôi đang điều tra. Chúng tôi sẽ thông báo khi được giải quyết.',
    escalate: 'Chúng tôi sẽ kiểm tra với đội ngũ và liên hệ lại với bạn.',
  },
};

/**
 * 言語に応じた定型文を取得
 */
export function getSupportMessage(
  key: keyof typeof SUPPORT_MESSAGES['ja'],
  lang: string
): string {
  const messages = SUPPORT_MESSAGES[lang as keyof typeof SUPPORT_MESSAGES] || SUPPORT_MESSAGES.ja;
  return messages[key];
}

// =====================================================
// イエスドリ（確認パターン）定義
// =====================================================

/**
 * 確認パターンの定義
 */
export interface ConfirmationPattern {
  type: string;                     // 確認の種類（一意識別子）
  keywords: string[];               // トリガーとなるキーワード
  questions: Record<string, string>; // 言語別の確認質問
  faqKey?: string;                  // 対応するFAQのキーワード（検索用）
  service?: 'YOLO_JAPAN' | 'YOLO_DISCOVER' | 'YOLO_HOME' | 'all';
}

/**
 * 確認パターン一覧
 * ユーザーの曖昧な入力 → 確認質問 → FAQ回答
 */
export const CONFIRMATION_PATTERNS: ConfirmationPattern[] = [
  // === YOLO JAPAN 関連 ===
  {
    type: 'withdraw',
    keywords: ['退会', '解約', 'アカウント削除', 'やめたい', '辞めたい', 'アカウントを消', 'delete account', 'cancel account', 'unsubscribe'],
    questions: {
      ja: 'YOLO JAPANのアカウントを退会（削除）したいということでよろしいでしょうか？',
      en: 'Would you like to delete your YOLO JAPAN account?',
      ko: 'YOLO JAPAN 계정을 탈퇴(삭제)하시겠습니까?',
      zh: '您是要删除YOLO JAPAN账户吗？',
      vi: 'Bạn muốn xóa tài khoản YOLO JAPAN của mình?',
    },
    faqKey: '退会したい',
    service: 'YOLO_JAPAN',
  },
  {
    type: 'change_email',
    keywords: ['メールアドレス変更', 'メアド変更', 'email変更', 'change email', 'メール変えたい'],
    questions: {
      ja: 'YOLO JAPANに登録しているメールアドレスを変更したいということでよろしいでしょうか？',
      en: 'Would you like to change your registered email address?',
      ko: '등록된 이메일 주소를 변경하시겠습니까?',
      zh: '您想更改注册的电子邮件地址吗？',
      vi: 'Bạn muốn thay đổi địa chỉ email đã đăng ký?',
    },
    faqKey: 'メールアドレスを変更したい',
    service: 'YOLO_JAPAN',
  },
  {
    type: 'stop_mail',
    keywords: ['メルマガ停止', 'メール停止', 'メールを止めたい', 'メール来ないで', 'stop email', 'unsubscribe mail'],
    questions: {
      ja: 'YOLO JAPANからのメールマガジン配信を停止したいということでよろしいでしょうか？',
      en: 'Would you like to stop receiving email newsletters from YOLO JAPAN?',
      ko: 'YOLO JAPAN의 이메일 뉴스레터 수신을 중지하시겠습니까?',
      zh: '您想停止接收YOLO JAPAN的电子邮件通讯吗？',
      vi: 'Bạn muốn ngừng nhận bản tin email từ YOLO JAPAN?',
    },
    faqKey: 'メルマガを停止したい',
    service: 'YOLO_JAPAN',
  },
  {
    type: 'forgot_password',
    keywords: ['パスワード忘れ', 'パスワードわからない', 'ログインできない', 'forgot password', 'cant login'],
    questions: {
      ja: 'YOLO JAPANのパスワードをリセットしたいということでよろしいでしょうか？',
      en: 'Would you like to reset your YOLO JAPAN password?',
      ko: 'YOLO JAPAN 비밀번호를 재설정하시겠습니까?',
      zh: '您想重置YOLO JAPAN密码吗？',
      vi: 'Bạn muốn đặt lại mật khẩu YOLO JAPAN?',
    },
    faqKey: 'パスワードを忘れました',
    service: 'YOLO_JAPAN',
  },
  {
    type: 'cancel_interview',
    keywords: ['面接キャンセル', '面接をやめたい', '面接辞退', 'cancel interview'],
    questions: {
      ja: '予定している面接をキャンセルしたいということでよろしいでしょうか？',
      en: 'Would you like to cancel your scheduled interview?',
      ko: '예정된 면접을 취소하시겠습니까?',
      zh: '您想取消预定的面试吗？',
      vi: 'Bạn muốn hủy buổi phỏng vấn đã lên lịch?',
    },
    faqKey: '面接をキャンセルしたい',
    service: 'YOLO_JAPAN',
  },
  {
    type: 'auto_cancel_reason',
    keywords: ['勝手にキャンセル', '自動キャンセル', '勝手に辞退', 'キャンセルされた'],
    questions: {
      ja: '応募が自動的にキャンセル（辞退）になった件についてお困りでしょうか？',
      en: 'Are you having trouble with your application being automatically cancelled?',
      ko: '지원이 자동으로 취소된 건에 대해 문의하시나요?',
      zh: '您是否对申请被自动取消感到困扰？',
      vi: 'Bạn đang gặp vấn đề với đơn ứng tuyển bị tự động hủy?',
    },
    faqKey: '勝手に辞退になった',
    service: 'YOLO_JAPAN',
  },

  // === YOLO DISCOVER 関連 ===
  {
    type: 'cancel_project',
    keywords: ['キャンセルしたい', 'プロジェクトキャンセル', '予約キャンセル', '参加やめたい'],
    questions: {
      ja: 'YOLO DISCOVERのプロジェクト（予約）をキャンセルしたいということでよろしいでしょうか？',
      en: 'Would you like to cancel your YOLO DISCOVER project reservation?',
      ko: 'YOLO DISCOVER 프로젝트 예약을 취소하시겠습니까?',
      zh: '您想取消YOLO DISCOVER项目预约吗？',
      vi: 'Bạn muốn hủy đặt chỗ dự án YOLO DISCOVER?',
    },
    faqKey: 'キャンセルしたい',
    service: 'YOLO_DISCOVER',
  },
  {
    type: 'change_date',
    keywords: ['日程変更', '体験日変更', '日付変更', 'change date', 'reschedule'],
    questions: {
      ja: 'YOLO DISCOVERの体験日を変更したいということでよろしいでしょうか？',
      en: 'Would you like to change your YOLO DISCOVER experience date?',
      ko: 'YOLO DISCOVER 체험일을 변경하시겠습니까?',
      zh: '您想更改YOLO DISCOVER体验日期吗？',
      vi: 'Bạn muốn thay đổi ngày trải nghiệm YOLO DISCOVER?',
    },
    faqKey: '体験日の変更',
    service: 'YOLO_DISCOVER',
  },
  {
    type: 'complete_report',
    keywords: ['完了報告', '完了レポート', '報告方法', 'completion report', 'how to report'],
    questions: {
      ja: 'プロジェクトの完了報告の方法についてお知りになりたいですか？',
      en: 'Would you like to know how to submit a completion report?',
      ko: '완료 보고서 제출 방법을 알고 싶으신가요?',
      zh: '您想了解如何提交完成报告吗？',
      vi: 'Bạn muốn biết cách nộp báo cáo hoàn thành?',
    },
    faqKey: '完了報告はどうする',
    service: 'YOLO_DISCOVER',
  },
  {
    type: 'contact_manager',
    keywords: ['担当者に連絡', 'マネージャーに連絡', 'メッセージ送りたい', 'contact manager'],
    questions: {
      ja: 'プロジェクト担当者への連絡方法についてお知りになりたいですか？',
      en: 'Would you like to know how to contact the project manager?',
      ko: '프로젝트 담당자에게 연락하는 방법을 알고 싶으신가요?',
      zh: '您想了解如何联系项目负责人吗？',
      vi: 'Bạn muốn biết cách liên hệ với người quản lý dự án?',
    },
    faqKey: 'プロジェクトの問い合わせ',
    service: 'YOLO_DISCOVER',
  },

  // === 汎用パターン ===
  {
    type: 'error_occurred',
    keywords: ['エラー', 'エラーが出る', 'error', 'バグ', '動かない', 'うまくいかない', '表示されない'],
    questions: {
      ja: 'エラーや不具合が発生していますか？どのような操作をした時に問題が起きましたか？',
      en: 'Are you experiencing an error? What were you trying to do when the problem occurred?',
      ko: '오류가 발생했나요? 문제가 발생했을 때 어떤 작업을 하고 있었나요?',
      zh: '您遇到错误了吗？问题发生时您正在做什么操作？',
      vi: 'Bạn đang gặp lỗi? Bạn đang làm gì khi vấn đề xảy ra?',
    },
    faqKey: 'エラーが発生した',
    service: 'all',
  },
  {
    type: 'not_receiving',
    keywords: ['届かない', '来ない', 'メールが来ない', '通知が来ない', 'not receiving', '受け取れない'],
    questions: {
      ja: '何が届かないのか教えていただけますか？（メール / 通知 / スカウト / その他）',
      en: 'What is not being received? (Email / Notifications / Scout messages / Other)',
      ko: '무엇이 수신되지 않나요? (이메일 / 알림 / 스카우트 / 기타)',
      zh: '什么没有收到？（电子邮件 / 通知 / 猎头消息 / 其他）',
      vi: 'Cái gì không nhận được? (Email / Thông báo / Tin nhắn tuyển dụng / Khác)',
    },
    service: 'all',
  },
  {
    type: 'want_to_change',
    keywords: ['変更したい', '変えたい', 'change', '修正したい', 'edit'],
    questions: {
      ja: '何を変更されたいですか？（メールアドレス / パスワード / プロフィール / その他）',
      en: 'What would you like to change? (Email / Password / Profile / Other)',
      ko: '무엇을 변경하시겠습니까? (이메일 / 비밀번호 / 프로필 / 기타)',
      zh: '您想更改什么？（电子邮件 / 密码 / 个人资料 / 其他）',
      vi: 'Bạn muốn thay đổi gì? (Email / Mật khẩu / Hồ sơ / Khác)',
    },
    service: 'all',
  },
];

/**
 * ユーザーの入力から確認パターンを検出
 * @param userMessage ユーザーのメッセージ
 * @param service 選択されているサービス
 * @param lang 言語
 * @returns マッチしたパターンと確認質問、または null
 */
export function detectConfirmationPattern(
  userMessage: string,
  service: 'YOLO_JAPAN' | 'YOLO_DISCOVER' | 'YOLO_HOME' | undefined,
  lang: string
): { pattern: ConfirmationPattern; question: string; faqAnswer?: string } | null {
  const lowerMessage = userMessage.toLowerCase();

  for (const pattern of CONFIRMATION_PATTERNS) {
    // サービスフィルタ
    if (pattern.service !== 'all' && pattern.service !== service) {
      continue;
    }

    // キーワードマッチ
    const matched = pattern.keywords.some((keyword) =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (matched) {
      const question = pattern.questions[lang] || pattern.questions['ja'];

      // FAQ回答を検索
      let faqAnswer: string | undefined;
      if (pattern.faqKey && service) {
        const faqs = SERVICE_FAQ[service] || [];
        const matchedFaq = faqs.find((faq) =>
          faq.toLowerCase().includes(pattern.faqKey!.toLowerCase())
        );
        if (matchedFaq) {
          // Q: を除いた回答部分を抽出
          const answerMatch = matchedFaq.match(/A:\s*([\s\S]+)/);
          faqAnswer = answerMatch ? answerMatch[1].trim() : matchedFaq;
        }
      }

      return { pattern, question, faqAnswer };
    }
  }

  return null;
}

/**
 * クイックリプライ用の選択肢（言語別）
 */
export const QUICK_REPLY_OPTIONS = {
  ja: {
    yes: 'はい',
    no: 'いいえ',
    other: '他の質問がある',
  },
  en: {
    yes: 'Yes',
    no: 'No',
    other: 'I have another question',
  },
  ko: {
    yes: '예',
    no: '아니오',
    other: '다른 질문이 있어요',
  },
  zh: {
    yes: '是',
    no: '否',
    other: '有其他问题',
  },
  vi: {
    yes: 'Có',
    no: 'Không',
    other: 'Tôi có câu hỏi khác',
  },
};

/**
 * 言語に応じたクイックリプライ選択肢を取得
 */
export function getQuickReplyOptions(lang: string): { yes: string; no: string; other: string } {
  return QUICK_REPLY_OPTIONS[lang as keyof typeof QUICK_REPLY_OPTIONS] || QUICK_REPLY_OPTIONS.ja;
}

// =====================================================
// AI分類機能（課題4: 分類精度向上）
// =====================================================

/**
 * サポートチケットのカテゴリ
 */
export type TicketCategory =
  | 'account'        // アカウント関連（退会、パスワード、メール変更等）
  | 'application'    // 応募・面接関連
  | 'project'        // プロジェクト関連（DISCOVER）
  | 'payment'        // 支払い・報酬関連
  | 'technical'      // 技術的問題（エラー、バグ等）
  | 'visa'           // ビザ関連
  | 'housing'        // 住居関連（HOME）
  | 'general'        // 一般的な質問
  | 'other';         // その他

/**
 * カテゴリ分類のためのキーワードマッピング
 */
const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  account: [
    '退会', '解約', 'アカウント', 'パスワード', 'ログイン', 'メールアドレス',
    '登録', 'プロフィール', '設定', 'メルマガ', '通知', 'ID',
    'withdraw', 'account', 'password', 'login', 'email', 'unsubscribe',
    '탈퇴', '계정', '비밀번호', '이메일',
    '账户', '密码', '邮箱',
    'tài khoản', 'mật khẩu',
  ],
  application: [
    '応募', '面接', '採用', '不採用', '辞退', 'キャンセル', 'スカウト',
    '求人', '仕事', '就職', '転職',
    'application', 'interview', 'job', 'scout', 'hired', 'rejected',
    '지원', '면접', '채용', '스카우트',
    '申请', '面试', '工作',
    'ứng tuyển', 'phỏng vấn', 'việc làm',
  ],
  project: [
    'プロジェクト', '体験', '完了報告', 'チェックイン', '承認',
    '参加', '予約', 'DISCOVER', '担当者',
    'project', 'experience', 'report', 'checkin', 'reservation',
    '프로젝트', '체험', '예약',
    '项目', '体验', '预约',
    'dự án', 'trải nghiệm',
  ],
  payment: [
    '報酬', '支払い', '振込', '入金', '金額', 'ポイント', '謝礼',
    'payment', 'reward', 'money', 'transfer',
    '보상', '지불', '입금',
    '报酬', '支付', '转账',
    'thanh toán', 'tiền',
  ],
  technical: [
    'エラー', 'バグ', '不具合', '動かない', '表示されない', 'できない',
    'おかしい', '止まる', 'フリーズ', 'クラッシュ',
    'error', 'bug', 'not working', 'crash', 'freeze', "can't",
    '오류', '버그', '안돼',
    '错误', '故障', '不能',
    'lỗi', 'không hoạt động',
  ],
  visa: [
    'ビザ', '在留カード', '在留資格', '就労', 'SOFA', '特定技能',
    'visa', 'residence card', 'work permit',
    '비자', '체류카드',
    '签证', '在留卡',
    'thị thực',
  ],
  housing: [
    '物件', '住居', '賃貸', '家', 'HOME', 'アパート', 'マンション',
    '入居', '契約', '家賃', '敷金', '礼金',
    'housing', 'apartment', 'rent', 'property',
    '주택', '아파트', '임대',
    '房子', '公寓', '租房',
    'nhà ở', 'căn hộ',
  ],
  general: [
    '質問', '教えて', 'どうやって', '方法', 'やり方', 'わからない',
    '知りたい', 'ヘルプ',
    'question', 'how to', 'help', 'tell me',
    '질문', '방법', '도움',
    '问题', '怎么', '帮助',
    'câu hỏi', 'làm sao', 'giúp',
  ],
  other: [],
};

/**
 * メッセージからカテゴリを推定（キーワードベース）
 * @param message ユーザーのメッセージ
 * @returns 推定されたカテゴリ
 */
export function classifyTicketCategory(message: string): TicketCategory {
  const lowerMessage = message.toLowerCase();
  const scores: Record<TicketCategory, number> = {
    account: 0,
    application: 0,
    project: 0,
    payment: 0,
    technical: 0,
    visa: 0,
    housing: 0,
    general: 0,
    other: 0,
  };

  // 各カテゴリのキーワードマッチをスコアリング
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        scores[category as TicketCategory] += 1;
      }
    }
  }

  // 最高スコアのカテゴリを返す
  let maxCategory: TicketCategory = 'other';
  let maxScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as TicketCategory;
    }
  }

  // スコアが0の場合は'other'
  if (maxScore === 0) {
    return 'other';
  }

  return maxCategory;
}

/**
 * AI分類用のプロンプト生成
 */
export function generateCategoryClassificationPrompt(
  conversationHistory: Array<{ role: string; content: string }>
): string {
  const conversationText = conversationHistory
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  return `以下のサポート問い合わせを分類してください。

カテゴリ一覧:
- account: アカウント関連（退会、パスワード、メール変更、ログイン等）
- application: 応募・面接関連（求人応募、面接、スカウト、採用結果等）
- project: プロジェクト関連（YOLO DISCOVER体験、完了報告、予約等）
- payment: 支払い・報酬関連（報酬、振込、ポイント等）
- technical: 技術的問題（エラー、バグ、動作不良等）
- visa: ビザ・在留資格関連
- housing: 住居関連（YOLO HOME、物件、賃貸等）
- general: 一般的な質問（使い方、情報確認等）
- other: 上記に該当しない

問い合わせ内容:
${conversationText}

回答は以下のJSON形式のみで返してください（説明不要）:
{"category": "カテゴリ名", "confidence": 0.0-1.0}`;
}

/**
 * エラー報告時の追加質問（構造化ヒアリング）
 */
export const ERROR_FOLLOWUP_QUESTIONS: Record<string, Record<string, string>> = {
  when: {
    ja: 'いつ頃から発生していますか？',
    en: 'When did this start happening?',
    ko: '언제부터 발생했나요?',
    zh: '什么时候开始发生的？',
    vi: 'Điều này bắt đầu xảy ra khi nào?',
  },
  device: {
    ja: 'どのデバイスで発生していますか？（スマートフォン/PC）',
    en: 'Which device are you using? (Smartphone/PC)',
    ko: '어떤 기기에서 발생하나요? (스마트폰/PC)',
    zh: '您使用的是什么设备？（智能手机/电脑）',
    vi: 'Bạn đang sử dụng thiết bị nào? (Điện thoại/Máy tính)',
  },
  steps: {
    ja: 'どのような操作をした時に発生しましたか？',
    en: 'What were you doing when this occurred?',
    ko: '어떤 작업을 할 때 발생했나요?',
    zh: '您在做什么操作时发生的？',
    vi: 'Bạn đang làm gì khi điều này xảy ra?',
  },
  frequency: {
    ja: '毎回発生しますか？それとも時々ですか？',
    en: 'Does it happen every time or occasionally?',
    ko: '매번 발생하나요? 아니면 가끔?',
    zh: '每次都发生还是偶尔？',
    vi: 'Nó xảy ra mỗi lần hay thỉnh thoảng?',
  },
};

/**
 * エラー報告用の追加質問を取得
 */
export function getErrorFollowupQuestion(
  questionType: keyof typeof ERROR_FOLLOWUP_QUESTIONS,
  lang: string
): string {
  const questions = ERROR_FOLLOWUP_QUESTIONS[questionType];
  return questions[lang] || questions.ja;
}
