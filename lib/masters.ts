// lib/masters.ts

// FAQ は OpenAI 用プロンプトとしてそのまま使える
export const FAQ_CONTENT = `
【在留カードについて】
Q: 在留カードの支援や更新は行っていますか？
A: 恐れ入りますが、現在在留カードの更新や支援は行っておりません。

Q: なぜ在留カードの登録が必要なんですか？アップロードしなくてもお仕事に応募できますか？
A: 就労可能な在留資格をお持ちか確認するため、お仕事に応募する際は、在留カードを必ずアップロードして頂く必要がございます。在留カード画像は企業に公開されることはありませんので、ご安心ください。

【登録・アカウントについて】
Q: パスワードを忘れました。
A: パスワードを忘れた方は、こちらより再設定いただけます。
https://www.yolo-japan.com/ja/recruit/reminder

Q: メールアドレスがわかりません。
A: YOLO JAPANへお問い合わせください。
https://www.yolo-japan.com/ja/inquiry/input

Q: プロフィール内容を変更したいです。
A: マイページから編集が可能です。

【仕事について】
Q: お仕事に応募するにはどうしたらよいですか？
A: アカウントをお持ちでない場合は、まずは登録をお願い致します。登録後、メールが届きますので、そちらから本登録をしてください。登録後、マイページボタンからプロフィール設定に進み必要な情報を入力してください。入力後、各求人詳細の応募ボタンから応募が可能になります。

Q: 採用までの流れを知りたいです。
A: こちらのURLをご確認ください。
https://www.yolo-japan.com/ja/about/flow/

Q: 海外から応募できますか？
A: 残念ながら現在、海外から応募することはできません。日本在住の外国人で就労可能な在留カードをお持ちの方、または日本永住者の方のみ応募ができます。

Q: 一度応募した求人にもう一度応募する事は可能ですか？
A: 残念ながら再応募はできません。他に興味のある求人がございましたら、求人内容をご確認の上ご応募下さい。

Q: 不採用になった理由が知りたいです。
A: YOLO JAPANは求人媒体ですので、企業側の選考状況に関しましては公開されておりませんのでご了承下さい。

【スカウトについて】
Q: スカウトとはなんですか？
A: あなたと面接したい企業がスカウトメールを送る機能です。スカウトをONにすることで企業からスカウトが届きます。

Q: スカウトがほしいです。どうしたらいいですか？
A: スカウトページでスカウトをONにしましょう。また、プロフィール情報、学歴・職歴、希望求人の条件をしっかり書くことが重要です。

Q: スカウトが来ました。どうしたらいいですか？
A: スカウト求人の内容を確認してください。面接をしたい場合は、その求人に応募してください。

Q: スカウトに期限はありますか？
A: 期限はありません。しかし、スカウト求人が募集終了になると応募ができなくなります。スカウトが届いたらできるだけ早く応募しましょう。

【面接について】
Q: 面接の日付・時間を変更したい
A: やむをえず、面接日を変更する場合は、面接日の1日前までに電話で直接連絡するようにしましょう。電話番号は「面接日程」ページで確認できます。電話が繋がらない場合は、面接日程ページ内メッセージ機能を使って連絡してください。

電話しやすい時間帯:
- 飲食店: 14:00～17:00
- 小売店: 14:00～16:00
- その他一般企業等: 受付時間を確認してください

Q: 面接当日、遅刻してしまう！
A: 日本では、時間を守ることはとても重要です。10分前行動を心掛けましょう。もしも、電車の遅延等で面接時間に遅れる場合は、できるだけ早く会社へ電話をかけましょう。電話番号は「面接日程」ページで確認できます。

Q: 面接をキャンセルしたい時
A: やむをえず、面接をキャンセルする場合は、面接日の1日前までに電話で直接連絡するようにしましょう。電話番号は「面接日程」ページで確認できます。

【しゃべる履歴書について】
Q: しゃべる履歴書とは何ですか？
A: しゃべる履歴書とは、あなたの人柄や興味のあること、お仕事へのやる気を企業に直接アピールすることができるビデオのことです。このビデオは企業の方も見ることができるので、プロフィールだけでは伝えられないあなたの魅力をアピールすることができます。

Q: 日本語で撮影しないとダメですか？
A: なまえ と どこの国 かは、日本語で はなしてください。

Q: しゃべる履歴書はどこでアップロードできますか？
A: ログイン後、マイページの「しゃべる履歴書」より撮影が可能です。PCの場合「アップロード」ボタンを押して、データを選んでください。携帯の場合は「アップロード」のボタンから撮影することもできます。

【モニターのお仕事について】
Q: お支払いはいつになりますか？
A: 求人によって違う場合がございますので求人の詳細をご確認下さい。

Q: お支払いに関するメールが届いてません。
A: メールの受信設定によっては、YOLO JAPANからのメールが届かない場合があります。受信設定をご確認の上、「迷惑フォルダ」に振り分けられていないかご確認ください。メールが届いていない場合はYOLO JAPANにお問い合わせください。

【重要なリンク】
- パスワード再設定: https://www.yolo-japan.com/ja/recruit/reminder
- お問い合わせ: https://www.yolo-japan.com/ja/inquiry/input
- 採用までの流れ: https://www.yolo-japan.com/ja/about/flow/
`;

