-- =====================================================
-- FAQ Seed Data Migration
-- 既存ハードコードFAQをDBに移行
-- =====================================================

-- UTMパラメータ定義
DO $$
DECLARE
  utm TEXT := '?utm_source=line&utm_medium=inquiry&utm_campaign=line_inquiry';
BEGIN

-- =====================================================
-- YOLO HOME FAQs
-- =====================================================

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_intro',
  ARRAY['YOLO HOME', '何', 'what', 'about', '外国人', '住宅'],
  100,
  'YOLO HOMEとは何ですか？',
  '外国人向けの住宅情報サービスです。敷金・礼金なし、保証人不要の物件を多数掲載しています。'
);

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_screening',
  ARRAY['入居審査', '審査', 'screening', '在留カード', 'パスポート'],
  90,
  '入居審査はありますか？',
  'はい、簡易的な審査があります。在留カードとパスポートが必要です。'
);

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_contract_period',
  ARRAY['契約期間', '期間', 'contract', '最短', '1ヶ月'],
  80,
  '契約期間はどのくらいですか？',
  '最短1ヶ月から契約可能です。'
);

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_furnished',
  ARRAY['家具付き', '家具', '家電', 'furniture', 'furnished'],
  70,
  '家具付き物件はありますか？',
  'はい、多くの物件で家具・家電付きを選べます。'
);

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_inquiry',
  ARRAY['物件', '質問', '問い合わせ', 'property', 'inquiry'],
  60,
  '物件について質問したい',
  'ご自身で物件を探していただき、物件詳細にあるお問い合わせボタンからお願いします。'
);

PERFORM migrate_faq(
  'YOLO_HOME',
  'yolo_home_recommend',
  ARRAY['紹介', '物件紹介', 'recommend', '探して'],
  50,
  '物件を紹介してください',
  'ご自身で物件を探していただき、物件詳細にあるお問い合わせボタンからお願いします（登録が必要です）。'
);

