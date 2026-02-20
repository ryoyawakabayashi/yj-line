// =====================================================
// キャリアタイプ診断 - 静的データ定義
// 8問A/B二択 → 4文字コード(16タイプ) → 業界推薦
// =====================================================

/**
 * 4軸の定義:
 * 軸1: G(Group/チーム) vs L(Lone/一人)  → Q1, Q2
 * 軸2: A(Active/体動かす) vs D(Desk/デスク) → Q3, Q4
 * 軸3: R(Regular/ルーティン) vs V(Variety/変化) → Q5, Q6
 * 軸4: J(Japanese/日本語OK) vs O(Open/ラク希望) → Q7, Q8
 *
 * 同点時は奇数Q（Q1/Q3/Q5/Q7）を優先
 */

type Lang5 = Record<string, string>; // ja, en, ko, zh, vi

export interface CareerQuestion {
  id: number;
  axis: number; // 1-4
  question: Lang5;
  optionA: Lang5;
  optionB: Lang5;
}

export interface CareerTypeInfo {
  code: string;
  title: Lang5;
  description: Lang5;
  industries: Array<{
    id: string;
    name: Lang5;
    examples: Lang5;
  }>;
}

// =====================================================
// 8問の質問定義
// =====================================================
export const CAREER_QUESTIONS: CareerQuestion[] = [
  // --- 軸1: G vs L (チーム vs 一人) ---
  {
    id: 1,
    axis: 1,
    question: {
      ja: 'しごとで、どちらが好きですか？',
      en: 'Which do you prefer at work?',
      ko: '직장에서 어떤 것을 선호하시나요?',
      zh: '在工作中，你更喜欢哪个？',
      vi: 'Bạn thích cái nào hơn ở nơi làm việc?',
    },
    optionA: {
      ja: 'みんなで いっしょに はたらく',
      en: 'Working together with everyone',
      ko: '모두와 함께 일하기',
      zh: '和大家一起工作',
      vi: 'Làm việc cùng mọi người',
    },
    optionB: {
      ja: 'ひとりで しずかに はたらく',
      en: 'Working quietly by myself',
      ko: '혼자 조용히 일하기',
      zh: '一个人安静地工作',
      vi: 'Làm việc một mình yên tĩnh',
    },
  },
  {
    id: 2,
    axis: 1,
    question: {
      ja: 'ひるやすみは、どちらが好きですか？',
      en: 'What do you prefer during lunch break?',
      ko: '점심시간에 어떤 것을 선호하시나요?',
      zh: '午休时你更喜欢哪个？',
      vi: 'Bạn thích cái nào hơn vào giờ nghỉ trưa?',
    },
    optionA: {
      ja: 'みんなで はなす',
      en: 'Chatting with everyone',
      ko: '모두와 이야기하기',
      zh: '和大家聊天',
      vi: 'Nói chuyện với mọi người',
    },
    optionB: {
      ja: 'ひとりで ゆっくりする',
      en: 'Relaxing alone',
      ko: '혼자 쉬기',
      zh: '一个人放松',
      vi: 'Nghỉ ngơi một mình',
    },
  },
  // --- 軸2: A vs D (体動かす vs デスク) ---
  {
    id: 3,
    axis: 2,
    question: {
      ja: 'どちらの しごとが いいですか？',
      en: 'Which type of work do you prefer?',
      ko: '어떤 종류의 일을 선호하시나요?',
      zh: '你更喜欢哪种工作？',
      vi: 'Bạn thích loại công việc nào hơn?',
    },
    optionA: {
      ja: 'からだを うごかす しごと',
      en: 'Physical work',
      ko: '몸을 움직이는 일',
      zh: '活动身体的工作',
      vi: 'Công việc vận động',
    },
    optionB: {
      ja: 'すわって やる しごと',
      en: 'Desk work',
      ko: '앉아서 하는 일',
      zh: '坐着做的工作',
      vi: 'Công việc ngồi bàn',
    },
  },
  {
    id: 4,
    axis: 2,
    question: {
      ja: 'やすみの日は、どちらが好きですか？',
      en: 'What do you prefer on days off?',
      ko: '쉬는 날에 어떤 것을 선호하시나요?',
      zh: '休息日你更喜欢哪个？',
      vi: 'Ngày nghỉ bạn thích cái nào hơn?',
    },
    optionA: {
      ja: 'そとで あそぶ・うんどうする',
      en: 'Going out / exercising',
      ko: '밖에서 놀기 / 운동하기',
      zh: '出去玩/运动',
      vi: 'Ra ngoài chơi / tập thể dục',
    },
    optionB: {
      ja: 'いえで のんびりする',
      en: 'Relaxing at home',
      ko: '집에서 쉬기',
      zh: '在家休息',
      vi: 'Ở nhà thư giãn',
    },
  },
  // --- 軸3: R vs V (ルーティン vs 変化) ---
  {
    id: 5,
    axis: 3,
    question: {
      ja: 'まいにちの しごとは、どちらが いいですか？',
      en: 'Which daily work style do you prefer?',
      ko: '매일의 업무는 어떤 것을 선호하시나요?',
      zh: '你更喜欢哪种日常工作方式？',
      vi: 'Bạn thích phong cách làm việc hàng ngày nào?',
    },
    optionA: {
      ja: 'おなじことを くりかえす',
      en: 'Repeating the same tasks',
      ko: '같은 일을 반복하기',
      zh: '重复同样的事情',
      vi: 'Lặp lại công việc giống nhau',
    },
    optionB: {
      ja: 'まいにち ちがうことを する',
      en: 'Doing different things every day',
      ko: '매일 다른 일 하기',
      zh: '每天做不同的事情',
      vi: 'Làm việc khác nhau mỗi ngày',
    },
  },
  {
    id: 6,
    axis: 3,
    question: {
      ja: 'どちらの やりかたが 好きですか？',
      en: 'Which approach do you prefer?',
      ko: '어떤 방식을 선호하시나요?',
      zh: '你更喜欢哪种方式？',
      vi: 'Bạn thích cách nào hơn?',
    },
    optionA: {
      ja: 'マニュアルどおりに やる',
      en: 'Following a manual',
      ko: '매뉴얼대로 하기',
      zh: '按照手册做',
      vi: 'Làm theo hướng dẫn',
    },
    optionB: {
      ja: 'じぶんで かんがえて やる',
      en: 'Thinking and doing by myself',
      ko: '스스로 생각해서 하기',
      zh: '自己思考着做',
      vi: 'Tự suy nghĩ và làm',
    },
  },
  // --- 軸4: J vs O (日本語OK vs ラク希望) ---
  {
    id: 7,
    axis: 4,
    question: {
      ja: 'にほんごを つかう しごとは どうですか？',
      en: 'How do you feel about using Japanese at work?',
      ko: '일본어를 사용하는 일은 어떠세요?',
      zh: '使用日语的工作你觉得怎么样？',
      vi: 'Bạn nghĩ thế nào về công việc sử dụng tiếng Nhật?',
    },
    optionA: {
      ja: 'にほんごを つかいたい',
      en: 'I want to use Japanese',
      ko: '일본어를 사용하고 싶어요',
      zh: '想使用日语',
      vi: 'Muốn sử dụng tiếng Nhật',
    },
    optionB: {
      ja: 'にほんごは すくないほうがいい',
      en: 'Less Japanese is better',
      ko: '일본어가 적은 게 좋아요',
      zh: '日语少一点比较好',
      vi: 'Ít tiếng Nhật hơn thì tốt',
    },
  },
  {
    id: 8,
    axis: 4,
    question: {
      ja: 'しごとで にほんごを もっと じょうずに なりたいですか？',
      en: 'Do you want to improve your Japanese through work?',
      ko: '일을 통해 일본어를 더 잘하고 싶으세요?',
      zh: '你想通过工作提高日语水平吗？',
      vi: 'Bạn có muốn cải thiện tiếng Nhật qua công việc không?',
    },
    optionA: {
      ja: 'はい、にほんごが じょうずに なりたい',
      en: 'Yes, I want to get better',
      ko: '네, 일본어를 잘하고 싶어요',
      zh: '是的，想提高日语',
      vi: 'Có, muốn giỏi tiếng Nhật hơn',
    },
    optionB: {
      ja: 'いいえ、にほんご なしでも いい',
      en: 'No, it\'s fine without Japanese',
      ko: '아니요, 일본어 없어도 괜찮아요',
      zh: '不用，没有日语也行',
      vi: 'Không, không cần tiếng Nhật cũng được',
    },
  },
];