// ------- 型定義（軽め） -------

export type LocalizedLabel = {
  label_ja: string;
  label_en: string;
  label_ko: string;
  label_zh: string;
  label_vi: string;
};

export type IndustryKey =
  | "food"
  | "building_maintenance"
  | "hotel_ryokan"
  | "retail_service"
  | "logistics_driver";

export type JapaneseLevelKey =
  | "no_japanese"
  | "n5"
  | "n4"
  | "n3"
  | "n2"
  | "n1";

export type WorkStyleKey = "fulltime" | "parttime" | "both";

export type RegionCode =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu";

export type PrefectureCode =
  | "hokkaido"
  | "aomori"
  | "iwate"
  | "miyagi"
  | "akita"
  | "yamagata"
  | "fukushima"
  | "tokyo"
  | "kanagawa"
  | "saitama"
  | "chiba"
  | "ibaraki"
  | "tochigi"
  | "gunma"
  | "aichi"
  | "shizuoka"
  | "gifu"
  | "niigata"
  | "nagano"
  | "yamanashi"
  | "ishikawa"
  | "toyama"
  | "fukui"
  | "osaka"
  | "kyoto"
  | "hyogo"
  | "nara"
  | "shiga"
  | "wakayama"
  | "hiroshima"
  | "okayama"
  | "yamaguchi"
  | "tottori"
  | "shimane"
  | "kagawa"
  | "ehime"
  | "kochi"
  | "tokushima"
  | "fukuoka"
  | "saga"
  | "nagasaki"
  | "kumamoto"
  | "oita"
  | "miyazaki"
  | "kagoshima"
  | "okinawa";

// ------- マスターデータ本体 -------

export type Prefecture = {
  code: PrefectureCode;
} & LocalizedLabel;

// 業界マスター
export const INDUSTRY_MASTER: Record<
  IndustryKey,
  { id: number; key: IndustryKey } & LocalizedLabel
> = {
  food: {
    id: 2,
    key: "food",
    label_ja: "🍴 飲食",
    label_en: "🍴 Food",
    label_ko: "🍴 식음료",
    label_zh: "🍴 餐饮",
    label_vi: "🍴 Ẩm thực",
  },
  building_maintenance: {
    id: 14,
    key: "building_maintenance",
    label_ja: "🧹 清掃・ビルメンテ",
    label_en: "🧹 Cleaning",
    label_ko: "🧹 청소",
    label_zh: "🧹 清洁",
    label_vi: "🧹 Vệ sinh",
  },
  hotel_ryokan: {
    id: 16,
    key: "hotel_ryokan",
    label_ja: "🏨 ホテル",
    label_en: "🏨 Hotel",
    label_ko: "🏨 호텔",
    label_zh: "🏨 酒店",
    label_vi: "🏨 Khách sạn",
  },
  retail_service: {
    id: 1,
    key: "retail_service",
    label_ja: "🛍️ 販売・サービス",
    label_en: "🛍️ Retail",
    label_ko: "🛍️ 소매",
    label_zh: "🛍️ 零售",
    label_vi: "🛍️ Bán lẻ",
  },
  logistics_driver: {
    id: 4,
    key: "logistics_driver",
    label_ja: "🚚 物流・ドライバー",
    label_en: "🚚 Logistics",
    label_ko: "🚚 물류",
    label_zh: "🚚 物流",
    label_vi: "🚚 Logistics",
  },
};

