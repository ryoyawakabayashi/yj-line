'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  TrashIcon, PaperAirplaneIcon, ClockIcon, DocumentIcon,
  ArrowUpIcon, ArrowDownIcon, UserPlusIcon, XMarkIcon, PhotoIcon,
  Squares2X2Icon, ChatBubbleLeftIcon, LinkIcon, ArrowUpTrayIcon,
  BookmarkIcon, SparklesIcon, LanguageIcon,
} from '@heroicons/react/24/outline';

// =====================================================
// Types
// =====================================================

interface CarouselBubble {
  // カード用
  imageUrl?: string;
  title?: string;
  body?: string;
  buttons?: { label: string; url: string; campaign?: string; actionType?: 'uri' | 'message'; messageText?: string; color?: string }[];
  // 画像用
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
  imageFullWidth?: boolean;
  imageAspectRatio?: string;
  imageAspectMode?: 'cover' | 'fit';
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
}

interface MessageItem {
  type: 'text' | 'card' | 'image';
  text?: string;
  imageUrl?: string;
  title?: string;
  body?: string;
  altText?: string;
  buttons?: { label: string; url: string; campaign?: string; actionType?: 'uri' | 'message'; messageText?: string; color?: string }[];
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
  imageFullWidth?: boolean;
  imageAspectRatio?: string;
  imageAspectMode?: 'cover' | 'fit';
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  isCarousel?: boolean;
  bubbles?: CarouselBubble[];
}

interface TestUser {
  id: string;
  lineUserId: string;
  label: string | null;
  displayName: string | null;
  pictureUrl: string | null;
}

interface RecentCampaign {
  id: string;
  name: string | null;
  delivery_method: string;
  executed_at: string | null;
  result: any;
  messages: any[];
  status: string;
}

interface CampaignStats {
  uniqueImpression?: number;
  uniqueClick?: number;
}

const AREA_OPTIONS = [
  { value: '', label: '全国' },
  { value: 'hokkaido', label: '北海道' },
  { value: 'tohoku', label: '東北' },
  { value: 'kanto', label: '関東' },
  { value: 'chubu', label: '中部' },
  { value: 'kansai', label: '関西' },
  { value: 'chugoku', label: '中国' },
  { value: 'shikoku', label: '四国' },
  { value: 'kyushu', label: '九州' },
];

const GENDER_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
];

const AGE_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: 'age_15', label: '15〜19歳' },
  { value: 'age_20', label: '20〜24歳' },
  { value: 'age_25', label: '25〜29歳' },
  { value: 'age_30', label: '30〜34歳' },
  { value: 'age_35', label: '35〜39歳' },
  { value: 'age_40', label: '40〜44歳' },
  { value: 'age_45', label: '45〜49歳' },
  { value: 'age_50', label: '50歳以上' },
];

type DeliveryMethod = 'broadcast' | 'narrowcast' | 'db_users' | 'test';
type DataSource = 'line' | 'db' | 'test';

const DATA_SOURCE_OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'line', label: 'LINE DB' },
  { value: 'db', label: 'YOLO JAPAN DB' },
  { value: 'test', label: 'テスト配信' },
];

const SUB_METHOD_OPTIONS: Record<DataSource, { value: DeliveryMethod; label: string }[]> = {
  line: [
    { value: 'broadcast', label: '全員' },
    { value: 'narrowcast', label: '絞り込み' },
  ],
  db: [
    { value: 'db_users', label: '登録ユーザー' },
  ],
  test: [
    { value: 'test', label: 'テストユーザーに配信' },
  ],
};

const METHOD_TO_SOURCE: Record<DeliveryMethod, DataSource> = {
  broadcast: 'line',
  narrowcast: 'line',
  db_users: 'db',
  test: 'test',
};

const RECENT_PERIOD_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: '7', label: '1週間以内' },
  { value: '30', label: '1ヶ月以内' },
  { value: '90', label: '3ヶ月以内' },
];

const JP_LEVEL_OPTIONS = [
  { value: 'n1', label: 'N1' },
  { value: 'n2', label: 'N2' },
  { value: 'n3', label: 'N3' },
  { value: 'n4', label: 'N4' },
  { value: 'n5', label: 'N5' },
  { value: 'no_japanese', label: '話せない' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'immediate', label: '今すぐ' },
  { value: 'within_2weeks', label: '1〜2週間' },
  { value: 'not_urgent', label: '急ぎでない' },
];

const DB_GENDER_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
];

// AI診断の都道府県リスト（地域別グループ）
const REGION_PREFECTURES: { region: string; label: string; prefectures: { value: string; label: string }[] }[] = [
  { region: 'hokkaido', label: '北海道', prefectures: [
    { value: 'hokkaido', label: '北海道' },
  ]},
  { region: 'tohoku', label: '東北', prefectures: [
    { value: 'aomori', label: '青森県' }, { value: 'iwate', label: '岩手県' },
    { value: 'miyagi', label: '宮城県' }, { value: 'akita', label: '秋田県' },
    { value: 'yamagata', label: '山形県' }, { value: 'fukushima', label: '福島県' },
  ]},
  { region: 'kanto', label: '関東', prefectures: [
    { value: 'tokyo', label: '東京都' }, { value: 'kanagawa', label: '神奈川県' },
    { value: 'saitama', label: '埼玉県' }, { value: 'chiba', label: '千葉県' },
    { value: 'ibaraki', label: '茨城県' }, { value: 'tochigi', label: '栃木県' },
    { value: 'gunma', label: '群馬県' },
  ]},
  { region: 'chubu', label: '中部', prefectures: [
    { value: 'aichi', label: '愛知県' }, { value: 'shizuoka', label: '静岡県' },
    { value: 'gifu', label: '岐阜県' }, { value: 'niigata', label: '新潟県' },
    { value: 'nagano', label: '長野県' }, { value: 'yamanashi', label: '山梨県' },
    { value: 'ishikawa', label: '石川県' }, { value: 'toyama', label: '富山県' },
    { value: 'fukui', label: '福井県' },
  ]},
  { region: 'kansai', label: '関西', prefectures: [
    { value: 'osaka', label: '大阪府' }, { value: 'kyoto', label: '京都府' },
    { value: 'hyogo', label: '兵庫県' }, { value: 'nara', label: '奈良県' },
    { value: 'shiga', label: '滋賀県' }, { value: 'wakayama', label: '和歌山県' },
  ]},
  { region: 'chugoku', label: '中国', prefectures: [
    { value: 'hiroshima', label: '広島県' }, { value: 'okayama', label: '岡山県' },
    { value: 'yamaguchi', label: '山口県' }, { value: 'tottori', label: '鳥取県' },
    { value: 'shimane', label: '島根県' },
  ]},
  { region: 'shikoku', label: '四国', prefectures: [
    { value: 'kagawa', label: '香川県' }, { value: 'ehime', label: '愛媛県' },
    { value: 'kochi', label: '高知県' }, { value: 'tokushima', label: '徳島県' },
  ]},
  { region: 'kyushu', label: '九州・沖縄', prefectures: [
    { value: 'fukuoka', label: '福岡県' }, { value: 'saga', label: '佐賀県' },
    { value: 'nagasaki', label: '長崎県' }, { value: 'kumamoto', label: '熊本県' },
    { value: 'oita', label: '大分県' }, { value: 'miyazaki', label: '宮崎県' },
    { value: 'kagoshima', label: '鹿児島県' }, { value: 'okinawa', label: '沖縄県' },
  ]},
];

// 全都道府県コードのフラットリスト
const ALL_PREFECTURE_CODES = REGION_PREFECTURES.flatMap(r => r.prefectures.map(p => p.value));

// =====================================================
// Helper: API calls
// =====================================================