-- =====================================================
-- YOLO DISCOVER FAQs
-- =====================================================

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_intro',
  ARRAY['YOLO DISCOVER', '何', 'what', 'about', '生活情報', 'イベント'],
  100,
  'YOLO DISCOVERとは何ですか？',
  '外国人向けの生活情報・イベント情報プラットフォームです。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_fee',
  ARRAY['費用', '参加費', 'fee', 'cost', '無料'],
  90,
  'イベントの参加費用は？',
  'イベントによって異なります。無料のものも多数あります。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_languages',
  ARRAY['言語', '言葉', 'language', '日本語', '英語', '中国語'],
  80,
  '情報は何語で見れますか？',
  '日本語、英語、中国語、韓国語、ベトナム語に対応しています。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_cancel',
  ARRAY['キャンセル', 'キャンセルしたい', 'cancel', '予約キャンセル'],
  95,
  'キャンセルしたい',
  E'キャンセルのご依頼につきましては、プロジェクトのメッセージシステムにてプロジェクトマネージャーまでご連絡ください。\n\n【体験日の日程変更またはお問い合わせについて】\n承認前：現在の申請をキャンセルし、希望の日程で再申請することで日程変更が可能です。\n承認後：メッセージ機能から、プロジェクトコーディネーターまでご連絡ください。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/' || utm || '\n② https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || '\n③ 該当プロジェクトページの「メッセージを送信」'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_cancel_reservation',
  ARRAY['予約', 'キャンセル', '取り消し', 'cancel reservation'],
  94,
  '予約・プロジェクトのキャンセル',
  'ご不便をおかけして申し訳ございません。キャンセルの場合は、https://wom.yolo-japan.com/ja/mypage/entries/' || utm || ' からお願いいたします。選考前まではキャンセル可能です。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_change_date',
  ARRAY['日程変更', '体験日変更', '日付変更', 'change date', 'reschedule'],
  93,
  '体験日の変更',
  E'体験日の変更につきましては\n承認前：変更可能です。現在の応募を取り消し、希望の日程で再度お応募ください。\n承認後：変更はできません。日程変更がどうしても必要な場合は、メッセージ機能にてプロジェクト担当者にご連絡ください。\n※注意：承認後は、同じプロジェクトへの再応募はできません。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/' || utm || '\n② https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || '\n③ 該当プロジェクトページの「メッセージを送信」'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_message_not_seen',
  ARRAY['メッセージ', '見てくれない', '返事がない', 'no response'],
  92,
  'キャンセルしたいけどメッセージを見てくれない',
  '実行中のプロジェクト https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || ' から緊急連絡先へお願いします。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_completion_report',
  ARRAY['完了報告', '報告', 'completion', 'report', '提出'],
  91,
  '完了報告はどうする？',
  'プロジェクトにご参加いただきありがとうございます。https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || ' から完了報告書を提出することができます。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_report_not_approved',
  ARRAY['完了報告', '承認されない', 'not approved', '承認待ち'],
  88,
  '完了報告が承認されない',
  '企業は7日以内に行います。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_post_duration',
  ARRAY['投稿', '期間', '残す', '削除', 'post', 'duration'],
  87,
  '投稿はどのくらいの期間残しておく必要がありますか？',
  '完了報告が承認された日から半年間は投稿を残していただく必要があります。期間内にPR投稿を削除・アーカイブすることは、アカウントの利用制限などペナルティ付与の対象となります。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_revision_deadline',
  ARRAY['修正依頼', '期限', '7日', 'revision', 'deadline'],
  86,
  '修正依頼期限',
  'お忙しいところ恐縮ですが、依頼日から7日以内にご対応いただきますようお願い申し上げます。期間内に完了報告をいただけない場合、ペナルティの対象となる場合がございます。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_contact_manager',
  ARRAY['担当者', '連絡', 'プロジェクト', '問い合わせ', 'contact', 'manager', '友達'],
  85,
  'プロジェクトの問い合わせ・プロジェクト担当者への連絡方法・友達連れていける？',
  E'プロジェクトについてのお問い合わせは、恐れ入りますがプロジェクトのメッセージシステムから、プロジェクト担当者までご連絡いただけますでしょうか。\n\nメッセージの送信方法：\n① https://wom.yolo-japan.com/ja/mypage/' || utm || '\n② https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || '\n③ 該当プロジェクトページの「メッセージを送信」'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_application_flow',
  ARRAY['応募', '流れ', 'フロー', '予約', '説明', 'application', 'flow'],
  84,
  '応募の流れ・応募と予約の説明',
  E'弊社のプロジェクトは、お客様からのお応募をいただき、その中から企業様が参加者様を採用するという形式をとっております。お応募いただいた後、企業様からの承認を得られますと、ご予約が確定することとなります。つまりましては、お応募は「予約」とは異なり、お応募いただいた時点で、来店が確約されるものではございませんので、ご了承ください。\n\nお申込みから体験、投稿までの流れは https://info.yolo-japan.com/discover/howto' || utm || ' からご確認いただけます。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_rejected',
  ARRAY['落とされた', '不採用', 'rejected', '採用されない'],
  83,
  '応募したのに落とされた',
  'この度は、プロジェクトへのご応募いただき、ありがとうございます。採用されるかどうかは企業に判断を委ねていて、不採用理由を公開することはできません。ご応募いただいたプロジェクトの状況は、https://wom.yolo-japan.com/ja/mypage/active-projects/' || utm || ' からご確認いただけます。\n\nまた、様々なプロジェクトを随時公開しておりますので、今後ともご興味のあるプロジェクトがございましたら、ぜひご応募いただけますと幸いです。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_checkin_issue',
  ARRAY['チェックイン', 'できない', 'checkin', 'できていない'],
  82,
  'チェックインできていない',
  'メッセージ機能で企業にチェックイン処理をお願いしてください。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_work_permit',
  ARRAY['就労資格', '資格', 'work permit', 'なぜ'],
  81,
  'どうして就労資格が必要なの？',
  '報酬を伴う活動に該当します。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_companion_member',
  ARRAY['同行者', '会員', 'companion', 'いつから'],
  80,
  '同行者がYOLO会員でないとなれないのはいつから？',
  '10月9日の応募からです。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_companion_japanese',
  ARRAY['同行者', '日本人', 'companion', 'japanese'],
  79,
  '同行者が会員カードに対して日本人はどうなる？',
  '登録・応募・チェックイン・完了報告をしただければ参加できます。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_listing',
  ARRAY['掲載', '掲載したい', 'listing', '企業'],
  78,
  '掲載したい',
  'https://www.yolo-japan.co.jp/yolo-discover/download' || utm || ' から「外国人行動データ無料相談・資料ダウンロード」をご利用ください。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_id_registration',
  ARRAY['在留カード', '身分証', '登録できない', 'スマートフォン', 'ID registration'],
  77,
  '在留カード・身分証登録できない',
  '申し訳ございません。在留カードや身分証明書の登録は、カードの情報を読み取る必要があり、スマートフォンのみとなっております。スマートフォンからの登録をお願いいたします。'
);