// 日本語レベル
export const JAPANESE_LEVEL: Record<
  JapaneseLevelKey,
  {
    code: JapaneseLevelKey;
    urlParam: string;
  } & LocalizedLabel
> = {
  no_japanese: {
    code: "no_japanese",
    urlParam: "n6",
    label_ja: "話せない",
    label_en: "Cannot speak",
    label_ko: "못 함",
    label_zh: "不会说",
    label_vi: "Không nói được",
  },
  n5: {
    code: "n5",
    urlParam: "n5",
    label_ja: "N5",
    label_en: "N5",
    label_ko: "N5",
    label_zh: "N5",
    label_vi: "N5",
  },
  n4: {
    code: "n4",
    urlParam: "n4",
    label_ja: "N4",
    label_en: "N4",
    label_ko: "N4",
    label_zh: "N4",
    label_vi: "N4",
  },
  n3: {
    code: "n3",
    urlParam: "n3",
    label_ja: "N3",
    label_en: "N3",
    label_ko: "N3",
    label_zh: "N3",
    label_vi: "N3",
  },
  n2: {
    code: "n2",
    urlParam: "n2",
    label_ja: "N2",
    label_en: "N2",
    label_ko: "N2",
    label_zh: "N2",
    label_vi: "N2",
  },
  n1: {
    code: "n1",
    urlParam: "n1",
    label_ja: "N1",
    label_en: "N1",
    label_ko: "N1",
    label_zh: "N1",
    label_vi: "N1",
  },
};

// 雇用形態
export const WORK_STYLE: Record<
  WorkStyleKey,
  { key: WorkStyleKey; param: string } & LocalizedLabel
> = {
  fulltime: {
    key: "fulltime",
    param: "fulltime",
    label_ja: "正社員",
    label_en: "Full-time",
    label_ko: "정규직",
    label_zh: "全职",
    label_vi: "Toàn thời gian",
  },
  parttime: {
    key: "parttime",
    param: "parttime",
    label_ja: "アルバイト・パート",
    label_en: "Part-time",
    label_ko: "아르바이트",
    label_zh: "兼职",
    label_vi: "Bán thời gian",
  },
  both: {
    key: "both",
    param: "both",
    label_ja: "どちらも",
    label_en: "Both",
    label_ko: "둘 다",
    label_zh: "都可以",
    label_vi: "Cả hai",
  },
};

// 主要都府県
export const MAJOR_PREFECTURES = {
  tokyo: {
    code: "tokyo" as PrefectureCode,
    label_ja: "東京都",
    label_en: "Tokyo",
    label_ko: "도쿄",
    label_zh: "东京",
    label_vi: "Tokyo",
    region: "kanto" as RegionCode,
  },
  osaka: {
    code: "osaka" as PrefectureCode,
    label_ja: "大阪府",
    label_en: "Osaka",
    label_ko: "오사카",
    label_zh: "大阪",
    label_vi: "Osaka",
    region: "kansai" as RegionCode,
  },
  kyoto: {
    code: "kyoto" as PrefectureCode,
    label_ja: "京都府",
    label_en: "Kyoto",
    label_ko: "교토",
    label_zh: "京都",
    label_vi: "Kyoto",
    region: "kansai" as RegionCode,
  },
  saitama: {
    code: "saitama" as PrefectureCode,
    label_ja: "埼玉県",
    label_en: "Saitama",
    label_ko: "사이타마",
    label_zh: "埼玉",
    label_vi: "Saitama",
    region: "kanto" as RegionCode,
  },
  kanagawa: {
    code: "kanagawa" as PrefectureCode,
    label_ja: "神奈川県",
    label_en: "Kanagawa",
    label_ko: "가나가와",
    label_zh: "神奈川",
    label_vi: "Kanagawa",
    region: "kanto" as RegionCode,
  },
  chiba: {
    code: "chiba" as PrefectureCode,
    label_ja: "千葉県",
    label_en: "Chiba",
    label_ko: "지바",
    label_zh: "千叶",
    label_vi: "Chiba",
    region: "kanto" as RegionCode,
  },
} as const;