// =====================================================
// 業界マスターデータ（YOLO JAPAN サイトID対応）
// =====================================================
const INDUSTRIES: Record<string, { id: string; name: Lang5; examples: Lang5 }> = {
  food: {
    id: '2',
    name: {
      ja: '飲食',
      en: 'Food & Restaurant',
      ko: '음식점',
      zh: '餐饮',
      vi: 'Nhà hàng',
    },
    examples: {
      ja: 'レストラン、キッチン、カフェ',
      en: 'Restaurant, kitchen, cafe',
      ko: '레스토랑, 주방, 카페',
      zh: '餐厅、厨房、咖啡店',
      vi: 'Nhà hàng, bếp, quán cà phê',
    },
  },
  hotel: {
    id: '16',
    name: {
      ja: 'ホテル・旅館',
      en: 'Hotel & Ryokan',
      ko: '호텔·료칸',
      zh: '酒店·旅馆',
      vi: 'Khách sạn',
    },
    examples: {
      ja: 'フロント、客室清掃、接客',
      en: 'Front desk, housekeeping, service',
      ko: '프런트, 객실 청소, 접객',
      zh: '前台、客房清洁、服务',
      vi: 'Lễ tân, dọn phòng, phục vụ',
    },
  },
  retail: {
    id: '1',
    name: {
      ja: '販売・サービス',
      en: 'Retail & Service',
      ko: '판매·서비스',
      zh: '零售·服务',
      vi: 'Bán hàng & Dịch vụ',
    },
    examples: {
      ja: 'コンビニ、スーパー、ドラッグストア',
      en: 'Convenience store, supermarket, drugstore',
      ko: '편의점, 슈퍼마켓, 드럭스토어',
      zh: '便利店、超市、药妆店',
      vi: 'Cửa hàng tiện lợi, siêu thị',
    },
  },
  cleaning: {
    id: '14',
    name: {
      ja: '清掃・ビルメンテナンス',
      en: 'Cleaning & Building Maintenance',
      ko: '청소·빌딩 관리',
      zh: '清洁·楼宇维护',
      vi: 'Vệ sinh & Bảo trì tòa nhà',
    },
    examples: {
      ja: 'ビル清掃、施設メンテナンス',
      en: 'Building cleaning, facility maintenance',
      ko: '빌딩 청소, 시설 관리',
      zh: '建筑清洁、设施维护',
      vi: 'Vệ sinh tòa nhà, bảo trì',
    },
  },
  medical: {
    id: '8',
    name: {
      ja: '医療・福祉・介護',
      en: 'Medical & Nursing Care',
      ko: '의료·복지·간호',
      zh: '医疗·福利·护理',
      vi: 'Y tế & Chăm sóc',
    },
    examples: {
      ja: '介護スタッフ、福祉施設',
      en: 'Care staff, welfare facility',
      ko: '간호 직원, 복지 시설',
      zh: '护理人员、福利设施',
      vi: 'Nhân viên chăm sóc, cơ sở phúc lợi',
    },
  },
  logistics: {
    id: '13',
    name: {
      ja: '流通・小売り',
      en: 'Distribution & Retail',
      ko: '유통·소매',
      zh: '流通·零售',
      vi: 'Phân phối & Bán lẻ',
    },
    examples: {
      ja: '倉庫、仕分け、ピッキング',
      en: 'Warehouse, sorting, picking',
      ko: '창고, 분류, 피킹',
      zh: '仓库、分拣、拣货',
      vi: 'Kho, phân loại, chọn hàng',
    },
  },
  transport: {
    id: '4',
    name: {
      ja: '物流・ドライバー',
      en: 'Transport & Driver',
      ko: '물류·드라이버',
      zh: '物流·司机',
      vi: 'Vận tải & Lái xe',
    },
    examples: {
      ja: '配送、ドライバー、物流センター',
      en: 'Delivery, driver, logistics center',
      ko: '배송, 드라이버, 물류 센터',
      zh: '配送、司机、物流中心',
      vi: 'Giao hàng, lái xe, trung tâm logistics',
    },
  },
  manufacturing: {
    id: '5',
    name: {
      ja: '製造',
      en: 'Manufacturing',
      ko: '제조',
      zh: '制造',
      vi: 'Sản xuất',
    },
    examples: {
      ja: '工場、組立、検品',
      en: 'Factory, assembly, inspection',
      ko: '공장, 조립, 검품',
      zh: '工厂、组装、检验',
      vi: 'Nhà máy, lắp ráp, kiểm tra',
    },
  },
  construction: {
    id: '12',
    name: {
      ja: '土木・建築',
      en: 'Construction',
      ko: '토목·건축',
      zh: '土木·建筑',
      vi: 'Xây dựng',
    },
    examples: {
      ja: '建設現場、内装、設備',
      en: 'Construction site, interior, equipment',
      ko: '건설 현장, 인테리어, 설비',
      zh: '建筑工地、室内装修、设备',
      vi: 'Công trường, nội thất, thiết bị',
    },
  },
  security: {
    id: '15',
    name: {
      ja: '警備・セキュリティ',
      en: 'Security',
      ko: '경비·보안',
      zh: '保安',
      vi: 'Bảo vệ',
    },
    examples: {
      ja: '施設警備、交通整理',
      en: 'Facility security, traffic control',
      ko: '시설 경비, 교통 정리',
      zh: '设施保安、交通管理',
      vi: 'Bảo vệ cơ sở, điều phối giao thông',
    },
  },
  education: {
    id: '7',
    name: {
      ja: '教育・人材サービス',
      en: 'Education & HR',
      ko: '교육·인재 서비스',
      zh: '教育·人才服务',
      vi: 'Giáo dục & Nhân sự',
    },
    examples: {
      ja: '語学講師、通訳、研修',
      en: 'Language instructor, interpreter, training',
      ko: '어학 강사, 통역, 연수',
      zh: '语言教师、口译、培训',
      vi: 'Giảng viên ngôn ngữ, phiên dịch',
    },
  },
  it: {
    id: '11',
    name: {
      ja: 'IT・通信・インターネット',
      en: 'IT & Internet',
      ko: 'IT·통신·인터넷',
      zh: 'IT·通信·互联网',
      vi: 'IT & Internet',
    },
    examples: {
      ja: 'エンジニア、デザイナー、サポート',
      en: 'Engineer, designer, support',
      ko: '엔지니어, 디자이너, 서포트',
      zh: '工程师、设计师、技术支持',
      vi: 'Kỹ sư, thiết kế, hỗ trợ',
    },
  },
  media: {
    id: '18',
    name: {
      ja: 'マスコミ・広告・デザイン',
      en: 'Media & Design',
      ko: '미디어·광고·디자인',
      zh: '媒体·广告·设计',
      vi: 'Truyền thông & Thiết kế',
    },
    examples: {
      ja: '広告制作、Webデザイン、翻訳',
      en: 'Ad production, web design, translation',
      ko: '광고 제작, 웹 디자인, 번역',
      zh: '广告制作、网页设计、翻译',
      vi: 'Sản xuất quảng cáo, thiết kế web',
    },
  },
  trading: {
    id: '17',
    name: {
      ja: '商社・金融',
      en: 'Trading & Finance',
      ko: '상사·금융',
      zh: '商社·金融',
      vi: 'Thương mại & Tài chính',
    },
    examples: {
      ja: '貿易事務、営業、金融サービス',
      en: 'Trade office, sales, financial services',
      ko: '무역 사무, 영업, 금융 서비스',
      zh: '贸易事务、营业、金融服务',
      vi: 'Văn phòng thương mại, kinh doanh',
    },
  },
  environment: {
    id: '19',
    name: {
      ja: '環境・エネルギー',
      en: 'Environment & Energy',
      ko: '환경·에너지',
      zh: '环境·能源',
      vi: 'Môi trường & Năng lượng',
    },
    examples: {
      ja: 'リサイクル、エネルギー関連',
      en: 'Recycling, energy related',
      ko: '리사이클링, 에너지 관련',
      zh: '回收、能源相关',
      vi: 'Tái chế, năng lượng',
    },
  },
  agriculture: {
    id: '20',
    name: {
      ja: '農業・漁業・林業',
      en: 'Agriculture & Fishery',
      ko: '농업·어업·임업',
      zh: '农业·渔业·林业',
      vi: 'Nông nghiệp & Ngư nghiệp',
    },
    examples: {
      ja: '農作業、水産加工、林業',
      en: 'Farming, fishery processing, forestry',
      ko: '농작업, 수산 가공, 임업',
      zh: '农业、水产加工、林业',
      vi: 'Canh tác, chế biến thủy sản',
    },
  },
  other: {
    id: '6',
    name: {
      ja: 'その他',
      en: 'Other',
      ko: '기타',
      zh: '其他',
      vi: 'Khác',
    },
    examples: {
      ja: 'イベント、アンケート、軽作業',
      en: 'Events, surveys, light work',
      ko: '이벤트, 설문, 경작업',
      zh: '活动、问卷、轻作业',
      vi: 'Sự kiện, khảo sát, việc nhẹ',
    },
  },
};