PERFORM migrate_faq(
  'YOLO_DISCOVER',
  'yolo_discover_error',
  ARRAY['エラー', 'バグ', '不具合', 'error', 'bug'],
  50,
  'エラーが発生した',
  'こちらの障害報告フォームの入力をお願いします。 https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform'
);

-- =====================================================
-- YOLO JAPAN FAQs
-- =====================================================

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_apply',
  ARRAY['応募', '求人', 'apply', 'job', '登録'],
  100,
  '求人に応募するには？',
  E'【登録済みの方】\nマイページ https://www.yolo-japan.com/ja/recruit/mypage/' || utm || ' にログインし、気になる求人の「応募する」ボタンから応募できます。\n\n【まだ登録していない方】\nまずYOLO JAPANに会員登録をお願いします。登録は https://www.yolo-japan.com/ja/recruit/regist/input' || utm || ' からできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_overseas_apply',
  ARRAY['海外', '海外から', 'overseas', 'abroad', '応募'],
  99,
  '海外から応募できますか？',
  E'海外から応募することはできません。\n\na. 日本に住んでいて、仕事ができる在留カードがあっている人\nb. 日本永住者の人、永住ビザを持つ人。\nc. 日本国籍の人\n\nだけ応募できます。\n\nYOLO JAPANの仕事は、誰でも見ることができます。日本に来るときのために、登録してみてください！'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_forgot_password',
  ARRAY['パスワード', '忘れ', 'forgot', 'password', 'リセット'],
  98,
  'パスワードを忘れました',
  'https://www.yolo-japan.com/ja/recruit/login' || utm || ' から「パスワードを忘れた」をクリックしてリセットできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_visa_support',
  ARRAY['在留カード', '更新', 'サポート', 'visa', 'support'],
  97,
  '在留カードの更新サポートはありますか？',
  '恐れ入りますが、現在在留カードの更新や支援は行っておりません。在留資格の詳しい内容は、出入国在留管理庁 https://www.moj.go.jp/isa/consultation/center/japanese.html に相談してください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_stop_mail',
  ARRAY['メルマガ', '停止', 'メール', 'stop', 'mail', 'unsubscribe'],
  96,
  'メルマガを停止したい',
  'https://www.yolo-japan.com/ja/recruit/mypage/mail/input' || utm || ' からメールマガジンの設定を変えることができます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_withdraw',
  ARRAY['退会', '解約', 'アカウント削除', 'withdraw', 'delete', 'アカウント'],
  95,
  '退会したい・解約したい・アカウントを削除したい',
  'https://www.yolo-japan.com/ja/withdraw/' || utm || ' からアカウントを消すことができます。\n※メールマガジンやSMSを完全にストップするには時間がかかります。そのため、次の送信が届くかもしれません。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_change_video',
  ARRAY['動画', 'アップロード', '変更', 'video', 'upload'],
  94,
  '新しい動画をアップしたい・動画を変更したい',
  'https://www.yolo-japan.com/ja/my-page/introduction-video' || utm || ' からできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_auto_cancel',
  ARRAY['自動', 'キャンセル', '辞退', 'auto', 'cancel'],
  93,
  '勝手に辞退になった・応募が自動でキャンセルされた',
  '一定期間、企業からの連絡に返信がない場合や、面接日程の調整が完了しない場合は、システムにより自動的にキャンセルされる仕組みとなっています。これは不具合ではなく、仕様となります。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_rejection_reason',
  ARRAY['不採用', '理由', 'rejection', 'reason', 'なぜ'],
  92,
  '不採用になった理由が知りたい',
  '申し訳ございませんが、不採用の理由は企業側から開示されないため、弊社からお伝えすることができません。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_scout_auto',
  ARRAY['スカウト', '自動', 'ボット', 'scout', 'auto', 'bot'],
  91,
  'スカウトは自動で送っているのですか？ボットですか？',
  'スカウトメッセージは企業の採用担当者が直接送信しています。ボットや自動システムではありません。企業があなたのプロフィールを見て、直接興味を持った場合に送られるメッセージです。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_response_time',
  ARRAY['応募後', '連絡', '時間', 'response', 'time', '返事'],
  90,
  '応募後の連絡はどのくらいで来ますか？',
  '面接に進む人にだけ連絡がされます。応募から14日以内に連絡するようにお願いしているので、もう少し待っていてください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_change_email',
  ARRAY['メールアドレス', '変更', 'email', 'change'],
  89,
  'メールアドレスを変更したい',
  'メールアドレス変更のお手続きには、本人確認のために以下の情報を yolostaff@yolo-japan.co.jp にお送りください。\n\nYOLO JAPAN ID：\n氏名：\n生年月日：\n性別：\n郵便番号：\n電話番号：\n変更前のアドレス：\n変更後のアドレス：'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_login_issue',
  ARRAY['ログイン', 'できない', 'login', 'Google', 'サインイン'],
  88,
  'ログインできないけどどうすればいいの？',
  'Googleアカウントを利用してアカウント作成・ログインした方は、"Sign in with Google"を選んでログインしてください。アカウント作成時に利用したGoogleアカウントにログインされている状態で行わないと正しくログインできません。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_dual_nationality',
  ARRAY['二重国籍', '在留カード', '日本', 'dual', 'nationality'],
  87,
  '二重国籍だけど在留カードないけどどうやって応募するの？',
  '日本と外国の2つ以上の国籍を持っている人は、在留カードの登録は必要ありません。「ユーザ/スカウト情報」の https://www.yolo-japan.com/ja/recruit/mypage/profile/input/personalInfo' || utm || ' にある国籍の部分に「日本」を追加してください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_drivers_license',
  ARRAY['運転免許', '登録', 'drivers', 'license', '免許'],
  86,
  '運転免許情報はどこで登録するの？',
  'https://www.yolo-japan.com/ja/my-page/drivers-license' || utm || ' からできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_qualification',
  ARRAY['資格', '登録', 'qualification', '取得'],
  85,
  '資格を取得できたけどどこで登録する？',
  'https://www.yolo-japan.com/ja/qualifications/create' || utm || ' からできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_interview_no_contact',
  ARRAY['面接日', '連絡', 'ない', 'interview', 'contact'],
  84,
  '面接日だけど何も連絡が来ない',
  E'まだ連絡がない時は、自分で会社に連絡をお願いしています。会社のメールアドレスまたは電話番号は2つの方法で調べることができます。\n①面接の予約をした時の確認メール\n②マイページの「面接日程」\n\nマイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/' || utm || ' からメッセージ機能を使うこともできます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_online_interview_link',
  ARRAY['オンライン面接', 'リンク', '届いてない', 'online', 'interview', 'link'],
  83,
  'オンライン面接のリンクが届いてない',
  'オンライン面接のリンクは面接する会社からメールで送られます。届いていない時は、自分で会社に連絡してください。連絡先はマイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/' || utm || ' から見ることができます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_cancel_interview',
  ARRAY['面接', 'キャンセル', 'interview', 'cancel', '辞退'],
  82,
  '面接をキャンセルしたい',
  '面接前のキャンセルは、マイページの https://www.yolo-japan.com/ja/recruit/mypage/application/' || utm || ' からできます。「お断りする」をクリックすると面接をキャンセルすることができます。\n\n面接のスケジュールを変えたい時は、自分で会社に連絡してください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_interview_location',
  ARRAY['面接場所', '場所', '詳細', 'interview', 'location'],
  81,
  '面接場所の詳細はどうやって確認できますか？',
  'マイページの https://www.yolo-japan.com/ja/recruit/mypage/interview/' || utm || ' から面接場所を確認することができます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_no_response',
  ARRAY['応募', '返事', 'ない', 'response', '来ない'],
  80,
  '色んな仕事に応募したが中々返事が来ないけどなんでですか？',
  '面接に進む人にだけ連絡がされます。応募から14日以内に連絡するようにお願いしているので、もう少し待っていてください。待っている間、もっと他の仕事に応募してみてください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_job_search',
  ARRAY['仕事', 'エリア', '職種', 'job', 'search', '探す'],
  79,
  '〇〇エリアに仕事はありますか？ / 〇〇職種の仕事はありますか？',
  'メニューにある「しごとをさがす」を使って仕事を探してください。こちらの特集ページも合わせてご覧ください https://www.yolo-japan.com/ja/recruit/feature/theme' || utm
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_tourist_visa',
  ARRAY['観光ビザ', '研修ビザ', '就労', 'tourist', 'visa', '働けない'],
  78,
  '観光ビザ、研修ビザ等就労できないビザを持ってて働きたい',
  'こちらのビザでは日本で働くことはできません。在留資格の詳しい内容は、出入国在留管理庁 https://www.moj.go.jp/isa/consultation/center/japanese.html に相談してください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_sofa',
  ARRAY['SOFA', 'ビザ', '基地', 'work'],
  77,
  'SOFAで働けますか？',
  'SOFAビザを持っている人は、基地の中でのみ働けます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_visa_sponsor',
  ARRAY['ビザ', 'スポンサー', 'sponsor', '採用'],
  76,
  '採用になったら企業からVISAをスポンサーしてもらえますか？',
  'YOLO JAPANには https://www.yolo-japan.com/ja/recruit/feature/visa_support_available' || utm || ' から、ビザサポートありの求人の特集があります。また、面接でスポンサーについて必ず聞いてください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_visa_change',
  ARRAY['ビザ', 'サポート', '切り替え', '留学ビザ', 'support'],
  75,
  'ビザをサポート(留学ビザなどからの切り替え)してほしい',
  'YOLO JAPANではビザに関するサポートはできません。 https://www.yolo-japan.com/ja/recruit/feature/visa_support_available' || utm || ' からビザサポートありの特集があるので見てください。そして、面接でスポンサーについて必ず聞いてください。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_questionnaire',
  ARRAY['アンケート', '当選', 'questionnaire', 'winner'],
  74,
  'アンケートに当選していますか？',
  'マイページと当選発表のお知らせから確認可能です。 https://www.yolo-japan.com/ja/recruit/mypage/winner/' || utm
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_privacy',
  ARRAY['個人情報', '流出', 'privacy', '漏洩'],
  73,
  'YOLO JAPANが個人情報を流出した？',
  '私たちは https://www.yolo-japan.co.jp/privacy_policy/' || utm || ' をもとに、情報を管理しています。関係のない会社にお情報を共有することはありません。応募した会社のみ、一部の情報を見ることができます。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_listing',
  ARRAY['求人掲載', '掲載', '企業', 'listing', '掲載したい'],
  72,
  '求人掲載したい',
  '求人を掲載したい企業向けのサイトはこちらです。 https://lp.yolo-work.com/consulting' || utm
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_error',
  ARRAY['エラー', 'セーブ', 'サインアップ', 'error', 'bug', '不具合'],
  50,
  '情報をセーブできない、サインアップできない等',
  'こちらの障害報告フォームの入力をお願いします。 https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform'
);

-- =====================================================
-- 共通FAQ
-- =====================================================

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'common_response_time',
  ARRAY['問い合わせ', '返信', '時間', 'response', '営業日'],
  40,
  '問い合わせの返信はどのくらいかかりますか？',
  '通常1-2営業日以内にご返信いたします。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'common_multilang',
  ARRAY['日本語以外', '言語', 'language', '英語', '中国語'],
  39,
  '日本語以外でも問い合わせできますか？',
  'はい、英語、中国語、韓国語、ベトナム語でも対応しています。'
);

PERFORM migrate_faq(
  'YOLO_JAPAN',
  'common_phone',
  ARRAY['電話', '問い合わせ', 'phone', 'call'],
  38,
  '電話での問い合わせはできますか？',
  '恐れ入りますが、現在お電話でのお問い合わせは受け付けておりません。'
);

END $$;