// 地方
export const REGION_MASTER: Record<
  RegionCode,
  { code: RegionCode } & LocalizedLabel
> = {
  hokkaido: {
    code: "hokkaido",
    label_ja: "北海道",
    label_en: "Hokkaido",
    label_ko: "홋카이도",
    label_zh: "北海道",
    label_vi: "Hokkaido",
  },
  tohoku: {
    code: "tohoku",
    label_ja: "東北",
    label_en: "Tohoku",
    label_ko: "도호쿠",
    label_zh: "东北",
    label_vi: "Tohoku",
  },
  kanto: {
    code: "kanto",
    label_ja: "関東",
    label_en: "Kanto",
    label_ko: "간토",
    label_zh: "关东",
    label_vi: "Kanto",
  },
  chubu: {
    code: "chubu",
    label_ja: "中部",
    label_en: "Chubu",
    label_ko: "주부",
    label_zh: "中部",
    label_vi: "Chubu",
  },
  kansai: {
    code: "kansai",
    label_ja: "関西",
    label_en: "Kansai",
    label_ko: "간사이",
    label_zh: "关西",
    label_vi: "Kansai",
  },
  chugoku: {
    code: "chugoku",
    label_ja: "中国",
    label_en: "Chugoku",
    label_ko: "주고쿠",
    label_zh: "中国地区",
    label_vi: "Chugoku",
  },
  shikoku: {
    code: "shikoku",
    label_ja: "四国",
    label_en: "Shikoku",
    label_ko: "시코쿠",
    label_zh: "四国",
    label_vi: "Shikoku",
  },
  kyushu: {
    code: "kyushu",
    label_ja: "九州・沖縄",
    label_en: "Kyushu/Okinawa",
    label_ko: "규슈/오키나와",
    label_zh: "九州/冲绳",
    label_vi: "Kyushu/Okinawa",
  },
};

