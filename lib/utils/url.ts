import { DiagnosisAnswers } from '@/types/conversation';
import { JAPANESE_LEVEL, WORK_STYLE } from '../masters';
import { UTM_SOURCE, UTM_MEDIUM, UTM_CAMPAIGN, YOLO_SITE_BASE } from '../constants';

export function addUtmParams(baseUrl: string, campaign: string = UTM_CAMPAIGN): string {
  const url = new URL(baseUrl);
  url.searchParams.append('utm_source', UTM_SOURCE);
  url.searchParams.append('utm_medium', UTM_MEDIUM);
  url.searchParams.append('utm_campaign', campaign);
  return url.toString();
}

export function buildYoloSearchUrl(answers: DiagnosisAnswers, lang: string): string {
  const langPath = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-TW' : 'vi';
  let baseUrl = `${YOLO_SITE_BASE}/${langPath}/recruit/job`;
  
  const params = new URLSearchParams();

  // area (都道府県)
  if (answers.prefecture) {
    params.append('area[]', answers.prefecture);
  }

  // japaneseLevel
  if (answers.japanese_level) {
    let levelParam = '';
    
    if (answers.japanese_level === 'no_japanese') {
      levelParam = 'n6';
    } else if (answers.japanese_level === 'n5') {
      levelParam = 'n5';
    } else if (answers.japanese_level === 'n4') {
      levelParam = 'n4';
    } else if (answers.japanese_level === 'n3') {
      levelParam = 'n3';
    } else if (answers.japanese_level === 'n2') {
      levelParam = 'n2';
    } else if (answers.japanese_level === 'n1') {
      levelParam = 'n1';
    }
    
    if (levelParam) {
      params.append('japaneseLevel[]', levelParam);
    }
  }

  // workStyle
  if (answers.work_style) {
    if (answers.work_style === 'fulltime') {
      params.append('workStyle[]', 'fulltime');
    } else if (answers.work_style === 'parttime') {
      params.append('workStyle[]', 'parttime');
    } else if (answers.work_style === 'both') {
      params.append('workStyle[]', 'fulltime');
      params.append('workStyle[]', 'parttime');
    }
  }

  // industries
  if (answers.industry) {
    const industries = answers.industry.split(',');
    const industryMap: Record<string, string> = {
      food: '2',
      building_maintenance: '14',
      hotel_ryokan: '3',
      retail_service: '4',
      logistics_driver: '5',
    };
    
    industries.forEach(ind => {
      const industryId = industryMap[ind.trim()];
      if (industryId) {
        params.append('industries[]', industryId);
      }
    });
  }

  params.append('order', 'new');

  const queryString = params.toString();
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  const utmCampaign = `yolo_bot_chatbot_${lang}`;
  return addUtmParams(finalUrl, utmCampaign);
}

export function buildYoloUrlsByLevel(
  answers: DiagnosisAnswers,
  lang: string
): Array<{ label: string; description: string; url: string }> {
  const result: Array<{ label: string; description: string; url: string }> = [];

  const japaneseLevel = answers.japanese_level;

  if (!japaneseLevel) {
    result.push({
      label: getMainLabel(lang, 'all'),
      description: '',
      url: buildYoloSearchUrl(answers, lang),
    });
    return result;
  }

  const levelMap = {
    'no_japanese': 0,
    'n5': 1,
    'n4': 2,
    'n3': 3,
    'n2': 4,
    'n1': 5,
  };

  const currentLevel = levelMap[japaneseLevel as keyof typeof levelMap];

  if (currentLevel === undefined) {
    result.push({
      label: getMainLabel(lang, 'all'),
      description: '',
      url: buildYoloSearchUrl(answers, lang),
    });
    return result;
  }

  // no_japanese (レベル0): メイン + 1つ上
  if (currentLevel === 0) {
    // メイン
    result.push({
      label: getMainLabel(lang, japaneseLevel),
      description: getMainDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: japaneseLevel as any }, lang),
    });
    // 1つ上 (N5)
    result.push({
      label: getUpperLabel(lang, 'n5'),
      description: getUpperDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: 'n5' as any }, lang),
    });
  }
  // N5-N2 (レベル1-4): 1つ下 + メイン + 1つ上
  else if (currentLevel >= 1 && currentLevel <= 4) {
    const levels = ['no_japanese', 'n5', 'n4', 'n3', 'n2', 'n1'];
    
    // 1つ下
    const lowerLevel = levels[currentLevel - 1];
    result.push({
      label: getLowerLabel(lang, lowerLevel),
      description: getLowerDescription(lang, lowerLevel),
      url: buildYoloSearchUrl({ ...answers, japanese_level: lowerLevel as any }, lang),
    });
    
    // メイン
    result.push({
      label: getMainLabel(lang, japaneseLevel),
      description: getMainDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: japaneseLevel as any }, lang),
    });
    
    // 1つ上
    const upperLevel = levels[currentLevel + 1];
    result.push({
      label: getUpperLabel(lang, upperLevel),
      description: getUpperDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: upperLevel as any }, lang),
    });
  }
  // N1 (レベル5): 2つ下 + 1つ下 + メイン
  else if (currentLevel === 5) {
    // 2つ下 (N3)
    result.push({
      label: getLowerLabel(lang, 'n3'),
      description: getN1TwoLevelsDownDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: 'n3' as any }, lang),
    });
    
    // 1つ下 (N2)
    result.push({
      label: getLowerLabel(lang, 'n2'),
      description: getN1OneLevelDownDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: 'n2' as any }, lang),
    });
    
    // メイン
    result.push({
      label: getMainLabel(lang, japaneseLevel),
      description: getMainDescription(lang),
      url: buildYoloSearchUrl({ ...answers, japanese_level: japaneseLevel as any }, lang),
    });
  }

  return result;
}