// =====================================================
// 16タイプ定義 + 業界マッピング
// =====================================================
export const CAREER_TYPES: Record<string, CareerTypeInfo> = {
  GARJ: {
    code: 'GARJ',
    title: {
      ja: 'チームで動く おせわタイプ',
      en: 'Team-Player Care Type',
      ko: '팀으로 움직이는 배려 타입',
      zh: '团队行动 关怀型',
      vi: 'Kiểu chăm sóc làm việc nhóm',
    },
    description: {
      ja: 'チームワークが好きで、からだを動かしながら、きまった仕事をコツコツできる。にほんごも使いたい人。',
      en: 'You like teamwork, staying active, and doing steady routine work. You also want to use Japanese.',
      ko: '팀워크를 좋아하고, 몸을 움직이면서 정해진 일을 꾸준히 할 수 있는 타입. 일본어도 사용하고 싶은 분.',
      zh: '喜欢团队合作，活动身体，踏实做固定工作。也想使用日语。',
      vi: 'Thích làm việc nhóm, vận động, làm công việc đều đặn. Cũng muốn dùng tiếng Nhật.',
    },
    industries: [INDUSTRIES.medical, INDUSTRIES.food, INDUSTRIES.hotel],
  },
  GARO: {
    code: 'GARO',
    title: {
      ja: 'チームで動く ものづくりタイプ',
      en: 'Team-Player Builder Type',
      ko: '팀으로 움직이는 제조 타입',
      zh: '团队行动 制造型',
      vi: 'Kiểu sản xuất làm việc nhóm',
    },
    description: {
      ja: 'チームでからだを動かして、きまった仕事をやりたい人。にほんごは少なくてもOK。',
      en: 'You want to work physically in a team with routine tasks. OK with less Japanese.',
      ko: '팀으로 몸을 움직이면서 정해진 일을 하고 싶은 타입. 일본어 적어도 OK.',
      zh: '想在团队中活动身体做固定工作。日语少一点也OK。',
      vi: 'Muốn làm việc thể chất trong nhóm với công việc cố định. Ít tiếng Nhật cũng OK.',
    },
    industries: [INDUSTRIES.manufacturing, INDUSTRIES.transport, INDUSTRIES.construction],
  },
  GAVJ: {
    code: 'GAVJ',
    title: {
      ja: 'チームで動く おもてなしタイプ',
      en: 'Team-Player Hospitality Type',
      ko: '팀으로 움직이는 환대 타입',
      zh: '团队行动 款待型',
      vi: 'Kiểu tiếp đãi làm việc nhóm',
    },
    description: {
      ja: 'チームで働き、からだを動かしながら、毎日ちがう仕事を楽しめる人。にほんごOK。',
      en: 'You enjoy teamwork, staying active, and variety every day. You\'re OK with Japanese.',
      ko: '팀으로 일하며 몸을 움직이면서 매일 다른 일을 즐기는 타입. 일본어 OK.',
      zh: '喜欢团队工作，活动身体，享受每天不同的工作。日语OK。',
      vi: 'Thích làm việc nhóm, vận động, mỗi ngày làm việc khác nhau. Tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.food, INDUSTRIES.hotel, INDUSTRIES.retail],
  },
  GAVO: {
    code: 'GAVO',
    title: {
      ja: 'チームで動く アウトドアタイプ',
      en: 'Team-Player Outdoor Type',
      ko: '팀으로 움직이는 아웃도어 타입',
      zh: '团队行动 户外型',
      vi: 'Kiểu ngoài trời làm việc nhóm',
    },
    description: {
      ja: 'チームでからだを動かし、変化ある仕事が好き。にほんごなしでも大丈夫。',
      en: 'You like working physically in a team with variety. OK without Japanese.',
      ko: '팀으로 몸을 움직이며 변화 있는 일을 좋아하는 타입. 일본어 없어도 OK.',
      zh: '喜欢在团队中活动身体，喜欢有变化的工作。没有日语也OK。',
      vi: 'Thích vận động trong nhóm với công việc đa dạng. Không cần tiếng Nhật.',
    },
    industries: [INDUSTRIES.agriculture, INDUSTRIES.food, INDUSTRIES.manufacturing],
  },
  GDRJ: {
    code: 'GDRJ',
    title: {
      ja: 'チームで学ぶ オフィスタイプ',
      en: 'Team-Player Office Type',
      ko: '팀으로 배우는 오피스 타입',
      zh: '团队学习 办公型',
      vi: 'Kiểu văn phòng làm việc nhóm',
    },
    description: {
      ja: 'チームでデスクワーク中心、きまった仕事をコツコツ。にほんご使いたい人。',
      en: 'Desk-based teamwork with routine tasks. You want to use Japanese.',
      ko: '팀으로 데스크워크 중심, 정해진 일을 꾸준히. 일본어 사용하고 싶은 분.',
      zh: '团队办公为主，踏实做固定工作。想使用日语。',
      vi: 'Làm việc nhóm ở bàn, công việc cố định đều đặn. Muốn dùng tiếng Nhật.',
    },
    industries: [INDUSTRIES.education, INDUSTRIES.media, INDUSTRIES.medical],
  },
  GDRO: {
    code: 'GDRO',
    title: {
      ja: 'チームで働く テクニカルタイプ',
      en: 'Team-Player Technical Type',
      ko: '팀으로 일하는 테크니컬 타입',
      zh: '团队工作 技术型',
      vi: 'Kiểu kỹ thuật làm việc nhóm',
    },
    description: {
      ja: 'チームでデスクワーク、ルーティンが好き。にほんごは少なくてOK。',
      en: 'Team desk work with routines. Less Japanese is fine.',
      ko: '팀으로 데스크워크, 루틴을 좋아하는 타입. 일본어 적어도 OK.',
      zh: '团队办公，喜欢常规工作。日语少也OK。',
      vi: 'Làm việc nhóm ở bàn, thích công việc thường ngày. Ít tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.it, INDUSTRIES.manufacturing, INDUSTRIES.transport],
  },
  GDVJ: {
    code: 'GDVJ',
    title: {
      ja: 'チームで考える クリエイティブタイプ',
      en: 'Team-Player Creative Type',
      ko: '팀으로 생각하는 크리에이티브 타입',
      zh: '团队思考 创意型',
      vi: 'Kiểu sáng tạo làm việc nhóm',
    },
    description: {
      ja: 'チームでデスクワーク、変化ある仕事が好き。にほんごOK。',
      en: 'Team desk work with variety. You\'re OK with Japanese.',
      ko: '팀으로 데스크워크, 변화 있는 일을 좋아하는 타입. 일본어 OK.',
      zh: '团队办公，喜欢有变化的工作。日语OK。',
      vi: 'Làm việc nhóm ở bàn, thích sự đa dạng. Tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.education, INDUSTRIES.media, INDUSTRIES.trading],
  },
  GDVO: {
    code: 'GDVO',
    title: {
      ja: 'チームで挑戦する グローバルタイプ',
      en: 'Team-Player Global Type',
      ko: '팀으로 도전하는 글로벌 타입',
      zh: '团队挑战 全球型',
      vi: 'Kiểu toàn cầu làm việc nhóm',
    },
    description: {
      ja: 'チームでデスクワーク、変化ある仕事が好き。にほんごなしでもOK。',
      en: 'Team desk work with variety. OK without Japanese.',
      ko: '팀으로 데스크워크, 변화 있는 일을 좋아하는 타입. 일본어 없어도 OK.',
      zh: '团队办公，喜欢有变化的工作。没有日语也OK。',
      vi: 'Làm việc nhóm ở bàn, thích đa dạng. Không cần tiếng Nhật.',
    },
    industries: [INDUSTRIES.it, INDUSTRIES.education, INDUSTRIES.other],
  },
  LARJ: {
    code: 'LARJ',
    title: {
      ja: 'ひとりで動く 職人タイプ',
      en: 'Solo Craftsman Type',
      ko: '혼자 움직이는 장인 타입',
      zh: '独自行动 匠人型',
      vi: 'Kiểu thợ thủ công làm một mình',
    },
    description: {
      ja: 'ひとりでからだを動かし、きまった仕事をコツコツ。にほんご使いたい。',
      en: 'Solo physical work with routine tasks. You want to use Japanese.',
      ko: '혼자 몸을 움직이며 정해진 일을 꾸준히. 일본어 사용하고 싶은 타입.',
      zh: '独自活动身体，踏实做固定工作。想使用日语。',
      vi: 'Làm việc thể chất một mình, công việc cố định. Muốn dùng tiếng Nhật.',
    },
    industries: [INDUSTRIES.medical, INDUSTRIES.food, INDUSTRIES.manufacturing],
  },
  LARO: {
    code: 'LARO',
    title: {
      ja: 'ひとりで動く もくもくタイプ',
      en: 'Solo Steady Worker Type',
      ko: '혼자 움직이는 묵묵 타입',
      zh: '独自行动 踏实型',
      vi: 'Kiểu chăm chỉ làm một mình',
    },
    description: {
      ja: 'ひとりでからだを動かし、きまった仕事を黙々と。にほんご少なくてOK。',
      en: 'Solo physical work with routine tasks. Less Japanese is fine.',
      ko: '혼자 몸을 움직이며 정해진 일을 묵묵히. 일본어 적어도 OK.',
      zh: '独自活动身体，默默做固定工作。日语少也OK。',
      vi: 'Làm việc thể chất một mình, đều đặn. Ít tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.manufacturing, INDUSTRIES.transport, INDUSTRIES.construction],
  },
  LAVJ: {
    code: 'LAVJ',
    title: {
      ja: 'ひとりで動く フリーランスタイプ',
      en: 'Solo Freelance Type',
      ko: '혼자 움직이는 프리랜스 타입',
      zh: '独自行动 自由型',
      vi: 'Kiểu tự do làm một mình',
    },
    description: {
      ja: 'ひとりでからだを動かし、変化ある仕事が好き。にほんごOK。',
      en: 'Solo physical work with variety. You\'re OK with Japanese.',
      ko: '혼자 몸을 움직이며 변화 있는 일을 좋아하는 타입. 일본어 OK.',
      zh: '独自活动身体，喜欢有变化的工作。日语OK。',
      vi: 'Làm việc thể chất một mình, thích đa dạng. Tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.food, INDUSTRIES.hotel, INDUSTRIES.retail],
  },
  LAVO: {
    code: 'LAVO',
    title: {
      ja: 'ひとりで動く 自然派タイプ',
      en: 'Solo Nature Type',
      ko: '혼자 움직이는 자연파 타입',
      zh: '独自行动 自然型',
      vi: 'Kiểu thiên nhiên làm một mình',
    },
    description: {
      ja: 'ひとりでからだを動かし、変化ある仕事が好き。にほんごなしでもOK。',
      en: 'Solo physical work with variety. OK without Japanese.',
      ko: '혼자 몸을 움직이며 변화 있는 일을 좋아하는 타입. 일본어 없어도 OK.',
      zh: '独自活动身体，喜欢有变化的工作。没有日语也OK。',
      vi: 'Làm việc thể chất một mình, thích đa dạng. Không cần tiếng Nhật.',
    },
    industries: [INDUSTRIES.agriculture, INDUSTRIES.manufacturing, INDUSTRIES.transport],
  },
  LDRJ: {
    code: 'LDRJ',
    title: {
      ja: 'ひとりで学ぶ 研究者タイプ',
      en: 'Solo Researcher Type',
      ko: '혼자 배우는 연구자 타입',
      zh: '独自学习 研究型',
      vi: 'Kiểu nghiên cứu làm một mình',
    },
    description: {
      ja: 'ひとりでデスクワーク、きまった仕事をコツコツ。にほんご使いたい。',
      en: 'Solo desk work with routine tasks. You want to use Japanese.',
      ko: '혼자 데스크워크, 정해진 일을 꾸준히. 일본어 사용하고 싶은 타입.',
      zh: '独自办公，踏实做固定工作。想使用日语。',
      vi: 'Làm việc bàn một mình, công việc cố định. Muốn dùng tiếng Nhật.',
    },
    industries: [INDUSTRIES.education, INDUSTRIES.trading, INDUSTRIES.media],
  },
  LDRO: {
    code: 'LDRO',
    title: {
      ja: 'ひとりで集中 コツコツタイプ',
      en: 'Solo Focused Steady Type',
      ko: '혼자 집중 꾸준 타입',
      zh: '独自专注 踏实型',
      vi: 'Kiểu tập trung chăm chỉ một mình',
    },
    description: {
      ja: 'ひとりでデスクワーク、きまった仕事を集中。にほんご少なくてOK。',
      en: 'Solo desk work with routine tasks. Less Japanese is fine.',
      ko: '혼자 데스크워크, 정해진 일에 집중. 일본어 적어도 OK.',
      zh: '独自办公，专注做固定工作。日语少也OK。',
      vi: 'Làm việc bàn một mình, tập trung. Ít tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.manufacturing, INDUSTRIES.transport, INDUSTRIES.construction],
  },
  LDVJ: {
    code: 'LDVJ',
    title: {
      ja: 'ひとりで考える プランナータイプ',
      en: 'Solo Planner Type',
      ko: '혼자 생각하는 플래너 타입',
      zh: '独自思考 策划型',
      vi: 'Kiểu kế hoạch làm một mình',
    },
    description: {
      ja: 'ひとりでデスクワーク、変化ある仕事が好き。にほんごOK。',
      en: 'Solo desk work with variety. You\'re OK with Japanese.',
      ko: '혼자 데스크워크, 변화 있는 일을 좋아하는 타입. 일본어 OK.',
      zh: '独自办公，喜欢有变化的工作。日语OK。',
      vi: 'Làm việc bàn một mình, thích đa dạng. Tiếng Nhật OK.',
    },
    industries: [INDUSTRIES.education, INDUSTRIES.trading, INDUSTRIES.media],
  },
  LDVO: {
    code: 'LDVO',
    title: {
      ja: 'ひとりで挑戦する デジタルタイプ',
      en: 'Solo Digital Challenger Type',
      ko: '혼자 도전하는 디지털 타입',
      zh: '独自挑战 数字型',
      vi: 'Kiểu kỹ thuật số làm một mình',
    },
    description: {
      ja: 'ひとりでデスクワーク、変化ある仕事が好き。にほんごなしでもOK。',
      en: 'Solo desk work with variety. OK without Japanese.',
      ko: '혼자 데스크워크, 변화 있는 일을 좋아하는 타입. 일본어 없어도 OK.',
      zh: '独自办公，喜欢有变化的工作。没有日语也OK。',
      vi: 'Làm việc bàn một mình, thích đa dạng. Không cần tiếng Nhật.',
    },
    industries: [INDUSTRIES.it, INDUSTRIES.other, INDUSTRIES.manufacturing],
  },
};

// =====================================================
// 言語パスマッピング（URL生成用）
// =====================================================
export const LANG_PATH_MAP: Record<string, string> = {
  ja: 'ja',
  en: 'en',
  ko: 'ko',
  zh: 'zh-TW',
  vi: 'vi',
};