// 地方ごとの都道府県
export const PREFECTURE_BY_REGION: Record<RegionCode, Prefecture[]> = {

  hokkaido: [
    {
      code: "hokkaido",
      label_ja: "北海道",
      label_en: "Hokkaido",
      label_ko: "홋카이도",
      label_zh: "北海道",
      label_vi: "Hokkaido",
    },
  ],
  tohoku: [
    {
      code: "aomori",
      label_ja: "青森県",
      label_en: "Aomori",
      label_ko: "아오모리",
      label_zh: "青森",
      label_vi: "Aomori",
    },
    {
      code: "iwate",
      label_ja: "岩手県",
      label_en: "Iwate",
      label_ko: "이와테",
      label_zh: "岩手",
      label_vi: "Iwate",
    },
    {
      code: "miyagi",
      label_ja: "宮城県",
      label_en: "Miyagi",
      label_ko: "미야기",
      label_zh: "宫城",
      label_vi: "Miyagi",
    },
    {
      code: "akita",
      label_ja: "秋田県",
      label_en: "Akita",
      label_ko: "아키타",
      label_zh: "秋田",
      label_vi: "Akita",
    },
    {
      code: "yamagata",
      label_ja: "山形県",
      label_en: "Yamagata",
      label_ko: "야마가타",
      label_zh: "山形",
      label_vi: "Yamagata",
    },
    {
      code: "fukushima",
      label_ja: "福島県",
      label_en: "Fukushima",
      label_ko: "후쿠시마",
      label_zh: "福岛",
      label_vi: "Fukushima",
    },
  ],
  kanto: [
    {
      code: "tokyo",
      label_ja: "東京都",
      label_en: "Tokyo",
      label_ko: "도쿄",
      label_zh: "东京",
      label_vi: "Tokyo",
    },
    {
      code: "kanagawa",
      label_ja: "神奈川県",
      label_en: "Kanagawa",
      label_ko: "가나가와",
      label_zh: "神奈川",
      label_vi: "Kanagawa",
    },
    {
      code: "saitama",
      label_ja: "埼玉県",
      label_en: "Saitama",
      label_ko: "사이타마",
      label_zh: "埼玉",
      label_vi: "Saitama",
    },
    {
      code: "chiba",
      label_ja: "千葉県",
      label_en: "Chiba",
      label_ko: "지바",
      label_zh: "千叶",
      label_vi: "Chiba",
    },
    {
      code: "ibaraki",
      label_ja: "茨城県",
      label_en: "Ibaraki",
      label_ko: "이바라키",
      label_zh: "茨城",
      label_vi: "Ibaraki",
    },
    {
      code: "tochigi",
      label_ja: "栃木県",
      label_en: "Tochigi",
      label_ko: "도치기",
      label_zh: "栃木",
      label_vi: "Tochigi",
    },
    {
      code: "gunma",
      label_ja: "群馬県",
      label_en: "Gunma",
      label_ko: "군마",
      label_zh: "群马",
      label_vi: "Gunma",
    },
  ],
  chubu: [
    {
      code: "aichi",
      label_ja: "愛知県",
      label_en: "Aichi",
      label_ko: "아이치",
      label_zh: "爱知",
      label_vi: "Aichi",
    },
    {
      code: "shizuoka",
      label_ja: "静岡県",
      label_en: "Shizuoka",
      label_ko: "시즈오카",
      label_zh: "静冈",
      label_vi: "Shizuoka",
    },
    {
      code: "gifu",
      label_ja: "岐阜県",
      label_en: "Gifu",
      label_ko: "기후",
      label_zh: "岐阜",
      label_vi: "Gifu",
    },
    {
      code: "niigata",
      label_ja: "新潟県",
      label_en: "Niigata",
      label_ko: "니가타",
      label_zh: "新潟",
      label_vi: "Niigata",
    },
    {
      code: "nagano",
      label_ja: "長野県",
      label_en: "Nagano",
      label_ko: "나가노",
      label_zh: "长野",
      label_vi: "Nagano",
    },
    {
      code: "yamanashi",
      label_ja: "山梨県",
      label_en: "Yamanashi",
      label_ko: "야마나시",
      label_zh: "山梨",
      label_vi: "Yamanashi",
    },
    {
      code: "ishikawa",
      label_ja: "石川県",
      label_en: "Ishikawa",
      label_ko: "이시카와",
      label_zh: "石川",
      label_vi: "Ishikawa",
    },
    {
      code: "toyama",
      label_ja: "富山県",
      label_en: "Toyama",
      label_ko: "도야마",
      label_zh: "富山",
      label_vi: "Toyama",
    },
    {
      code: "fukui",
      label_ja: "福井県",
      label_en: "Fukui",
      label_ko: "후쿠이",
      label_zh: "福井",
      label_vi: "Fukui",
    },
  ],
  kansai: [
    {
      code: "osaka",
      label_ja: "大阪府",
      label_en: "Osaka",
      label_ko: "오사카",
      label_zh: "大阪",
      label_vi: "Osaka",
    },
    {
      code: "kyoto",
      label_ja: "京都府",
      label_en: "Kyoto",
      label_ko: "교토",
      label_zh: "京都",
      label_vi: "Kyoto",
    },
    {
      code: "hyogo",
      label_ja: "兵庫県",
      label_en: "Hyogo",
      label_ko: "효고",
      label_zh: "兵库",
      label_vi: "Hyogo",
    },
    {
      code: "nara",
      label_ja: "奈良県",
      label_en: "Nara",
      label_ko: "나라",
      label_zh: "奈良",
      label_vi: "Nara",
    },
    {
      code: "shiga",
      label_ja: "滋賀県",
      label_en: "Shiga",
      label_ko: "시가",
      label_zh: "滋贺",
      label_vi: "Shiga",
    },
    {
      code: "wakayama",
      label_ja: "和歌山県",
      label_en: "Wakayama",
      label_ko: "와카야마",
      label_zh: "和歌山",
      label_vi: "Wakayama",
    },
  ],
  chugoku: [
    {
      code: "hiroshima",
      label_ja: "広島県",
      label_en: "Hiroshima",
      label_ko: "히로시마",
      label_zh: "广岛",
      label_vi: "Hiroshima",
    },
    {
      code: "okayama",
      label_ja: "岡山県",
      label_en: "Okayama",
      label_ko: "오카야마",
      label_zh: "冈山",
      label_vi: "Okayama",
    },
    {
      code: "yamaguchi",
      label_ja: "山口県",
      label_en: "Yamaguchi",
      label_ko: "야마구치",
      label_zh: "山口",
      label_vi: "Yamaguchi",
    },
    {
      code: "tottori",
      label_ja: "鳥取県",
      label_en: "Tottori",
      label_ko: "돗토리",
      label_zh: "鸟取",
      label_vi: "Tottori",
    },
    {
      code: "shimane",
      label_ja: "島根県",
      label_en: "Shimane",
      label_ko: "시마네",
      label_zh: "岛根",
      label_vi: "Shimane",
    },
  ],
  shikoku: [
    {
      code: "kagawa",
      label_ja: "香川県",
      label_en: "Kagawa",
      label_ko: "가가와",
      label_zh: "香川",
      label_vi: "Kagawa",
    },
    {
      code: "ehime",
      label_ja: "愛媛県",
      label_en: "Ehime",
      label_ko: "에히메",
      label_zh: "爱媛",
      label_vi: "Ehime",
    },
    {
      code: "kochi",
      label_ja: "高知県",
      label_en: "Kochi",
      label_ko: "고치",
      label_zh: "高知",
      label_vi: "Kochi",
    },
    {
      code: "tokushima",
      label_ja: "徳島県",
      label_en: "Tokushima",
      label_ko: "도쿠시마",
      label_zh: "德岛",
      label_vi: "Tokushima",
    },
  ],
  kyushu: [
    {
      code: "fukuoka",
      label_ja: "福岡県",
      label_en: "Fukuoka",
      label_ko: "후쿠오카",
      label_zh: "福冈",
      label_vi: "Fukuoka",
    },
    {
      code: "saga",
      label_ja: "佐賀県",
      label_en: "Saga",
      label_ko: "사가",
      label_zh: "佐贺",
      label_vi: "Saga",
    },
    {
      code: "nagasaki",
      label_ja: "長崎県",
      label_en: "Nagasaki",
      label_ko: "나가사키",
      label_zh: "长崎",
      label_vi: "Nagasaki",
    },
    {
      code: "kumamoto",
      label_ja: "熊本県",
      label_en: "Kumamoto",
      label_ko: "구마모토",
      label_zh: "熊本",
      label_vi: "Kumamoto",
    },
    {
      code: "oita",
      label_ja: "大分県",
      label_en: "Oita",
      label_ko: "오이타",
      label_zh: "大分",
      label_vi: "Oita",
    },
    {
      code: "miyazaki",
      label_ja: "宮崎県",
      label_en: "Miyazaki",
      label_ko: "미야자키",
      label_zh: "宫崎",
      label_vi: "Miyazaki",
    },
    {
      code: "kagoshima",
      label_ja: "鹿児島県",
      label_en: "Kagoshima",
      label_ko: "가고시마",
      label_zh: "鹿儿岛",
      label_vi: "Kagoshima",
    },
    {
      code: "okinawa",
      label_ja: "沖縄県",
      label_en: "Okinawa",
      label_ko: "오키나와",
      label_zh: "冲绳",
      label_vi: "Okinawa",
    },
  ],
};