// メインラベル
function getMainLabel(lang: string, level: string): string {
  const levelLabels: Record<string, Record<string, string>> = {
    no_japanese: {
      ja: '日本語不要の求人',
      en: 'Jobs without Japanese',
      ko: '일본어 불필요 구인',
      zh: '无需日语的工作',
      vi: 'Công việc không cần tiếng Nhật',
    },
    n5: { ja: 'N5レベルの求人', en: 'N5 Level Jobs', ko: 'N5 수준 구인', zh: 'N5水平工作', vi: 'Công việc N5' },
    n4: { ja: 'N4レベルの求人', en: 'N4 Level Jobs', ko: 'N4 수준 구인', zh: 'N4水平工作', vi: 'Công việc N4' },
    n3: { ja: 'N3レベルの求人', en: 'N3 Level Jobs', ko: 'N3 수준 구인', zh: 'N3水平工作', vi: 'Công việc N3' },
    n2: { ja: 'N2レベルの求人', en: 'N2 Level Jobs', ko: 'N2 수준 구인', zh: 'N2水平工作', vi: 'Công việc N2' },
    n1: { ja: 'N1レベルの求人', en: 'N1 Level Jobs', ko: 'N1 수준 구인', zh: 'N1水平工作', vi: 'Công việc N1' },
    all: { ja: 'すべての求人', en: 'All Jobs', ko: '모든 구인', zh: '所有工作', vi: 'Tất cả công việc' },
  };
  return levelLabels[level]?.[lang] || levelLabels[level]?.ja || 'Jobs';
}

// メイン説明文
function getMainDescription(lang: string): string {
  const desc: Record<string, string> = {
    ja: '【あなたの条件に合う求人】',
    en: '【Jobs matching your conditions】',
    ko: '【당신의 조건에 맞는 구인】',
    zh: '【符合您条件的工作】',
    vi: '【Công việc phù hợp với điều kiện của bạn】',
  };
  return desc[lang] || desc.ja;
}

// 上のレベルラベル
function getUpperLabel(lang: string, level: string): string {
  return getMainLabel(lang, level);
}

// 上のレベル説明文
function getUpperDescription(lang: string): string {
  const desc: Record<string, string> = {
    ja: '【とりあえず見るだけでもOK】\n気になったら応募してみよう',
    en: '【Just checking is OK】\nApply if interested',
    ko: '【일단 보기만 해도 OK】\n관심 있으면 지원해보세요',
    zh: '【先看看也可以】\n感兴趣的话可以申请',
    vi: '【Chỉ xem cũng được】\nNếu quan tâm thì nộp đơn',
  };
  return desc[lang] || desc.ja;
}

// 下のレベルラベル
function getLowerLabel(lang: string, level: string): string {
  return getMainLabel(lang, level);
}

// 下のレベル説明文
function getLowerDescription(lang: string, level: string): string {
  if (level === 'no_japanese') {
    const desc: Record<string, string> = {
      ja: '【日本語に自信がない方向け】\n通訳サポートのある職場も',
      en: '【For those not confident in Japanese】\nWorkplaces with interpreter support',
      ko: '【일본어에 자신 없는 분들을 위해】\n통역 지원이 있는 직장도',
      zh: '【日语不自信的人】\n有翻译支持的职场',
      vi: '【Dành cho người không tự tin tiếng Nhật】\nCó nơi làm việc hỗ trợ thông dịch',
    };
    return desc[lang] || desc.ja;
  } else {
    const desc: Record<string, string> = {
      ja: '【もう少し日本語が簡単な求人】',
      en: '【Jobs with easier Japanese】',
      ko: '【조금 더 쉬운 일본어 구인】',
      zh: '【日语更简单的工作】',
      vi: '【Công việc tiếng Nhật dễ hơn】',
    };
    return desc[lang] || desc.ja;
  }
}

// N1の2つ下説明文
function getN1TwoLevelsDownDescription(lang: string): string {
  const desc: Record<string, string> = {
    ja: '【幅広い選択肢から選べる】\n日常会話レベルでもOK',
    en: '【Wide range of choices】\nDaily conversation level OK',
    ko: '【폭넓은 선택지에서 선택】\n일상회화 수준도 OK',
    zh: '【可从广泛选择中选择】\n日常会话水平也可以',
    vi: '【Có thể chọn từ nhiều lựa chọn】\nTrình độ hội thoại hàng ngày cũng OK',
  };
  return desc[lang] || desc.ja;
}

// N1の1つ下説明文
function getN1OneLevelDownDescription(lang: string): string {
  const desc: Record<string, string> = {
    ja: '【こちらもチェック】\nビジネス会話レベル',
    en: '【Check this too】\nBusiness conversation level',
    ko: '【이것도 확인】\n비즈니스 회화 수준',
    zh: '【也可以看看这个】\n商务会话水平',
    vi: '【Kiểm tra cái này】\nTrình độ hội thoại kinh doanh',
  };
  return desc[lang] || desc.ja;
}

export function buildYoloSiteUrl(lang: string): string {
  const langPath = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-TW' : 'vi';
  return addUtmParams(`${YOLO_SITE_BASE}/${langPath}/recruit/job`, 'site_mode');
}

export function buildYoloFeatureUrl(lang: string): string {
  const langPath = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-TW' : 'vi';
  return addUtmParams(`${YOLO_SITE_BASE}/${langPath}/recruit/feature/theme`, 'features');
}
