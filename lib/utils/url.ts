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
      hotel_ryokan: '16',
      retail_service: '1',
      logistics_driver: '4',
    };
    
    industries.forEach(ind => {
      const industryId = industryMap[ind.trim()];
      if (industryId) {
        params.append('industries[]', industryId);
      }
    });
  }

  params.append('order', 'salary');

  const queryString = params.toString();
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  const utmCampaign = `line_chatbot_diagnosis_${lang}`;
  return addUtmParams(finalUrl, utmCampaign);
}

function buildYoloUrlWithParams(
  answers: Partial<DiagnosisAnswers>,
  lang: string
): string {
  return buildYoloSearchUrl(answers as DiagnosisAnswers, lang);
}

function getJobDescription(
  level: string,
  position: 'main' | 'upper' | 'lower',
  lang: string
): { title: string; subtitle: string } {
  const levelLabel = getMainLabel(lang, level);
  
  if (position === 'main') {
    return {
      title: levelLabel,
      subtitle: getMainDescription(lang),
    };
  } else if (position === 'upper') {
    return {
      title: levelLabel,
      subtitle: getUpperDescription(lang),
    };
  } else {
    return {
      title: levelLabel,
      subtitle: getLowerDescription(lang, level),
    };
  }
}


export function buildYoloUrlsByLevel(
  answers: Partial<DiagnosisAnswers>,
  lang: string
): Array<{ label: string; url: string; description?: string }> {
  const { japanese_level } = answers;

  if (!japanese_level) {
    return [];
  }

  const levelOrder = ['no_japanese', 'n5', 'n4', 'n3', 'n2', 'n1'] as const;
  const currentIndex = levelOrder.indexOf(japanese_level as any);

  if (currentIndex === -1) {
    return [];
  }

  const results: Array<{ label: string; url: string; description?: string }> = [];

  // 1. 自分の言語レベル（メイン）
  const mainUrl = buildYoloUrlWithParams({ ...answers, japanese_level } as DiagnosisAnswers, lang);
  const mainDescription = getJobDescription(japanese_level, 'main', lang);
  results.push({
    label: mainDescription.title,
    url: mainUrl,
    description: mainDescription.subtitle,
  });

  // 2. 上の言語レベル
  const upperIndex = currentIndex + 1;
  if (upperIndex < levelOrder.length) {
    const upperLevel = levelOrder[upperIndex] as string;
    const upperUrl = buildYoloUrlWithParams({ ...answers, japanese_level: upperLevel as any } as DiagnosisAnswers, lang);
    const upperDescription = getJobDescription(upperLevel, 'upper', lang);
    results.push({
      label: upperDescription.title,
      url: upperUrl,
      description: upperDescription.subtitle,
    });
  }

  // 3. 下の言語レベル
  const lowerIndex = currentIndex - 1;
  if (lowerIndex >= 0) {
    const lowerLevel = levelOrder[lowerIndex] as string;
    const lowerUrl = buildYoloUrlWithParams({ ...answers, japanese_level: lowerLevel as any } as DiagnosisAnswers, lang);
    const lowerDescription = getJobDescription(lowerLevel, 'lower', lang);
    results.push({
      label: lowerDescription.title,
      url: lowerUrl,
      description: lowerDescription.subtitle,
    });
  }

  return results;
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
  return addUtmParams(`${YOLO_SITE_BASE}/${langPath}/recruit/job`, `line_chatbot_site_mode`);
}

export function buildYoloFeatureUrl(lang: string): string {
  const langPath = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-TW' : 'vi';
  // 特集タップは medium=feature で識別（GA4でのファネル分析用）
  const url = new URL(`${YOLO_SITE_BASE}/${langPath}/recruit/feature/theme`);
  url.searchParams.append('utm_source', 'line');
  url.searchParams.append('utm_medium', 'feature');
  url.searchParams.append('utm_campaign', 'line_feature_features');
  return url.toString();
}

/**
 * AIトーク（自由会話）経由でYOLOサイトへ誘導する際のURL
 * utm_medium=autochat で識別
 */
export function buildYoloAutochatUrl(lang: string): string {
  const langPath = lang === 'ja' ? 'ja' : lang === 'en' ? 'en' : lang === 'ko' ? 'ko' : lang === 'zh' ? 'zh-TW' : 'vi';
  const url = new URL(`${YOLO_SITE_BASE}/${langPath}/recruit/job`);
  url.searchParams.append('utm_source', 'line');
  url.searchParams.append('utm_medium', 'autochat');
  url.searchParams.append('utm_campaign', 'line_autochat_ai_chat');
  return url.toString();
}