async function api(method: 'GET' | 'POST', params?: Record<string, string>, body?: any) {
  if (method === 'GET') {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/dashboard/broadcast?${qs}`);
    return res.json();
  }
  const res = await fetch('/api/dashboard/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** 画像をSupabase Storageにアップロードし、公開URLを返す */
async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok || data.error) return { error: data.error || 'アップロード失敗' };
  return { url: data.url };
}

// =====================================================
// Component
// =====================================================

export default function BroadcastPage() {
  const router = useRouter();
  // --- State ---
  const [campaignName, setCampaignName] = useState('');
  const [notificationText, setNotificationText] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('broadcast');
  const dataSource = METHOD_TO_SOURCE[deliveryMethod];
  const [recentDays, setRecentDays] = useState('');
  const [recentFollowerCount, setRecentFollowerCount] = useState<number | null>(null);
  const [area, setArea] = useState('');
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  // DB Users フィルター
  const [dbJapaneseLevel, setDbJapaneseLevel] = useState<string[]>([]);
  const [dbUrgency, setDbUrgency] = useState('');
  const [dbGender, setDbGender] = useState('');
  const [dbUserCount, setDbUserCount] = useState<number | null>(null);
  const [dbCountLoading, setDbCountLoading] = useState(false);
  const [broadcastLang, setBroadcastLang] = useState('ja');
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [newTestUserId, setNewTestUserId] = useState('');
  const [newTestLabel, setNewTestLabel] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now');
  const [schedDate, setSchedDate] = useState('');
  const [schedHour, setSchedHour] = useState('12');
  const [schedMin, setSchedMin] = useState('00');
  const [uploading, setUploading] = useState<number | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [recentStats, setRecentStats] = useState<Record<string, CampaignStats | null>>({});
  const [recentProgress, setRecentProgress] = useState<Record<string, { phase: string; successCount?: number; targetCount?: number } | null>>({});
  const [recentConversions, setRecentConversions] = useState<Record<string, number | null>>({});
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [prefectureCounts, setPrefectureCounts] = useState<Record<string, number>>({});
  const [areaEstimates, setAreaEstimates] = useState<Record<string, number>>({});
  const [genderPct, setGenderPct] = useState<Record<string, number>>({});
  const [agePct, setAgePct] = useState<Record<string, number>>({});
  const [targetedReaches, setTargetedReaches] = useState<number | null>(null);
  // テスト配信ユーザー選択
  const [showTestSendModal, setShowTestSendModal] = useState(false);
  const [selectedTestUserIds, setSelectedTestUserIds] = useState<string[]>([]);
  // 予約確認モーダル
  const [showScheduleConfirm, setShowScheduleConfirm] = useState<{ isTest: boolean } | null>(null);
  // 翻訳
  const [translatedMessages, setTranslatedMessages] = useState<MessageItem[]>([]);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  // AI生成
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessageType, setAiMessageType] = useState<'auto' | 'text' | 'card'>('auto');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCombo, setAiCombo] = useState<Array<{ type: 'text' | 'card' | 'image'; hasImage?: boolean }>>([
    { type: 'text' }, { type: 'card', hasImage: true },
  ]);
  const [aiUseCombo, setAiUseCombo] = useState(false);
  const [aiUploadedImages, setAiUploadedImages] = useState<Record<number, string>>({});
  const [aiUploadingIdx, setAiUploadingIdx] = useState<number | null>(null);
  const [aiExtraNote, setAiExtraNote] = useState('');
  const [aiButtonUrl, setAiButtonUrl] = useState('');
  const [aiContentType, setAiContentType] = useState<'job' | 'event' | 'info' | 'campaign'>('job');
  // インラインAI生成
  const [aiInlineOpen, setAiInlineOpen] = useState<number | null>(null);
  const [aiInlineRole, setAiInlineRole] = useState('main');
  const [aiInlineAppeal, setAiInlineAppeal] = useState('benefit');
  const [aiInlineTone, setAiInlineTone] = useState('friendly');
  const [aiInlineKeywords, setAiInlineKeywords] = useState('');
  const [aiInlineGenerating, setAiInlineGenerating] = useState(false);
  // ボットプロフィール
  const [botProfile, setBotProfile] = useState<{ displayName: string; pictureUrl: string } | null>(null);
  // 画像トリミング
  const [cropModal, setCropModal] = useState<{ imgSrc: string; msgIdx: number; field: 'originalUrl' | 'imageUrl'; bubbleIdx?: number } | null>(null);
  const [carouselActiveTab, setCarouselActiveTab] = useState<Record<number, number>>({});
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const cropImgRef = useRef<HTMLImageElement>(null);

  // localStorageからボットプロフィール復元（SSR後）
  useEffect(() => {
    try { const c = localStorage.getItem('bc_bot_profile'); if (c) setBotProfile(JSON.parse(c)); } catch {}
  }, []);

  // --- Load initial data ---
  const loadData = useCallback(async () => {
    const [followerRes, testRes, recentRes, demoRes, prefRes, botRes] = await Promise.all([
      api('GET', { action: 'follower_count' }),
      api('GET', { action: 'test_users' }),
      api('GET', { action: 'recent_campaigns' }),
      api('GET', { action: 'demographic' }),
      api('GET', { action: 'prefecture_users' }),
      api('GET', { action: 'bot_profile' }),
    ]);
    // recent followers count
    const rfRes = await api('GET', { action: 'recent_followers_count', days: '30' });
    if (rfRes.count !== undefined) setRecentFollowerCount(rfRes.count);

    if (botRes.pictureUrl) {
      const bp = { displayName: botRes.displayName, pictureUrl: botRes.pictureUrl };
      setBotProfile(bp);
      try { localStorage.setItem('bc_bot_profile', JSON.stringify(bp)); } catch {}
    }
    if (followerRes.followers !== undefined) setFollowerCount(followerRes.followers);
    if (prefRes.counts) setPrefectureCounts(prefRes.counts);
    if (demoRes.available) {
      if (demoRes.estimates) setAreaEstimates(demoRes.estimates);
      if (demoRes.genderPct) setGenderPct(demoRes.genderPct);
      if (demoRes.agePct) setAgePct(demoRes.agePct);
      setTargetedReaches(demoRes.targetedReaches || null);
    }
    if (testRes.users) setTestUsers(testRes.users);
    if (recentRes.campaigns) {
      const campaigns = recentRes.campaigns as RecentCampaign[];
      setRecentCampaigns(campaigns);
      // Fetch stats + narrowcast progress in parallel
      const withUnit = campaigns.filter((c) => c.result?.aggUnit);
      const narrowcasts = campaigns.filter((c) => c.delivery_method === 'narrowcast' && c.result?.requestId && c.status === 'sent');
      const statsResults: Record<string, CampaignStats | null> = {};
      const progressResults: Record<string, { phase: string; successCount?: number; targetCount?: number } | null> = {};
      await Promise.all([
        // Stats
        ...withUnit.map(async (c) => {
          try {
            const execDate = (c.executed_at || new Date().toISOString()).slice(0, 10).replace(/-/g, '');
            const data = await api('GET', { action: 'broadcast_stats', unit: c.result.aggUnit, from: execDate });
            if (data.overview) {
              statsResults[c.id] = { uniqueImpression: data.overview.uniqueImpression, uniqueClick: data.overview.uniqueClick };
            } else {
              statsResults[c.id] = null;
            }
          } catch { statsResults[c.id] = null; }
        }),
        // Narrowcast progress
        ...narrowcasts.map(async (c) => {
          try {
            const data = await api('GET', { action: 'narrowcast_progress', requestId: c.result.requestId });
            if (data.phase) {
              progressResults[c.id] = { phase: data.phase, successCount: data.successCount, targetCount: data.targetCount };
            } else {
              progressResults[c.id] = null;
            }
          } catch { progressResults[c.id] = null; }
        }),
      ]);
      setRecentStats(statsResults);
      setRecentProgress(progressResults);
      // Fetch conversions
      const convResults: Record<string, number | null> = {};
      await Promise.all(
        campaigns.filter((c) => c.status === 'sent' && c.delivery_method !== 'test').map(async (c) => {
          try {
            const data = await api('GET', { action: 'broadcast_conversions', campaignId: c.id });
            convResults[c.id] = data.conversions ?? null;
          } catch { convResults[c.id] = null; }
        })
      );
      setRecentConversions(convResults);
    }
  }, []);

  // 自動保存用: 常に最新のフォーム状態をrefに保持
  const formRef = useRef<any>(null);
  formRef.current = { messages, campaignName, notificationText, deliveryMethod, area, gender, ageRange, broadcastLang, prefectures, editingDraftId, schedDate, schedHour, schedMin };

  // 初回ロード：localStorage復元 + 定期保存セットアップ
  const effectRanRef = useRef(false);
  useEffect(() => {
    if (effectRanRef.current) {
      console.log('[BC] useEffect再実行をスキップ（loadData変更）');
      return;
    }
    effectRanRef.current = true;
    console.log('[BC] === 初回マウント ===');
    loadData();
    const params = new URLSearchParams(window.location.search);
    const draftParam = params.get('draft');
    const copyParam = params.get('copy');
    console.log('[BC] URL:', window.location.href, 'draft param:', draftParam, 'copy param:', copyParam);
    if (draftParam) {
      console.log('[BC] draft読み込みモード → localStorage復元スキップ');
      loadDraft(draftParam);
    } else if (copyParam) {
      console.log('[BC] コピーモード → キャンペーンデータ読み込み');
      loadCopy(copyParam);
    } else {
      try {
        const raw = window.localStorage.getItem('bc_tmp');
        console.log('[BC] localStorage raw:', raw ? raw.substring(0, 200) : 'null');
        if (raw) {
          const s = JSON.parse(raw);
          console.log('[BC] parsed keys:', Object.keys(s));
          console.log('[BC] s.messages length:', s.messages?.length, 'campaignName:', s.campaignName);
          if (s.messages) setMessages(s.messages);
          if (s.campaignName) setCampaignName(s.campaignName);
          if (s.notificationText) setNotificationText(s.notificationText);
          if (s.deliveryMethod) setDeliveryMethod(s.deliveryMethod);
          if (s.area) setArea(s.area);
          if (s.gender) setGender(s.gender);
          if (s.ageRange) setAgeRange(s.ageRange);
          if (s.broadcastLang) setBroadcastLang(s.broadcastLang);
          if (s.prefectures) setPrefectures(s.prefectures);
          if (s.editingDraftId) setEditingDraftId(s.editingDraftId);
          if (s.schedDate) setSchedDate(s.schedDate);
          if (s.schedHour) setSchedHour(s.schedHour);
          if (s.schedMin) setSchedMin(s.schedMin);
          console.log('[BC] 復元完了');
        } else {
          console.log('[BC] localStorageにデータなし');
        }
      } catch (e) { console.error('[BC] 復元エラー:', e); }
    }

    // 自動保存: 2秒ごと + ページ離脱時 + タブ切替時
    let saveCount = 0;
    const save = () => {
      try {
        const data = formRef.current;
        saveCount++;
        if (saveCount <= 5) {
          console.log('[BC] 自動保存 #' + saveCount, 'messages:', data?.messages?.length, 'name:', data?.campaignName, 'method:', data?.deliveryMethod);
        }
        window.localStorage.setItem('bc_tmp', JSON.stringify(data));
      } catch (e) { console.error('[BC] 保存エラー:', e); }
    };
    const intervalId = setInterval(save, 2000);
    window.addEventListener('beforeunload', save);
    const onVisChange = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', save);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [loadData]);

  // 新規友達カウント: recentDays変更時に再取得
  useEffect(() => {
    if (!recentDays) return;
    (async () => {
      const res = await api('GET', { action: 'recent_followers_count', days: recentDays });
      if (res.count !== undefined) setRecentFollowerCount(res.count);
    })();
  }, [recentDays]);

  // DB Users: フィルター変更時に対象ユーザー数を再取得
  useEffect(() => {
    if (deliveryMethod !== 'db_users') return;
    const hasFilter = prefectures.length > 0 || recentDays || dbJapaneseLevel.length > 0 || dbUrgency || dbGender;
    if (!hasFilter) { setDbUserCount(null); return; }

    setDbCountLoading(true);
    const params: Record<string, string> = { action: 'db_users_count' };
    if (prefectures.length > 0) params.prefectures = prefectures.join(',');
    if (recentDays) params.recentDays = recentDays;
    if (dbJapaneseLevel.length > 0) params.japaneseLevel = dbJapaneseLevel.join(',');
    if (dbUrgency) params.urgency = dbUrgency;
    if (dbGender) params.gender = dbGender;

    const timer = setTimeout(() => {
      api('GET', params).then((res) => {
        if (res.count !== undefined) setDbUserCount(res.count);
      }).finally(() => setDbCountLoading(false));
    }, 300); // debounce
    return () => clearTimeout(timer);
  }, [deliveryMethod, prefectures, recentDays, dbJapaneseLevel, dbUrgency, dbGender]);

  const loadDraft = async (id: string) => {
    const res = await api('GET', { action: 'campaign_detail', id });
    const draft = res.campaign;
    if (draft) {
      setEditingDraftId(draft.id);
      setCampaignName(draft.name || '');
      setMessages(draft.messages || []);
      setDeliveryMethod(draft.delivery_method || 'broadcast');
      setArea(draft.area || '');
      setGender(draft.demographic?.gender || '');
      setAgeRange(draft.demographic?.age || '');
      setPrefectures(draft.demographic?.prefectures || (draft.demographic?.prefecture ? [draft.demographic.prefecture] : []));
      setBroadcastLang(draft.broadcast_lang || 'ja');
      setNotificationText(draft.demographic?.notificationText || '');
      setRecentDays(draft.demographic?.recentDays || '');
      setDbJapaneseLevel(draft.demographic?.japaneseLevel || []);
      setDbUrgency(draft.demographic?.urgency || '');
      setDbGender(draft.demographic?.gender || '');
      // 下書き読み込み完了後、URLから?draftパラメータを除去（リロード時にlocalStorage復元が効くように）
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const loadCopy = async (id: string) => {
    const res = await api('GET', { action: 'campaign_detail', id });
    const src = res.campaign;
    if (src) {
      // コピーなのでeditingDraftIdはセットしない（新規キャンペーンとして作成）
      setCampaignName((src.name || '') + ' (コピー)');
      setMessages(src.messages || []);
      setDeliveryMethod(src.delivery_method || 'broadcast');
      setArea(src.area || '');
      setGender(src.demographic?.gender || '');
      setAgeRange(src.demographic?.age || '');
      setPrefectures(src.demographic?.prefectures || []);
      setBroadcastLang(src.broadcast_lang || 'ja');
      setNotificationText(src.demographic?.notificationText || '');
      if (src.demographic?.recentDays) setRecentDays(String(src.demographic.recentDays));
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // --- Message editor helpers ---
  const addMessage = (type: 'text' | 'card' | 'image') => {
    if (messages.length >= 5) return;
    if (type === 'text') setMessages([...messages, { type: 'text', text: '' }]);
    else if (type === 'card') setMessages([...messages, { type: 'card', title: '', body: '', buttons: [] }]);
    else setMessages([...messages, { type: 'image', originalUrl: '' }]);
  };

  const toggleCarousel = (idx: number) => {
    const msg = messages[idx];
    if (msg.isCarousel) {
      // OFF: bubbles[0] の内容を msg 本体に戻す
      const first = (msg.bubbles || [])[0] || {};
      if (msg.type === 'card') {
        updateMessage(idx, { isCarousel: false, bubbles: undefined, title: first.title, body: first.body, imageUrl: first.imageUrl, buttons: first.buttons });
      } else if (msg.type === 'image') {
        updateMessage(idx, { isCarousel: false, bubbles: undefined, originalUrl: first.originalUrl, linkUrl: first.linkUrl, linkCampaign: first.linkCampaign, imageFullWidth: first.imageFullWidth, imageAspectRatio: first.imageAspectRatio, imageAspectMode: first.imageAspectMode, imageNaturalWidth: first.imageNaturalWidth, imageNaturalHeight: first.imageNaturalHeight });
      }
    } else {
      // ON: msg 本体の内容を bubbles[0] に移し、空の bubbles[1] を追加
      if (msg.type === 'card') {
        updateMessage(idx, {
          isCarousel: true,
          bubbles: [
            { title: msg.title, body: msg.body, imageUrl: msg.imageUrl, buttons: msg.buttons },
            { title: '', body: '', buttons: [] },
          ],
        });
      } else if (msg.type === 'image') {
        updateMessage(idx, {
          isCarousel: true,
          bubbles: [
            { originalUrl: msg.originalUrl, linkUrl: msg.linkUrl, linkCampaign: msg.linkCampaign, imageFullWidth: msg.imageFullWidth, imageAspectRatio: msg.imageAspectRatio, imageAspectMode: msg.imageAspectMode, imageNaturalWidth: msg.imageNaturalWidth, imageNaturalHeight: msg.imageNaturalHeight },
            { originalUrl: '' },
          ],
        });
      }
    }
  };

  const updateMessage = (idx: number, patch: Partial<MessageItem>) => {
    setMessages(messages.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
    if (translatedMessages.length > 0) { setTranslatedMessages([]); setShowTranslation(false); }
  };

  const removeMessage = (idx: number) => {
    setMessages(messages.filter((_, i) => i !== idx));
  };

  const moveMessage = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= messages.length) return;
    const copy = [...messages];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setMessages(copy);
  };

  const addButton = (msgIdx: number) => {
    const msg = messages[msgIdx];
    const buttons = [...(msg.buttons || []), { label: '', url: '' }];
    updateMessage(msgIdx, { buttons });
  };

  const updateButton = (msgIdx: number, btnIdx: number, patch: Partial<{ label: string; url: string; campaign: string; actionType: 'uri' | 'message'; messageText: string; color: string }>) => {
    const msg = messages[msgIdx];
    const buttons = (msg.buttons || []).map((b, i) => (i === btnIdx ? { ...b, ...patch } : b));
    updateMessage(msgIdx, { buttons });
  };

  const removeButton = (msgIdx: number, btnIdx: number) => {
    const msg = messages[msgIdx];
    const buttons = (msg.buttons || []).filter((_, i) => i !== btnIdx);
    updateMessage(msgIdx, { buttons });
  };

  // --- Carousel helpers ---
  const addCarouselBubble = (msgIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.isCarousel) return;
    const newBubble: CarouselBubble = msg.type === 'image' ? { originalUrl: '' } : { title: '', body: '', buttons: [] };
    const bubbles = [...(msg.bubbles || []), newBubble];
    updateMessage(msgIdx, { bubbles });
    setCarouselActiveTab(prev => ({ ...prev, [msgIdx]: bubbles.length - 1 }));
  };

  const removeCarouselBubble = (msgIdx: number, bubbleIdx: number) => {
    const msg = messages[msgIdx];
    if (!msg.isCarousel) return;
    const bubbles = (msg.bubbles || []).filter((_, i) => i !== bubbleIdx);
    updateMessage(msgIdx, { bubbles });
    setCarouselActiveTab(prev => ({ ...prev, [msgIdx]: Math.min(prev[msgIdx] ?? 0, Math.max(0, bubbles.length - 1)) }));
  };

  const updateCarouselBubble = (msgIdx: number, bubbleIdx: number, patch: Partial<CarouselBubble>) => {
    const msg = messages[msgIdx];
    if (!msg.isCarousel) return;
    const bubbles = (msg.bubbles || []).map((b, i) => i === bubbleIdx ? { ...b, ...patch } : b);
    updateMessage(msgIdx, { bubbles });
  };

  const addCarouselBubbleButton = (msgIdx: number, bubbleIdx: number) => {
    const bubble = (messages[msgIdx]?.bubbles || [])[bubbleIdx];
    if (!bubble) return;
    updateCarouselBubble(msgIdx, bubbleIdx, { buttons: [...(bubble.buttons || []), { label: '', url: '' }] });
  };

  const updateCarouselBubbleButton = (msgIdx: number, bubbleIdx: number, btnIdx: number, patch: Partial<{ label: string; url: string; campaign: string; actionType: 'uri' | 'message'; messageText: string; color: string }>) => {
    const bubble = (messages[msgIdx]?.bubbles || [])[bubbleIdx];
    if (!bubble) return;
    updateCarouselBubble(msgIdx, bubbleIdx, { buttons: (bubble.buttons || []).map((b, i) => i === btnIdx ? { ...b, ...patch } : b) });
  };

  const removeCarouselBubbleButton = (msgIdx: number, bubbleIdx: number, btnIdx: number) => {
    const bubble = (messages[msgIdx]?.bubbles || [])[bubbleIdx];
    if (!bubble) return;
    updateCarouselBubble(msgIdx, bubbleIdx, { buttons: (bubble.buttons || []).filter((_, i) => i !== btnIdx) });
  };

  // --- Image upload ---
  const handleImageUpload = async (msgIdx: number, file: File, field: 'originalUrl' | 'imageUrl', naturalW?: number, naturalH?: number) => {
    setUploading(msgIdx);
    try {
      const result = await uploadImage(file);
      if ('error' in result) {
        setResultMsg({ type: 'error', text: result.error });
      } else {
        const patch: Partial<MessageItem> = { [field]: result.url };
        if (field === 'originalUrl' && naturalW && naturalH) {
          patch.imageNaturalWidth = naturalW;
          patch.imageNaturalHeight = naturalH;
          if (!messages[msgIdx]?.imageAspectRatio || messages[msgIdx]?.imageAspectRatio === 'original') {
            patch.imageAspectRatio = 'original';
          }
        }
        updateMessage(msgIdx, patch);
      }
    } catch {
      setResultMsg({ type: 'error', text: '画像のアップロードに失敗しました' });
    } finally {
      setUploading(null);
    }
  };

  // --- Image select → crop modal ---
  const handleImageSelect = (msgIdx: number, file: File, field: 'originalUrl' | 'imageUrl', bubbleIdx?: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropModal({ imgSrc: reader.result as string, msgIdx, field, bubbleIdx });
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!cropModal) return;
    const { msgIdx, field, imgSrc, bubbleIdx } = cropModal;

    const uploadAndApply = async (file: File, natW?: number, natH?: number) => {
      setCropModal(null);
      if (bubbleIdx !== undefined) {
        // カルーセルバブルの画像
        setUploading(msgIdx);
        try {
          const result = await uploadImage(file);
          if ('error' in result) { setResultMsg({ type: 'error', text: result.error }); }
          else { updateCarouselBubble(msgIdx, bubbleIdx, { imageUrl: result.url }); }
        } catch { setResultMsg({ type: 'error', text: '画像のアップロードに失敗しました' }); }
        finally { setUploading(null); }
      } else {
        await handleImageUpload(msgIdx, file, field, natW, natH);
      }
    };

    if (completedCrop && cropImgRef.current) {
      // トリミングしてアップロード
      const canvas = document.createElement('canvas');
      const img = cropImgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const w = Math.round(completedCrop.width * scaleX);
      const h = Math.round(completedCrop.height * scaleY);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        completedCrop.x * scaleX, completedCrop.y * scaleY,
        w, h,
        0, 0, w, h,
      );
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92));
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      await uploadAndApply(file, w, h);
    } else {
      // トリミングなし → 元画像サイズを検出してアップロード
      const img = cropImgRef.current;
      const natW = img?.naturalWidth || 0;
      const natH = img?.naturalHeight || 0;
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      await uploadAndApply(file, natW, natH);
    }
  };

  // --- Actions ---
  const handleSend = async (testUserIds?: string[]) => {
    const currentMethod = testUserIds ? 'test' : deliveryMethod;
    const methodLabel = currentMethod === 'broadcast' ? '全友達に配信'
      : currentMethod === 'narrowcast' ? `${AREA_OPTIONS.find(a => a.value === area)?.label || area}に配信`
      : currentMethod === 'db_users' ? `登録ユーザー${dbUserCount != null ? `（${dbUserCount}人）` : ''}に配信`
      : `テスト配信（${testUserIds?.length || testUsers.length}人）`;
    if (!confirm(`${methodLabel}しますか？`)) return;

    setSending(true);
    setResultMsg(null);
    try {
      const res = await api('POST', undefined, {
        action: 'send',
        name: campaignName || undefined,
        notificationText: notificationText || undefined,
        messages,
        deliveryMethod: currentMethod,
        area: currentMethod === 'narrowcast' && area ? area : undefined,
        gender: currentMethod === 'narrowcast' ? (gender || undefined) : (currentMethod === 'db_users' ? (dbGender || undefined) : undefined),
        ageRange: currentMethod === 'narrowcast' && ageRange ? ageRange : undefined,
        prefectures: currentMethod === 'db_users' && prefectures.length > 0 ? prefectures : undefined,
        recentDays: currentMethod === 'db_users' && recentDays ? Number(recentDays) : undefined,
        japaneseLevel: currentMethod === 'db_users' && dbJapaneseLevel.length > 0 ? dbJapaneseLevel : undefined,
        urgency: currentMethod === 'db_users' && dbUrgency ? dbUrgency : undefined,
        testUserIds: testUserIds || undefined,
        broadcastLang,
      });
      if (res.success) {
        setShowTestSendModal(false);
        try { window.localStorage.removeItem('bc_tmp'); } catch {}
        router.push('/dashboard/broadcast/history');
      } else {
        setResultMsg({ type: 'error', text: res.error || '配信に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await api('POST', undefined, {
        action: 'save_draft',
        id: editingDraftId || undefined,
        name: campaignName || undefined,
        notificationText: notificationText || undefined,
        messages,
        deliveryMethod,
        area: deliveryMethod === 'narrowcast' && area ? area : undefined,
        demographic: deliveryMethod === 'narrowcast'
          ? { gender: gender || undefined, age: ageRange || undefined }
          : deliveryMethod === 'db_users'
            ? {
                prefectures: prefectures.length > 0 ? prefectures : undefined,
                recentDays: recentDays || undefined,
                japaneseLevel: dbJapaneseLevel.length > 0 ? dbJapaneseLevel : undefined,
                urgency: dbUrgency || undefined,
                gender: dbGender || undefined,
              }
            : undefined,
        broadcastLang,
      });
      if (res.success) {
        setEditingDraftId(res.id);
        setResultMsg({ type: 'success', text: '下書き保存しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const buildScheduledISOString = () => {
    if (!schedDate) return '';
    const jstDate = new Date(`${schedDate}T${schedHour.padStart(2, '0')}:${schedMin.padStart(2, '0')}:00+09:00`);
    return jstDate.toISOString();
  };

  const handleSchedule = async (isTest = false) => {
    const isoStr = buildScheduledISOString();
    if (!isoStr) return;
    setSending(true);
    try {
      const res = await api('POST', undefined, {
        action: 'schedule',
        id: editingDraftId || undefined,
        name: campaignName || undefined,
        notificationText: notificationText || undefined,
        messages,
        deliveryMethod: isTest ? 'test' : deliveryMethod,
        area: deliveryMethod === 'narrowcast' && !isTest && area ? area : undefined,
        gender: deliveryMethod === 'narrowcast' && !isTest ? (gender || undefined) : (deliveryMethod === 'db_users' && !isTest ? (dbGender || undefined) : undefined),
        ageRange: deliveryMethod === 'narrowcast' && !isTest && ageRange ? ageRange : undefined,
        prefectures: deliveryMethod === 'db_users' && !isTest && prefectures.length > 0 ? prefectures : undefined,
        recentDays: deliveryMethod === 'db_users' && !isTest && recentDays ? Number(recentDays) : undefined,
        japaneseLevel: deliveryMethod === 'db_users' && !isTest && dbJapaneseLevel.length > 0 ? dbJapaneseLevel : undefined,
        urgency: deliveryMethod === 'db_users' && !isTest && dbUrgency ? dbUrgency : undefined,
        broadcastLang,
        scheduledAt: isoStr,
      });
      if (res.success) {
        try { window.localStorage.removeItem('bc_tmp'); } catch {}
        router.push('/dashboard/broadcast/history');
      }
    } catch {
      setResultMsg({ type: 'error', text: '予約に失敗しました' });
    } finally {
      setSending(false);
    }
  };

  const handleAddTestUser = async () => {
    if (!newTestUserId.trim()) return;
    const res = await api('POST', undefined, {
      action: 'add_test_user',
      lineUserId: newTestUserId.trim(),
      label: newTestLabel.trim() || undefined,
    });
    if (res.success) {
      setNewTestUserId('');
      setNewTestLabel('');
      loadData();
    }
  };

  const handleDeleteTestUser = async (id: string) => {
    await api('POST', undefined, { action: 'delete_test_user', id });
    loadData();
  };

  // --- 翻訳 ---
  const handleTranslate = async () => {
    if (messages.length === 0) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/dashboard/broadcast/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setTranslatedMessages(data.messages);
        setShowTranslation(true);
        setResultMsg({ type: 'success', text: '翻訳が完了しました' });
      } else {
        setResultMsg({ type: 'error', text: data.error || '翻訳に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '翻訳中にエラーが発生しました' });
    } finally {
      setTranslating(false);
    }
  };

  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);

  const handleTranslateMessage = async (idx: number) => {
    const msg = messages[idx];
    if (!msg) return;
    setTranslatingIdx(idx);
    try {
      const res = await fetch('/api/dashboard/broadcast/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [msg] }),
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const translated = data.messages[0];
        setMessages(prev => prev.map((m, i) => i === idx ? { ...m, ...translated } : m));
      } else {
        setResultMsg({ type: 'error', text: data.error || '翻訳に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '翻訳中にエラーが発生しました' });
    } finally {
      setTranslatingIdx(null);
    }
  };

  // --- AI生成 ---
  const handleAiImageUpload = async (idx: number, file: File) => {
    setAiUploadingIdx(idx);
    try {
      const result = await uploadImage(file);
      if ('error' in result) {
        setResultMsg({ type: 'error', text: result.error });
      } else {
        setAiUploadedImages(prev => ({ ...prev, [idx]: result.url }));
      }
    } catch {
      setResultMsg({ type: 'error', text: '画像アップロードに失敗しました' });
    } finally {
      setAiUploadingIdx(null);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const fullPrompt = aiExtraNote.trim()
        ? `${aiPrompt.trim()}\n\n## 追加の指示\n${aiExtraNote.trim()}`
        : aiPrompt.trim();
      const payload: any = { prompt: fullPrompt, contentType: aiContentType };
      if (aiUseCombo) {
        payload.combo = aiCombo;
      } else {
        // 「いつもの」= テキスト + カード(画像あり)
        payload.combo = [{ type: 'text' }, { type: 'card', hasImage: true }];
      }

      const res = await fetch('/api/dashboard/broadcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        // アップロード済み画像をマージ + ボタンURLを差し替え
        const merged = data.messages.map((msg: any, idx: number) => {
          let m = { ...msg };
          const imgUrl = aiUploadedImages[idx];
          if (imgUrl && m.type === 'card') {
            m = { ...m, imageUrl: imgUrl };
          }
          if (imgUrl && m.type === 'image') {
            m = { ...m, originalUrl: imgUrl };
          }
          // カードのボタンURLを指定URLに差し替え
          if (m.type === 'card' && m.buttons && aiButtonUrl.trim()) {
            m.buttons = m.buttons.map((b: any) => ({ ...b, url: aiButtonUrl.trim() }));
          }
          return m;
        });
        setMessages(merged);
        setShowAiModal(false);
        setAiUploadedImages({});
        setResultMsg({ type: 'success', text: `AIがメッセージを${merged.length}件生成しました` });
      } else {
        setResultMsg({ type: 'error', text: data.error || 'AI生成に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: 'AI生成中にエラーが発生しました' });
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── インラインAI生成 ──────────────────────
  const AI_ROLES = [
    { value: 'intro', label: '導入' },
    { value: 'main', label: '本文' },
    { value: 'cta', label: 'CTA' },
    { value: 'closing', label: '締め' },
  ];
  const AI_APPEALS = [
    { value: 'benefit', label: 'メリット' },
    { value: 'urgency', label: '緊急性' },
    { value: 'curiosity', label: '好奇心' },
    { value: 'exclusivity', label: '限定感' },
    { value: 'empathy', label: '共感' },
  ];
  const AI_TONES = [
    { value: 'friendly', label: 'フレンドリー' },
    { value: 'formal', label: 'フォーマル' },
    { value: 'casual', label: 'カジュアル' },
    { value: 'energetic', label: '熱量高め' },
  ];

  const handleAiInlineGenerate = async (msgIdx: number, msgType: 'text' | 'card') => {
    setAiInlineGenerating(true);
    try {
      const res = await fetch('/api/dashboard/broadcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          messageType: msgType,
          role: aiInlineRole,
          appeal: aiInlineAppeal,
          tone: aiInlineTone,
          keywords: aiInlineKeywords,
          context: {
            campaignName,
            otherMessages: messages.filter((_, i) => i !== msgIdx).map(m => m.text || m.title || '').filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (data.message) {
        updateMessage(msgIdx, data.message);
        setAiInlineOpen(null);
        setAiInlineKeywords('');
      } else {
        setResultMsg({ type: 'error', text: data.error || 'AI生成に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: 'AI生成中にエラーが発生しました' });
    } finally {
      setAiInlineGenerating(false);
    }
  };

  // Narrowcast時の推定人数を計算（エリア × 性別 × 年齢の割合を掛け合わせ）
  const calcNarrowcastEstimate = (): number | null => {
    const base = targetedReaches ?? followerCount;
    if (!base || deliveryMethod !== 'narrowcast') return null;
    let multiplier = 1;
    let hasFilter = false;
    if (area) {
      hasFilter = true;
      if (areaEstimates[area]) {
        multiplier *= areaEstimates[area] / base;
      } else {
        return null; // エリア推定データなし
      }
    }
    if (gender) {
      hasFilter = true;
      if (genderPct[gender]) {
        multiplier *= genderPct[gender] / 100;
      } else {
        return null; // 性別推定データなし
      }
    }
    if (ageRange) {
      hasFilter = true;
      if (agePct[ageRange]) {
        multiplier *= agePct[ageRange] / 100;
      } else {
        return null; // 年齢推定データなし
      }
    }
    if (!hasFilter) return base; // フィルターなし = 全体
    return Math.round(base * multiplier);
  };

  const narrowcastEstimate = calcNarrowcastEstimate();
  const targetCount = deliveryMethod === 'test'
    ? testUsers.length
    : deliveryMethod === 'db_users'
      ? dbUserCount
      : deliveryMethod === 'narrowcast'
        ? narrowcastEstimate
        : (targetedReaches ?? followerCount);
  const isEstimate = deliveryMethod === 'narrowcast' && (!!area || !!gender || !!ageRange);

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メッセージ配信</h1>
        </div>
        <Link
          href="/dashboard/broadcast/history"
          className="text-sm text-[#d10a1c] hover:text-[#b00917] font-medium"
        >
          配信履歴 &rarr;
        </Link>
      </div>

      {/* Result message */}
      {resultMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${resultMsg.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {resultMsg.text}
        </div>
      )}

      {/* テストユーザー管理 (top section) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">テストユーザー</h3>
        <div className="flex gap-2 items-center mb-3">
          <input
            type="text"
            value={newTestUserId}
            onChange={(e) => setNewTestUserId(e.target.value)}
            placeholder="LINE User ID (U...)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
          />
          <input
            type="text"
            value={newTestLabel}
            onChange={(e) => setNewTestLabel(e.target.value)}
            placeholder="ラベル"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
          />
          <button onClick={handleAddTestUser} className="flex items-center gap-1.5 px-4 py-2 bg-[#eaae9e] hover:bg-[#d4917f] text-white rounded-lg text-sm font-medium whitespace-nowrap">
            <UserPlusIcon className="h-4 w-4" /> 追加
          </button>
        </div>
        {testUsers.length > 0 && (
          <div className="space-y-2">
            {testUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-1">
                {u.pictureUrl ? (
                  <img src={u.pictureUrl} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">?</div>
                )}
                <span className="text-sm font-medium text-gray-800">{u.displayName || u.label || '(不明)'}</span>
                <span className="text-xs text-gray-400 truncate">{u.lineUserId.slice(0, 16)}...</span>
                <button onClick={() => handleDeleteTestUser(u.id)} className="ml-auto p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {testUsers.length === 0 && (
          <p className="text-xs text-gray-400">テストユーザーが未登録です</p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ═══════ 左カラム: 設定 + エディタ ═══════ */}
        <div className="xl:col-span-2 space-y-4">

          {/* 配信方式 (2段構造) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">配信方式</h3>
            {/* グループ化ラジオ */}
            <div className="space-y-4">
              {DATA_SOURCE_OPTIONS.map((source) => (
                <div key={source.value}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{source.label}</p>
                  <div className="space-y-0.5">
                    {SUB_METHOD_OPTIONS[source.value].map((method) => (
                      <div key={method.value}>
                        <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          deliveryMethod === method.value ? 'bg-[#fdf2ef]' : 'hover:bg-gray-50'
                        }`}>
                          <input
                            type="radio"
                            name="deliveryMethod"
                            checked={deliveryMethod === method.value}
                            onChange={() => setDeliveryMethod(method.value)}
                            className="text-[#eaae9e] focus:ring-[#eaae9e] h-4 w-4"
                          />
                          <span className={`text-sm ${deliveryMethod === method.value ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {method.label}
                          </span>
                        </label>

                        {/* Narrowcast インラインフィルター */}
                        {method.value === 'narrowcast' && deliveryMethod === 'narrowcast' && (
                          <div className="ml-9 mr-3 mt-1 mb-2 space-y-3">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                              <p className="text-sm font-medium text-amber-800">LINE属性で絞り込んで配信</p>
                              <p className="text-xs text-amber-600 mt-0.5">LINEが推定した属性データで絞り込みます。</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">エリア</label>
                                <select
                                  value={area}
                                  onChange={(e) => setArea(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                >
                                  {AREA_OPTIONS.map((a) => (
                                    <option key={a.value} value={a.value}>
                                      {a.label}{a.value && areaEstimates[a.value] ? ` (≈${areaEstimates[a.value].toLocaleString()}人)` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">性別</label>
                                <select
                                  value={gender}
                                  onChange={(e) => setGender(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                >
                                  {GENDER_OPTIONS.map((g) => (
                                    <option key={g.value} value={g.value}>{g.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">年齢</label>
                                <select
                                  value={ageRange}
                                  onChange={(e) => setAgeRange(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                >
                                  {AGE_OPTIONS.map((a) => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              フィルター: {AREA_OPTIONS.find(a => a.value === area)?.label || '全国'} / {GENDER_OPTIONS.find(g => g.value === gender)?.label || '指定なし'} / {AGE_OPTIONS.find(a => a.value === ageRange)?.label || '指定なし'}
                            </div>
                          </div>
                        )}

                        {/* DB Users 複合フィルター */}
                        {method.value === 'db_users' && deliveryMethod === 'db_users' && (
                          <div className="ml-9 mr-3 mt-1 mb-2 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                              <p className="text-sm font-medium text-blue-800">DB登録ユーザーに個別配信</p>
                              <p className="text-xs text-blue-600 mt-0.5">条件を組み合わせて対象を絞り込めます（AND条件）</p>
                            </div>

                            {/* 都道府県 */}
                            <div>
                              <div className="flex items-center gap-3 mb-1.5">
                                <label className="text-xs font-semibold text-gray-700">都道府県</label>
                                <button onClick={() => setPrefectures([...ALL_PREFECTURE_CODES])} className="text-xs text-[#d10a1c] font-medium hover:underline">全選択</button>
                                <button onClick={() => setPrefectures([])} className="text-xs text-gray-500 font-medium hover:underline">全解除</button>
                                {prefectures.length > 0 && <span className="text-xs text-gray-400 ml-auto">{prefectures.length}件選択中</span>}
                              </div>
                              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {(() => {
                                  const allCounts = Object.values(prefectureCounts);
                                  const maxPrefCount = allCounts.length > 0 ? Math.max(...allCounts) : 0;
                                  return REGION_PREFECTURES.map((group) => {
                                    const groupCodes = group.prefectures.map(p => p.value);
                                    const allSelected = groupCodes.every(c => prefectures.includes(c));
                                    const someSelected = groupCodes.some(c => prefectures.includes(c));
                                    const regionCount = groupCodes.reduce((sum, c) => sum + (prefectureCounts[c] || 0), 0);
                                    return (
                                      <div key={group.region} className="px-3 py-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={allSelected}
                                            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                            onChange={() => {
                                              if (allSelected) setPrefectures(prev => prev.filter(p => !groupCodes.includes(p)));
                                              else setPrefectures(prev => [...new Set([...prev, ...groupCodes])]);
                                            }}
                                            className="rounded border-gray-300 text-[#eaae9e] focus:ring-[#eaae9e] h-3.5 w-3.5"
                                          />
                                          <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                                          {regionCount > 0 && <span className="text-xs text-gray-400 ml-auto">{regionCount.toLocaleString()}人</span>}
                                        </label>
                                        <div className="ml-5 mt-0.5 flex flex-wrap gap-x-1 gap-y-0">
                                          {group.prefectures.map((p) => {
                                            const checked = prefectures.includes(p.value);
                                            const cnt = prefectureCounts[p.value] || 0;
                                            const isTop = maxPrefCount > 0 && cnt === maxPrefCount;
                                            return (
                                              <label key={p.value} className="flex items-center gap-1 cursor-pointer min-w-[120px]">
                                                <input type="checkbox" checked={checked}
                                                  onChange={() => setPrefectures(prev => checked ? prev.filter(v => v !== p.value) : [...prev, p.value])}
                                                  className="rounded border-gray-300 text-[#eaae9e] focus:ring-[#eaae9e] h-3 w-3"
                                                />
                                                <span className="text-xs text-gray-700">{p.label}</span>
                                                {cnt > 0 && <span className={`text-xs font-medium ${isTop ? 'text-[#d10a1c]' : 'text-gray-400'}`}>({cnt})</span>}
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>

                            {/* 友達追加時期 */}
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">友達追加時期</label>
                              <div className="flex gap-2">
                                {RECENT_PERIOD_OPTIONS.map((opt) => (
                                  <button key={opt.value} onClick={() => setRecentDays(opt.value)}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                      recentDays === opt.value ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 日本語レベル */}
                            <div>
                              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">日本語レベル</label>
                              <div className="flex flex-wrap gap-1.5">
                                {JP_LEVEL_OPTIONS.map((opt) => {
                                  const selected = dbJapaneseLevel.includes(opt.value);
                                  return (
                                    <button key={opt.value}
                                      onClick={() => setDbJapaneseLevel(prev => selected ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                                      className={`py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                                        selected ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                                {dbJapaneseLevel.length > 0 && (
                                  <button onClick={() => setDbJapaneseLevel([])} className="text-xs text-gray-400 hover:text-gray-600 ml-1">クリア</button>
                                )}
                              </div>
                            </div>

                            {/* 求職緊急度 + 性別 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">求職緊急度</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {URGENCY_OPTIONS.map((opt) => (
                                    <button key={opt.value} onClick={() => setDbUrgency(opt.value)}
                                      className={`py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                                        dbUrgency === opt.value ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">性別</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {DB_GENDER_OPTIONS.map((opt) => (
                                    <button key={opt.value} onClick={() => setDbGender(opt.value)}
                                      className={`py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                                        dbGender === opt.value ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 対象ユーザー数 */}
                            <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">対象ユーザー</span>
                              <span className="text-lg font-bold text-gray-900">
                                {dbCountLoading ? (
                                  <span className="text-sm text-gray-400">計算中...</span>
                                ) : dbUserCount != null ? (
                                  `${dbUserCount.toLocaleString()}人`
                                ) : (
                                  <span className="text-sm text-gray-400">条件を選択してください</span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 配信対象数 */}
            <div className="mt-3 text-sm text-gray-600">
              配信対象:{' '}
              <span className="font-bold text-gray-900">
                {targetCount !== null
                  ? `${isEstimate ? '≈ ' : ''}${targetCount.toLocaleString()}人`
                  : deliveryMethod === 'db_users'
                    ? (dbCountLoading ? '計算中...' : '条件を選択してください')
                    : deliveryMethod === 'narrowcast' && (area || gender || ageRange)
                      ? '推定データなし'
                      : '取得中...'}
              </span>
              {isEstimate && (
                <span className="text-xs text-gray-400 ml-1.5">（デモグラフィック推定）</span>
              )}
              {deliveryMethod === 'db_users' && dbUserCount != null && (
                <span className="text-xs text-gray-400 ml-1.5">（DB登録ユーザー）</span>
              )}
            </div>

            {/* 配信タイミング */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode('now')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    scheduleMode === 'now' ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  今すぐ配信
                </button>
                <button
                  onClick={() => setScheduleMode('scheduled')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    scheduleMode === 'scheduled' ? 'bg-[#eaae9e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  予約配信
                </button>
              </div>
              {scheduleMode === 'scheduled' && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e] cursor-pointer"
                  />
                  <select
                    value={schedHour}
                    onChange={(e) => setSchedHour(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i)}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-sm">:</span>
                  <select
                    value={schedMin}
                    onChange={(e) => setSchedMin(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const v = String(i * 5).padStart(2, '0');
                      return <option key={v} value={v}>{v}</option>;
                    })}
                  </select>
                  <span className="text-gray-400 text-xs">(JST)</span>
                </div>
              )}
            </div>
          </div>

          {/* タイトル管理テキスト + 通知テキスト */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル管理テキスト <span className="font-normal text-gray-400">（管理用・配信には含まれません）</span></label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="例: 3月キャンペーン告知"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">通知テキスト <span className="font-normal text-gray-400">（プッシュ通知・メッセージ一覧に表示されます）</span></label>
              <input
                type="text"
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                placeholder="例: 新しいお知らせが届いています"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
              />
            </div>
          </div>

          {/* メッセージセクション */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                メッセージ ({messages.length}/5)
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => addMessage('text')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> +テキスト
                </button>
                <button
                  onClick={() => addMessage('card')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <Squares2X2Icon className="h-3.5 w-3.5" /> +カード
                </button>
                <button
                  onClick={() => addMessage('image')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <PhotoIcon className="h-3.5 w-3.5" /> +画像
                </button>
                <div className="w-px h-5 bg-gray-300" />
                <button
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-xs font-medium shadow-sm"
                >
                  <SparklesIcon className="h-3.5 w-3.5" /> AIで作成
                </button>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 text-sm">
                上のボタンからメッセージを追加してください
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {msg.type === 'text' ? 'テキスト' : msg.type === 'card' ? 'カード' : '画像'}{msg.isCarousel ? ' (カルーセル)' : ''} #{idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {(msg.type === 'card' || msg.type === 'image') && (
                          <button
                            onClick={() => toggleCarousel(idx)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${msg.isCarousel ? 'bg-[#eaae9e] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            title="カルーセル表示"
                          >
                            <Squares2X2Icon className="h-3.5 w-3.5" />
                            カルーセル
                          </button>
                        )}
                        {(msg.type === 'text' || msg.type === 'card') && (
                          <button
                            onClick={() => handleTranslateMessage(idx)}
                            disabled={translatingIdx === idx}
                            className="flex items-center gap-0.5 px-1.5 py-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded text-xs font-medium disabled:opacity-50"
                            title="英語に翻訳"
                          >
                            <LanguageIcon className="h-3.5 w-3.5" />
                            {translatingIdx === idx ? '...' : '翻訳'}
                          </button>
                        )}
                        <button onClick={() => moveMessage(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded hover:bg-gray-100">
                          <ArrowUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveMessage(idx, 1)} disabled={idx === messages.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded hover:bg-gray-100">
                          <ArrowDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeMessage(idx)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Text */}
                    {msg.type === 'text' && (
                      <div className="space-y-2">
                        <textarea
                          value={msg.text || ''}
                          onChange={(e) => updateMessage(idx, { text: e.target.value })}
                          placeholder="メッセージテキスト..."
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                        {/* インラインAI生成 */}
                        <button
                          onClick={() => setAiInlineOpen(aiInlineOpen === idx ? null : idx)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <SparklesIcon className="h-3.5 w-3.5" />
                          AIで作成
                        </button>
                        {aiInlineOpen === idx && (
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">役割</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_ROLES.map(r => (
                                  <button key={r.value} onClick={() => setAiInlineRole(r.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineRole === r.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">訴求スタイル</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_APPEALS.map(a => (
                                  <button key={a.value} onClick={() => setAiInlineAppeal(a.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineAppeal === a.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">トーン</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_TONES.map(t => (
                                  <button key={t.value} onClick={() => setAiInlineTone(t.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineTone === t.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={aiInlineKeywords}
                                onChange={(e) => setAiInlineKeywords(e.target.value)}
                                placeholder="キーワード・補足情報（任意）"
                                className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                              />
                            </div>
                            <button
                              onClick={() => handleAiInlineGenerate(idx, 'text')}
                              disabled={aiInlineGenerating}
                              className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <SparklesIcon className="h-3.5 w-3.5" />
                              {aiInlineGenerating ? '生成中...' : '生成する'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card */}
                    {msg.type === 'card' && (
                      <div className="space-y-3">
                        {msg.isCarousel ? (
                          <>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                              {(msg.bubbles || []).map((_, bi) => (
                                <button
                                  key={bi}
                                  onClick={() => setCarouselActiveTab(prev => ({ ...prev, [idx]: bi }))}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                                    (carouselActiveTab[idx] ?? 0) === bi ? 'bg-[#eaae9e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  カード {bi + 1}
                                  {(msg.bubbles || []).length > 2 && (
                                    <span onClick={(e) => { e.stopPropagation(); removeCarouselBubble(idx, bi); }} className="ml-0.5 hover:text-red-300 cursor-pointer">
                                      <XMarkIcon className="h-3 w-3" />
                                    </span>
                                  )}
                                </button>
                              ))}
                              {(msg.bubbles || []).length < 12 && (
                                <button onClick={() => addCarouselBubble(idx)} className="px-2 py-1 text-xs text-[#d10a1c] font-medium hover:underline whitespace-nowrap">+ カード追加</button>
                              )}
                            </div>
                            {(() => {
                              const bi = carouselActiveTab[idx] ?? 0;
                              const bubble = (msg.bubbles || [])[bi];
                              if (!bubble) return null;
                              return (
                                <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル</label>
                                    <input type="text" value={bubble.title || ''} onChange={(e) => updateCarouselBubble(idx, bi, { title: e.target.value })} placeholder="例: 飲食店スタッフ募集中！" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">本文</label>
                                    <textarea value={bubble.body || ''} onChange={(e) => updateCarouselBubble(idx, bi, { body: e.target.value })} placeholder="例: 時給1,200円〜、週3日からOK" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">画像 (任意)</label>
                                    {bubble.imageUrl ? (
                                      <div className="relative inline-block">
                                        <img src={bubble.imageUrl} alt="" className="h-20 rounded-lg object-cover border border-gray-200" />
                                        <button onClick={() => updateCarouselBubble(idx, bi, { imageUrl: '' })} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><XMarkIcon className="h-3 w-3" /></button>
                                      </div>
                                    ) : (
                                      <label className={`inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors text-xs text-gray-500 ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <ArrowUpTrayIcon className="h-4 w-4" />
                                        {uploading === idx ? 'アップロード中...' : '画像を選択'}
                                        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(idx, f, 'imageUrl', bi); e.target.value = ''; }} />
                                      </label>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500 block">ボタン</label>
                                    {(bubble.buttons || []).map((btn, bni) => (
                                      <div key={bni} className="border border-gray-200 rounded-lg p-2.5 space-y-2">
                                        <div className="flex gap-2 items-center">
                                          <div className="flex bg-gray-100 rounded-md p-0.5">
                                            <button onClick={() => updateCarouselBubbleButton(idx, bi, bni, { actionType: 'uri' })} className={`px-2 py-1 rounded text-xs font-medium transition-all ${(!btn.actionType || btn.actionType === 'uri') ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>URL</button>
                                            <button onClick={() => updateCarouselBubbleButton(idx, bi, bni, { actionType: 'message' })} className={`px-2 py-1 rounded text-xs font-medium transition-all ${btn.actionType === 'message' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>テキスト送信</button>
                                          </div>
                                          <input type="text" value={btn.label || ''} onChange={(e) => updateCarouselBubbleButton(idx, bi, bni, { label: e.target.value })} placeholder="ボタンラベル" className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                          <input type="color" value={btn.color || '#f9c93e'} onChange={(e) => updateCarouselBubbleButton(idx, bi, bni, { color: e.target.value })} title="ボタンの色" className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer p-0.5" />
                                          <button onClick={() => removeCarouselBubbleButton(idx, bi, bni)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50"><XMarkIcon className="h-3.5 w-3.5" /></button>
                                        </div>
                                        <div className="flex gap-2">
                                          {btn.actionType === 'message' ? (
                                            <input type="text" value={btn.messageText || ''} onChange={(e) => updateCarouselBubbleButton(idx, bi, bni, { messageText: e.target.value })} placeholder="ユーザーが送信するテキスト" className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                          ) : (
                                            <input type="text" value={btn.url || ''} onChange={(e) => updateCarouselBubbleButton(idx, bi, bni, { url: e.target.value })} placeholder="https://..." className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    <button onClick={() => addCarouselBubbleButton(idx, bi)} className="text-xs text-[#d10a1c] font-medium hover:underline">+ ボタン追加</button>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                        <>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル</label>
                          <input
                            type="text"
                            value={msg.title || ''}
                            onChange={(e) => updateMessage(idx, { title: e.target.value })}
                            placeholder="例: 飲食店スタッフ募集中！"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">本文</label>
                          <textarea
                            value={msg.body || ''}
                            onChange={(e) => updateMessage(idx, { body: e.target.value })}
                            placeholder="例: 時給1,200円〜、週3日からOK"
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">画像 (任意)</label>
                          {msg.imageUrl ? (
                            <div className="relative inline-block">
                              <img src={msg.imageUrl} alt="" className="h-20 rounded-lg object-cover border border-gray-200" />
                              <button
                                onClick={() => updateMessage(idx, { imageUrl: '' })}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className={`inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors text-xs text-gray-500 ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              {uploading === idx ? 'アップロード中...' : '画像を選択'}
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(idx, f, 'imageUrl'); e.target.value = ''; }} />
                            </label>
                          )}
                        </div>
                        {/* Buttons */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-500 block">ボタン</label>
                          {(msg.buttons || []).map((btn, bi) => (
                            <div key={bi} className="border border-gray-200 rounded-lg p-2.5 space-y-2">
                              <div className="flex gap-2 items-center">
                                <div className="flex bg-gray-100 rounded-md p-0.5">
                                  <button
                                    onClick={() => updateButton(idx, bi, { actionType: 'uri' })}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${(!btn.actionType || btn.actionType === 'uri') ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                                  >
                                    URL
                                  </button>
                                  <button
                                    onClick={() => updateButton(idx, bi, { actionType: 'message' })}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${btn.actionType === 'message' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                                  >
                                    テキスト送信
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={btn.label}
                                  onChange={(e) => updateButton(idx, bi, { label: e.target.value })}
                                  placeholder="ボタンラベル"
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                />
                                <input
                                  type="color"
                                  value={btn.color || '#f9c93e'}
                                  onChange={(e) => updateButton(idx, bi, { color: e.target.value })}
                                  title="ボタンの色"
                                  className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer p-0.5"
                                />
                                <button onClick={() => removeButton(idx, bi)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                {btn.actionType === 'message' ? (
                                  <input
                                    type="text"
                                    value={btn.messageText || ''}
                                    onChange={(e) => updateButton(idx, bi, { messageText: e.target.value })}
                                    placeholder="ユーザーが送信するテキスト"
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={btn.url}
                                    onChange={(e) => updateButton(idx, bi, { url: e.target.value })}
                                    placeholder="https://..."
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addButton(idx)} className="text-xs text-[#d10a1c] font-medium hover:underline">
                            + ボタン追加
                          </button>
                        </div>
                        {/* インラインAI生成（カード） */}
                        <button
                          onClick={() => setAiInlineOpen(aiInlineOpen === idx ? null : idx)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <SparklesIcon className="h-3.5 w-3.5" />
                          AIで作成
                        </button>
                        {aiInlineOpen === idx && (
                          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">役割</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_ROLES.map(r => (
                                  <button key={r.value} onClick={() => setAiInlineRole(r.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineRole === r.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">訴求スタイル</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_APPEALS.map(a => (
                                  <button key={a.value} onClick={() => setAiInlineAppeal(a.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineAppeal === a.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-purple-700 mb-1.5">トーン</p>
                              <div className="flex flex-wrap gap-1.5">
                                {AI_TONES.map(t => (
                                  <button key={t.value} onClick={() => setAiInlineTone(t.value)}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${aiInlineTone === t.value ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'}`}>
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={aiInlineKeywords}
                                onChange={(e) => setAiInlineKeywords(e.target.value)}
                                placeholder="キーワード・補足情報（任意）"
                                className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                              />
                            </div>
                            <button
                              onClick={() => handleAiInlineGenerate(idx, 'card')}
                              disabled={aiInlineGenerating}
                              className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <SparklesIcon className="h-3.5 w-3.5" />
                              {aiInlineGenerating ? '生成中...' : '生成する'}
                            </button>
                          </div>
                        )}
                        </>
                        )}
                      </div>
                    )}


                    {/* Image */}
                    {msg.type === 'image' && (
                      <div className="space-y-3">
                        {msg.isCarousel ? (
                          <>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                              {(msg.bubbles || []).map((_, bi) => (
                                <button key={bi} onClick={() => setCarouselActiveTab(prev => ({ ...prev, [idx]: bi }))} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${(carouselActiveTab[idx] ?? 0) === bi ? 'bg-[#eaae9e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                  画像 {bi + 1}
                                  {(msg.bubbles || []).length > 2 && (
                                    <span onClick={(e) => { e.stopPropagation(); removeCarouselBubble(idx, bi); }} className="ml-0.5 hover:text-red-300 cursor-pointer"><XMarkIcon className="h-3 w-3" /></span>
                                  )}
                                </button>
                              ))}
                              {(msg.bubbles || []).length < 12 && (
                                <button onClick={() => addCarouselBubble(idx)} className="px-2 py-1 text-xs text-[#d10a1c] font-medium hover:underline whitespace-nowrap">+ 画像追加</button>
                              )}
                            </div>
                            {(() => {
                              const bi = carouselActiveTab[idx] ?? 0;
                              const bubble = (msg.bubbles || [])[bi];
                              if (!bubble) return null;
                              return (
                                <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                                  {bubble.originalUrl ? (
                                    <div className="relative inline-block">
                                      <img src={bubble.originalUrl} alt="" className="h-28 rounded-lg object-cover border border-gray-200" />
                                      <button onClick={() => updateCarouselBubble(idx, bi, { originalUrl: '' })} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><XMarkIcon className="h-3 w-3" /></button>
                                    </div>
                                  ) : (
                                    <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                                      <ArrowUpTrayIcon className="h-5 w-5 text-gray-400" />
                                      <span className="text-sm text-gray-500">{uploading === idx ? 'アップロード中...' : '画像を選択'}</span>
                                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(idx, f, 'originalUrl', bi); e.target.value = ''; }} />
                                    </label>
                                  )}
                                  <input type="text" value={bubble.linkUrl || ''} onChange={(e) => updateCarouselBubble(idx, bi, { linkUrl: e.target.value })} placeholder="リンク先URL (任意: タップ時に遷移)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]" />
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                        {msg.originalUrl ? (
                          <div className="relative inline-block">
                            <img src={msg.originalUrl} alt="" className="h-28 rounded-lg object-cover border border-gray-200" />
                            <button
                              onClick={() => updateMessage(idx, { originalUrl: '' })}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                            <ArrowUpTrayIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">{uploading === idx ? 'アップロード中...' : '画像を選択'}</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelect(idx, f, 'originalUrl'); e.target.value = ''; }} />
                          </label>
                        )}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <div
                              className={`relative w-9 h-5 rounded-full transition-colors ${msg.imageFullWidth ? 'bg-[#d10a1c]' : 'bg-gray-300'}`}
                              onClick={() => updateMessage(idx, { imageFullWidth: !msg.imageFullWidth })}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${msg.imageFullWidth ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-sm text-gray-600">画面いっぱいに表示</span>
                          </label>
                        </div>
                        {(msg.imageFullWidth || msg.linkUrl) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">比率:</span>
                            {['original', '20:13', '1:1', '3:4'].map((r) => {
                              const current = msg.imageAspectRatio || 'original';
                              const label = r === 'original' ? 'オリジナル' : r === '20:13' ? '横長' : r === '1:1' ? '正方形' : '縦長';
                              return (
                                <button
                                  key={r}
                                  onClick={() => updateMessage(idx, { imageAspectRatio: r, imageAspectMode: r === 'original' ? 'cover' : msg.imageAspectMode })}
                                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${current === r ? 'bg-[#d10a1c] text-white border-[#d10a1c]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <input
                          type="text"
                          value={msg.linkUrl || ''}
                          onChange={(e) => updateMessage(idx, { linkUrl: e.target.value })}
                          placeholder="リンク先URL (任意: タップ時に遷移)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ═══════ 右カラム: プレビュー ═══════ */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">プレビュー</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (showTranslation) {
                      setShowTranslation(false);
                    } else if (translatedMessages.length > 0) {
                      setShowTranslation(true);
                    } else {
                      handleTranslate();
                    }
                  }}
                  disabled={messages.length === 0 || translating}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium disabled:opacity-50 transition-colors"
                >
                  <LanguageIcon className="h-3.5 w-3.5" />
                  {translating ? '翻訳中...' : showTranslation ? '翻訳を閉じる' : '英語に翻訳'}
                </button>
              </div>
            </div>

            {showTranslation && translatedMessages.length > 0 ? (
              /* ── 左右比較ビュー ── */
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 text-center mb-2">日本語</p>
                  <div className="bg-[#7B9EBC] rounded-xl p-2.5 space-y-2 min-h-[300px]">
                    {messages.map((msg, idx) => (
                      <PreviewBubble key={idx} msg={msg} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 text-center mb-2">English</p>
                  <div className="bg-[#7B9EBC] rounded-xl p-2.5 space-y-2 min-h-[300px]">
                    {translatedMessages.map((msg, idx) => (
                      <PreviewBubble key={idx} msg={msg} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── 通常プレビュー（iPhone LINE風） ── */
              <div className="flex justify-center">
                <div className="rounded-[2rem] overflow-hidden shadow-lg border border-gray-300" style={{ width: 375 }}>
                  {/* ── LINEヘッダー ── */}
                  <div className="bg-[#4A6E8A] px-4 py-2.5 flex items-center gap-3">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    <div className="flex items-center gap-2 flex-1">
                      {botProfile?.pictureUrl ? (
                        <img src={botProfile.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/30" />
                      )}
                      <span className="text-white text-[13px] font-semibold">{botProfile?.displayName || 'LINE公式アカウント'}</span>
                    </div>
                  </div>
                  {/* ── チャット領域 ── */}
                  <div className="bg-[#7B9EBC] px-2.5 py-3 min-h-[480px]">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-[400px] text-white/50 text-xs">
                        メッセージ未追加
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((msg, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            {botProfile?.pictureUrl ? (
                              <img src={botProfile.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/30 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <PreviewBubble msg={msg} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* ── 入力欄風 ── */}
                  <div className="bg-[#F7F7F7] px-3 py-2 flex items-center gap-2 border-t border-gray-200">
                    <div className="w-7 h-7 rounded-full bg-gray-300" />
                    <div className="flex-1 bg-white rounded-full border border-gray-300 px-3 py-1.5">
                      <span className="text-[11px] text-gray-400">Aa</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-300" />
                  </div>
                </div>
              </div>
            )}

            {showTranslation && translatedMessages.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  <LanguageIcon className="h-3.5 w-3.5" />
                  {translating ? '翻訳中...' : '再翻訳'}
                </button>
                <button
                  onClick={() => {
                    setMessages(translatedMessages);
                    setBroadcastLang('en');
                    setShowTranslation(false);
                    setTranslatedMessages([]);
                    setResultMsg({ type: 'success', text: '英語版をメッセージに反映しました' });
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                >
                  英語版を採用
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ アクションバー ═══════ */}
      <div className="sticky bottom-0 z-30 -mx-6 px-6 py-3 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (scheduleMode === 'scheduled') {
                setShowScheduleConfirm({ isTest: false });
              } else {
                handleSend();
              }
            }}
            disabled={sending || messages.length === 0 || (scheduleMode === 'scheduled' && !schedDate)}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-[#d10a1c] hover:bg-[#b00917] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {scheduleMode === 'scheduled' ? <ClockIcon className="h-4 w-4" /> : <PaperAirplaneIcon className="h-4 w-4" />}
            {sending ? '送信中...' : scheduleMode === 'scheduled' ? '予約する' : '配信する'}
          </button>
          <button
            onClick={() => {
              setSelectedTestUserIds(testUsers.map(u => u.lineUserId));
              if (scheduleMode === 'scheduled') {
                setShowScheduleConfirm({ isTest: true });
              } else {
                setShowTestSendModal(true);
              }
            }}
            disabled={sending || messages.length === 0 || testUsers.length === 0 || (scheduleMode === 'scheduled' && !schedDate)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" /> {scheduleMode === 'scheduled' ? 'テスト予約' : 'テスト配信'}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSaveDraft}
            disabled={saving || messages.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <DocumentIcon className="h-4 w-4" /> {saving ? '保存中...' : '下書き保存'}
          </button>
          <Link
            href="/dashboard/broadcast/history"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <BookmarkIcon className="h-4 w-4" /> 下書き読み込み
          </Link>
        </div>
      </div>

      {/* ═══════ 最近の配信 ═══════ */}
      {recentCampaigns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">最近の配信</h3>
            <Link href="/dashboard/broadcast/history" className="text-xs text-[#d10a1c] hover:text-[#b00917] font-medium">
              配信履歴を見る &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentCampaigns.map((c) => {
              const stats = recentStats[c.id];
              const progress = recentProgress[c.id];
              const isTest = c.delivery_method === 'test';
              const isNarrowcast = c.delivery_method === 'narrowcast';
              const methodLabel = isTest ? 'Test' : isNarrowcast ? 'Narrowcast' : 'Broadcast';
              const execDate = c.executed_at
                ? new Date(c.executed_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              return (
                <div key={c.id} className={`rounded-lg border px-4 py-3 ${c.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-gray-800 truncate flex-1">{c.name || '無題の配信'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isTest ? 'bg-gray-200 text-gray-600' : 'bg-[#fdf2ef] text-[#d10a1c]'}`}>
                      {methodLabel}
                    </span>
                    <span className="text-xs text-gray-500">{execDate}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500">
                    {c.status === 'failed' ? (
                      <span className="text-red-600 font-medium">配信失敗{c.result?.error ? `: ${c.result.error}` : ''}</span>
                    ) : isTest ? (
                      <span>送信: {c.result?.successCount ?? '-'}人（テスト配信のため統計なし）</span>
                    ) : (
                      <span>
                        {/* Narrowcast: show actual send count from Progress API */}
                        {isNarrowcast && progress && (
                          <>
                            送信: <span className="font-medium text-gray-700">
                              {progress.phase === 'succeeded' || progress.phase === 'sending'
                                ? `${(progress.successCount ?? 0).toLocaleString()}人`
                                : progress.phase === 'waiting' ? '送信待ち' : '失敗'}
                            </span>
                            {' '}
                          </>
                        )}
                        {stats ? (
                          <>
                            開封: <span className="font-medium text-gray-700">{stats.uniqueImpression?.toLocaleString() ?? '-'}人</span>
                            {stats.uniqueImpression ? <span className="text-gray-400 ml-0.5">({((stats.uniqueClick || 0) / stats.uniqueImpression * 100).toFixed(0)}%クリック)</span> : null}
                            {' '}クリック: <span className="font-medium text-gray-700">{stats.uniqueClick?.toLocaleString() ?? '-'}人</span>
                            {recentConversions[c.id] !== undefined && recentConversions[c.id] !== null && (
                              <>{' '}応募: <span className={`font-medium ${recentConversions[c.id]! > 0 ? 'text-green-700' : 'text-gray-400'}`}>{recentConversions[c.id]}</span></>
                            )}
                          </>
                        ) : c.result?.aggUnit ? (
                          <>{!isNarrowcast || !progress ? <span className="text-gray-400">統計データ集計中...</span> : null}</>
                        ) : (
                          <span className="text-gray-400">統計なし</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ 画像トリミングモーダル ═══════ */}
      {cropModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCropModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">画像をトリミング</h3>
            <p className="text-xs text-gray-500 mb-3">ドラッグで切り取り範囲を選択してください。選択しなければそのままアップロードされます。</p>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 rounded-lg mb-4" style={{ minHeight: 200 }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  ref={cropImgRef}
                  src={cropModal.imgSrc}
                  alt=""
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                />
              </ReactCrop>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCropModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploading !== null}
                className="px-4 py-2 text-sm text-white bg-[#d10a1c] hover:bg-[#b00818] rounded-lg disabled:opacity-50"
              >
                {uploading !== null ? 'アップロード中...' : completedCrop ? 'トリミングして確定' : 'そのまま確定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 予約確認モーダル ═══════ */}
      {showScheduleConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !sending && setShowScheduleConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <ClockIcon className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {showScheduleConfirm.isTest ? 'テスト予約の確認' : '予約配信の確認'}
              </h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-4 mb-5">
              <div className="flex justify-between">
                <span className="text-gray-500">配信日時</span>
                <span className="font-medium text-gray-900">{schedDate} {schedHour.padStart(2, '0')}:{schedMin.padStart(2, '0')} JST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">配信方式</span>
                <span className="font-medium text-gray-900">
                  {showScheduleConfirm.isTest ? 'テスト' : deliveryMethod === 'broadcast' ? '全員' : deliveryMethod === 'narrowcast' ? '絞り込み' : deliveryMethod === 'db_users' ? '登録ユーザー' : deliveryMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">メッセージ数</span>
                <span className="font-medium text-gray-900">{messages.length}件</span>
              </div>
              {campaignName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">キャンペーン名</span>
                  <span className="font-medium text-gray-900 truncate ml-2">{campaignName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowScheduleConfirm(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  const isTest = showScheduleConfirm.isTest;
                  setShowScheduleConfirm(null);
                  handleSchedule(isTest);
                }}
                disabled={sending}
                className="flex-1 py-2.5 bg-[#d10a1c] hover:bg-[#b00917] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                予約する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ テスト配信ユーザー選択モーダル ═══════ */}
      {showTestSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !sending && setShowTestSendModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">テスト配信先を選択</h3>

            <div className="space-y-3 mb-5">
              {/* 全選択/全解除 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTestUserIds(testUsers.map(u => u.lineUserId))}
                  className="text-xs text-[#d10a1c] font-medium hover:underline"
                >
                  全選択
                </button>
                <button
                  onClick={() => setSelectedTestUserIds([])}
                  className="text-xs text-gray-500 font-medium hover:underline"
                >
                  全解除
                </button>
                <span className="text-xs text-gray-400 ml-auto">
                  {selectedTestUserIds.length}/{testUsers.length}人選択中
                </span>
              </div>

              {/* ユーザーリスト */}
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {testUsers.map((u) => {
                  const checked = selectedTestUserIds.includes(u.lineUserId);
                  return (
                    <label key={u.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedTestUserIds(prev =>
                            checked ? prev.filter(id => id !== u.lineUserId) : [...prev, u.lineUserId]
                          );
                        }}
                        className="rounded border-gray-300 text-[#eaae9e] focus:ring-[#eaae9e] h-4 w-4"
                      />
                      {u.pictureUrl ? (
                        <img src={u.pictureUrl} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">?</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.displayName || u.label || '(不明)'}</p>
                        <p className="text-xs text-gray-400 truncate">{u.lineUserId.slice(0, 20)}...</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTestSendModal(false)}
                disabled={sending}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleSend(selectedTestUserIds)}
                disabled={selectedTestUserIds.length === 0 || sending}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {sending ? '送信中...' : `${selectedTestUserIds.length}人に送信`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ AI生成モーダル ═══════ */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !aiGenerating && setShowAiModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">AIでメッセージ作成</h3>
            </div>

            <div className="space-y-4 mb-5">
              {/* 何を送るか */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">何を送る？</label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { value: 'job', label: '求人告知', icon: '💼' },
                    { value: 'event', label: 'イベント案内', icon: '🎉' },
                    { value: 'info', label: 'お知らせ', icon: '📢' },
                    { value: 'campaign', label: 'キャンペーン', icon: '🎁' },
                  ] as const).map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setAiContentType(ct.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        aiContentType === ct.value
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 本文入力 */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  {aiContentType === 'job' ? '求人ページの本文をそのまま貼り付けるだけでOK'
                    : aiContentType === 'event' ? 'イベントの詳細を入力'
                    : aiContentType === 'campaign' ? 'キャンペーンの内容を入力'
                    : 'お知らせの内容を入力'}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={aiContentType === 'job'
                    ? "求人詳細ページの本文をコピーして、ここにそのまま貼り付けてください。\nAIが自動で内容を読み取り、働きたくなるLINEメッセージを作成します。"
                    : aiContentType === 'event'
                    ? "イベント名、日時、場所、内容、参加方法など"
                    : aiContentType === 'campaign'
                    ? "キャンペーン名、期間、内容、特典など"
                    : "お知らせの内容を入力してください"}
                  rows={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              {/* 追加の指示 */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  追加で記載してほしい内容（任意）
                </label>
                <input
                  type="text"
                  value={aiExtraNote}
                  onChange={(e) => setAiExtraNote(e.target.value)}
                  placeholder="例: 高時給を強調して、急募感を出してほしい"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              {/* ボタンURL */}
              {(aiUseCombo ? aiCombo.some(s => s.type === 'card') : true) && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    カードボタンのリンク先URL
                  </label>
                  <input
                    type="url"
                    value={aiButtonUrl}
                    onChange={(e) => setAiButtonUrl(e.target.value)}
                    placeholder="https://www.yolo-japan.com/en/recruit/job/details/<求人ID>"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
              )}

              {/* メッセージ構成 */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">メッセージ構成</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setAiUseCombo(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      !aiUseCombo
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    いつもの
                  </button>
                  <button
                    onClick={() => setAiUseCombo(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      aiUseCombo
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    構成を指定
                  </button>
                </div>

                {/* いつもの: テキスト + カード(画像あり) 固定 + 画像アップロード */}
                {!aiUseCombo && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-2">
                    <div className="text-xs text-gray-500">テキスト + カード（画像あり）の2通構成</div>
                    <div>
                      <span className="text-xs text-gray-500 mr-2">カード画像:</span>
                      {aiUploadedImages[1] ? (
                        <div className="inline-flex items-center gap-2">
                          <img src={aiUploadedImages[1]} alt="" className="h-10 w-14 object-cover rounded border" />
                          <button
                            onClick={() => {
                              const newImgs = { ...aiUploadedImages };
                              delete newImgs[1];
                              setAiUploadedImages(newImgs);
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            削除
                          </button>
                        </div>
                      ) : (
                        <label className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
                          aiUploadingIdx === 1 ? 'bg-gray-200 text-gray-400' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}>
                          {aiUploadingIdx === 1 ? 'アップロード中...' : (
                            <>
                              <PhotoIcon className="h-3.5 w-3.5" />
                              画像をアップロード
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={aiUploadingIdx === 1}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAiImageUpload(1, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* 構成指定モード */}
                {aiUseCombo && (
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {aiCombo.map((slot, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 mt-1.5 w-4 shrink-0">{idx + 1}.</span>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={slot.type}
                                onChange={(e) => {
                                  const newCombo = [...aiCombo];
                                  newCombo[idx] = { type: e.target.value as 'text' | 'card' | 'image' };
                                  setAiCombo(newCombo);
                                  const newImgs = { ...aiUploadedImages };
                                  delete newImgs[idx];
                                  setAiUploadedImages(newImgs);
                                }}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                              >
                                <option value="text">テキスト</option>
                                <option value="card">カード</option>
                                <option value="image">画像</option>
                              </select>

                              {slot.type === 'card' && (
                                <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!slot.hasImage}
                                    onChange={(e) => {
                                      const newCombo = [...aiCombo];
                                      newCombo[idx] = { ...slot, hasImage: e.target.checked };
                                      setAiCombo(newCombo);
                                      if (!e.target.checked) {
                                        const newImgs = { ...aiUploadedImages };
                                        delete newImgs[idx];
                                        setAiUploadedImages(newImgs);
                                      }
                                    }}
                                    className="rounded text-purple-500"
                                  />
                                  画像あり
                                </label>
                              )}

                              {aiCombo.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newCombo = aiCombo.filter((_, i) => i !== idx);
                                    setAiCombo(newCombo);
                                    const newImgs: Record<number, string> = {};
                                    Object.entries(aiUploadedImages).forEach(([k, v]) => {
                                      const ki = Number(k);
                                      if (ki < idx) newImgs[ki] = v;
                                      else if (ki > idx) newImgs[ki - 1] = v;
                                    });
                                    setAiUploadedImages(newImgs);
                                  }}
                                  className="ml-auto text-gray-400 hover:text-red-500 text-xs"
                                >
                                  x
                                </button>
                              )}
                            </div>

                            {((slot.type === 'card' && slot.hasImage) || slot.type === 'image') && (
                              <div className="ml-0">
                                {aiUploadedImages[idx] ? (
                                  <div className="flex items-center gap-2">
                                    <img src={aiUploadedImages[idx]} alt="" className="h-10 w-14 object-cover rounded border" />
                                    <button
                                      onClick={() => {
                                        const newImgs = { ...aiUploadedImages };
                                        delete newImgs[idx];
                                        setAiUploadedImages(newImgs);
                                      }}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      削除
                                    </button>
                                  </div>
                                ) : (
                                  <label className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
                                    aiUploadingIdx === idx ? 'bg-gray-200 text-gray-400' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                                  }`}>
                                    {aiUploadingIdx === idx ? (
                                      'アップロード中...'
                                    ) : (
                                      <>
                                        <PhotoIcon className="h-3.5 w-3.5" />
                                        画像をアップロード
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={aiUploadingIdx === idx}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleAiImageUpload(idx, f);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {aiCombo.length < 5 && (
                        <button
                          onClick={() => setAiCombo([...aiCombo, { type: 'text' }])}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          + メッセージを追加
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {messages.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  現在のメッセージは上書きされます
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAiModal(false)}
                disabled={aiGenerating}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={!aiPrompt.trim() || aiGenerating}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <SparklesIcon className="h-4 w-4" />
                {aiGenerating ? '生成中...' : 'メッセージを生成'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =====================================================
// LINE Preview Bubble Components
// =====================================================

function PreviewBubble({ msg }: { msg: MessageItem }) {
  // iPhone LINE実機基準 (コンテナ375px, 左アイコン40px → バブル領域≈320px)

  if (msg.type === 'text') {
    return (
      <div className="mb-0.5">
        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm inline-block" style={{ maxWidth: 250 }}>
          <p className="text-[13px] leading-[1.5] text-gray-800 whitespace-pre-wrap break-words">{msg.text || '(テキスト未入力)'}</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'image') {
    // 画像カルーセル
    if (msg.isCarousel && msg.bubbles && msg.bubbles.length > 0) {
      return (
        <div className="mb-0.5">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ width: '100%' }}>
            {msg.bubbles.map((bubble, bi) => {
              const ratio = bubble.imageAspectRatio || 'original';
              const isOrig = ratio === 'original';
              const ca = !isOrig ? ratio.split(':').map(Number) : null;
              return (
                <div key={bi} className="bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0 relative" style={{ width: '80%', minWidth: 160 }}>
                  {bubble.originalUrl ? (
                    <>
                      <img
                        src={bubble.originalUrl} alt=""
                        className={`w-full ${isOrig ? '' : (bubble.imageAspectMode === 'fit' ? 'object-contain bg-gray-100' : 'object-cover')}`}
                        style={ca && ca[0] && ca[1] ? { aspectRatio: `${ca[0]}/${ca[1]}` } : undefined}
                      />
                      {bubble.linkUrl && (
                        <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
                          <LinkIcon className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]" style={{ height: 120 }}>(画像未選択)</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 単体画像
    const isFull = msg.imageFullWidth || !!msg.linkUrl;
    const ratio = msg.imageAspectRatio || 'original';
    const isOriginal = ratio === 'original';
    const bubbleW = isFull ? '100%' : '75%';
    const calcAspect = !isOriginal ? ratio.split(':').map(Number) : null;

    return (
      <div className="mb-0.5">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm relative" style={{ width: bubbleW }}>
          {msg.originalUrl ? (
            <>
              <img
                src={msg.originalUrl}
                alt=""
                className={`w-full ${isOriginal ? '' : (msg.imageAspectMode === 'fit' ? 'object-contain bg-gray-100' : 'object-cover')}`}
                style={calcAspect && calcAspect[0] && calcAspect[1] ? { aspectRatio: `${calcAspect[0]}/${calcAspect[1]}` } : undefined}
              />
              {msg.linkUrl && (
                <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
                  <LinkIcon className="h-3 w-3 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]" style={{ height: 150 }}>(画像未選択)</div>
          )}
        </div>
      </div>
    );
  }

  // Card — カルーセル or 単体
  if (msg.isCarousel && msg.bubbles && msg.bubbles.length > 0) {
    return (
      <div className="mb-0.5">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ width: '100%' }}>
          {msg.bubbles.map((bubble, bi) => (
            <div
              key={bi}
              className="bg-white rounded-xl overflow-hidden shadow-sm flex-shrink-0"
              style={{ width: '80%', minWidth: 160 }}
            >
              {bubble.imageUrl && (
                <img src={bubble.imageUrl} alt="" className="w-full object-cover" style={{ aspectRatio: '20/13' }} />
              )}
              <div className="px-3 py-2.5">
                {bubble.title && <p className="text-[13px] font-bold text-gray-800 leading-snug">{bubble.title}</p>}
                {bubble.body && <p className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{bubble.body}</p>}
              </div>
              {(bubble.buttons || []).length > 0 && (
                <div>
                  {(bubble.buttons || []).map((btn, i) => (
                    <div
                      key={i}
                      className="mx-2.5 mb-1.5 py-2 text-center text-[12px] font-bold text-white rounded-lg"
                      style={{ backgroundColor: btn.color || '#eaae9e' }}
                    >
                      {btn.label || '(ラベル未入力)'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Card 単体 (Flex bubble) — LINE実機で約85%幅
  return (
    <div className="mb-0.5">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ width: '85%' }}>
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="" className="w-full object-cover" style={{ aspectRatio: '20/13' }} />
        )}
        <div className="px-3 py-2.5">
          {msg.title && <p className="text-[13px] font-bold text-gray-800 leading-snug">{msg.title}</p>}
          {msg.body && <p className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">{msg.body}</p>}
        </div>
        {(msg.buttons || []).length > 0 && (
          <div>
            {(msg.buttons || []).map((btn, i) => (
              <div
                key={i}
                className="mx-2.5 mb-1.5 py-2 text-center text-[12px] font-bold text-white rounded-lg"
                style={{ backgroundColor: btn.color || '#eaae9e' }}
              >
                {btn.label || '(ラベル未入力)'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
