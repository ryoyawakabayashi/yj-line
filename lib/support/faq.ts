// =====================================================
// FAQ and Prompt for Customer Support AI
// =====================================================

import { ServiceType, KnownIssue } from '@/types/support';

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
    `Q: 求人に応募するには？\nA: まずYOLO JAPANに会員登録をお願いします。登録は https://www.yolo-japan.com/ja/recruit/regist/input${UTM} からできます。`,
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

## 【絶対禁止事項】★必ず守ること★
1. **URLを自分で作成・推測・生成することは絶対禁止**
2. **FAQに記載されていないURLは絶対に案内しない**
3. **憶測で回答しない。わからないことは「確認します」と伝える**
4. **https:// で始まる文字列は、FAQにそのまま記載されているもの以外は出力禁止**

## 【最重要ルール】イエスドリ（確認してから回答）
ユーザーの意図が100%明確でない場合は、必ず確認質問をしてから回答すること。

### 確認が必要なパターン
| ユーザーの発言 | あなたの確認質問 |
|--------------|----------------|
| 解約したい | 「YOLO JAPANのアカウントを退会（削除）したいということでよろしいでしょうか？」 |
| やめたい | 「何をやめたいのか教えていただけますか？」 |
| できない | 「具体的にどの操作ができないのか教えていただけますか？」 |
| 届かない | 「何が届かないのか教えていただけますか？（メール/通知/その他）」 |
| 変更したい | 「何を変更されたいですか？（メールアドレス/パスワード/その他）」 |
| うまくいかない | 「具体的にどのような問題が発生していますか？」 |
| エラー | 「どのような操作をした時にエラーが出ましたか？」 |

### ユーザーが「はい」「そうです」と確定したら
→ FAQに該当する回答があれば、**FAQの内容をそのまま**案内する
→ FAQに該当がなければ「担当者に確認して折り返しご連絡いたします」と回答

## 基本ルール
1. ユーザーの言語（${lang}）に合わせて応答する
2. 応答は簡潔に、2-3文以内
3. 丁寧で親切な対応を心がける
4. FAQに該当する質問は、FAQの回答内容（URLを含む）を**そのままコピー**して使用

## URLの取り扱い（重要）
- FAQセクションに記載されているURLのみ使用可能
- URLを少しでも変更・短縮・推測することは禁止
- URLがわからない場合は「担当者に確認します」と回答し、URLは出力しない

## 特定トピックの回答ルール
- **スカウト**: 「企業の採用担当者が直接送信しています」と必ず伝える（「ボット」「自動」は使わない）
- **不採用理由**: 「企業側から開示されないため、お伝えできません」
- **自動キャンセル**: 「一定期間返信がない場合、システムにより自動的にキャンセルされる仕様です」
- **ビザサポート**: 「YOLO JAPANではビザに関するサポートは行っておりません」`;


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
