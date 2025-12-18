'use client';

import { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  CalendarDaysIcon,
  PlusIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { QUICK_SUGGESTIONS, DASHBOARD_ANALYST_SYSTEM_PROMPT, MTG_REPORT_TEMPLATE } from '@/lib/ai/dashboard-analyst-prompt';
import { useDashboardPeriod } from '@/contexts/DashboardPeriodContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// 利用可能なモデル
const AI_MODELS = [
  { id: 'gpt-4o-mini', name: '4o-mini', description: '高速・低コスト' },
  { id: 'gpt-4o', name: '4o', description: '高性能' },
  { id: 'gpt-5.1', name: '5.1', description: '最新・最高性能' },
  { id: 'o3-mini', name: 'o3-mini', description: '推論モデル（深い分析）' },
  { id: 'o3', name: 'o3', description: '推論Pro（最も深い分析・遅い）' },
] as const;

type AIModelId = (typeof AI_MODELS)[number]['id'];

// 推論モデルかどうかを判定
const isReasoningModel = (model: AIModelId) => model.startsWith('o');


// ストレージキー
const CHAT_STORAGE_KEY = 'dashboard-ai-chat';
const EVENTS_STORAGE_KEY = 'dashboard-events';
const SUMMARY_STORAGE_KEY = 'dashboard-ai-summary';

// 会話履歴の制限（20往復 = 40メッセージ）
const MAX_MESSAGES_TO_SEND = 40;

// 初期メッセージを生成（timestampは呼び出し時に設定）
const createInitialMessage = (): Message => ({
  id: '1',
  role: 'assistant',
  content: 'こんにちは！YOLO JAPAN LINE Botダッシュボードのデータ分析をお手伝いします。\n\n日別トレンド、前期間比較、セグメント分析など、詳細なデータに基づいてお答えします。',
  timestamp: new Date(),
});

// イベント型定義
interface DashboardEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
}

// AIコンテキストの型定義
interface AIContextData {
  period: { type: string; startDate: string; endDate: string; label: string };
  kpi: Record<string, { value: number; direction: string; changePercent?: number }>;
  totals: { totalUsers: number; totalDiagnosis: number; totalAIChats: number };
  funnel: { diagnosisRate: number; sessionCVRate: number };
  segments: {
    languages: Array<{ lang: string; count: number }>;
    japaneseLevel: Array<{ level: string; count: number }>;
    industries: Array<{ industry: string; count: number }>;
    regions: Array<{ region: string; count: number }>;
  };
  trends: {
    users: Array<{ date: string; count: number }>;
    diagnosis: Array<{ date: string; diagnosisCount: number }>;
    conversions: Array<{ date: string; yjRegistrations: number; yjApplications: number; ydRegistrations: number; ydApplications: number; sessions: number }>;
  };
  sourceAnalysis: Array<{ source: string; sessions: number; yjRegistrations: number; yjApplications: number }>;
  topUsers: Array<{ userId: string; lang: string; diagnosisCount: number; aiChatCount: number }>;
  anomalies: string[];
}

// AI用にデータを整形（リッチコンテキスト版）
function formatRichContextForAI(data: AIContextData): string {
  // KPIを整形
  const kpi = data.kpi;

  // 日別トレンド（全データ）
  const trendSummary = data.trends.conversions.length > 0
    ? data.trends.conversions.map(d =>
        `${d.date}: セッション${d.sessions}, YJ登録${d.yjRegistrations}, YJ応募${d.yjApplications}, YD登録${d.ydRegistrations}, YD応募${d.ydApplications}`
      ).join('\n')
    : 'データなし';

  // 診断トレンド
  const diagnosisTrendSummary = data.trends.diagnosis.length > 0
    ? data.trends.diagnosis.map(d => `${d.date}: ${d.diagnosisCount}回`).join('\n')
    : 'データなし';

  // ソース分析サマリー
  const sourceSummary = data.sourceAnalysis.length > 0
    ? data.sourceAnalysis.map(s => `${s.source}: セッション${s.sessions}, YJ登録${s.yjRegistrations}, YJ応募${s.yjApplications}`).join('\n')
    : 'データなし';

  // セグメント分析
  const langSummary = data.segments.languages.length > 0
    ? data.segments.languages.map(l => `${l.lang}: ${l.count}人`).join(', ')
    : 'データなし';

  const levelSummary = data.segments.japaneseLevel.length > 0
    ? data.segments.japaneseLevel.map(l => `${l.level}: ${l.count}人`).join(', ')
    : 'データなし';

  return `
=== ダッシュボード分析データ ===

【重要】今日の日付: ${new Date().toISOString().split('T')[0]}（${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日）
【データ期間】${data.period.startDate} 〜 ${data.period.endDate}（${data.period.label}）

## 期間内の主要KPI（実数値）
- アクティブユーザー: ${kpi.activeUsers?.value || 0}人（前期間比: ${kpi.activeUsers?.direction === 'up' ? '+' : kpi.activeUsers?.direction === 'down' ? '-' : ''}${kpi.activeUsers?.changePercent || 0}%）
- 診断実施数: ${kpi.diagnosisCount?.value || 0}回（前期間比: ${kpi.diagnosisCount?.direction === 'up' ? '+' : kpi.diagnosisCount?.direction === 'down' ? '-' : ''}${kpi.diagnosisCount?.changePercent || 0}%）
- 診断人数: ${kpi.diagnosisUsers?.value || 0}人（前期間比: ${kpi.diagnosisUsers?.direction === 'up' ? '+' : kpi.diagnosisUsers?.direction === 'down' ? '-' : ''}${kpi.diagnosisUsers?.changePercent || 0}%）
- セッション数: ${kpi.sessions?.value || 0}（前期間比: ${kpi.sessions?.direction === 'up' ? '+' : kpi.sessions?.direction === 'down' ? '-' : ''}${kpi.sessions?.changePercent || 0}%）
- YJ登録数: ${kpi.yjRegistrations?.value || 0}件
- YJ応募数: ${kpi.yjApplications?.value || 0}件
- YD登録数: ${kpi.ydRegistrations?.value || 0}件
- YD応募数: ${kpi.ydApplications?.value || 0}件
- リピート率: ${kpi.repeatRate?.value || 0}%
- LINE友だち数: ${kpi.lineFollowers?.value || 0}人

## 累計データ（サービス開始以来）
- 総ユーザー数: ${data.totals.totalUsers.toLocaleString()}人
- 累計診断数: ${data.totals.totalDiagnosis.toLocaleString()}回
- 累計AI相談数: ${data.totals.totalAIChats.toLocaleString()}回

## ファネル転換率（期間内）
- アクティブ→診断実施: ${data.funnel.diagnosisRate}%
- セッション→CV: ${data.funnel.sessionCVRate}%

## 日別コンバージョン推移
${trendSummary}

## 日別診断数推移
${diagnosisTrendSummary}

## 流入元別分析（期間内）
${sourceSummary}

## ユーザー属性分布（全ユーザー）
- 言語別: ${langSummary}
- 日本語レベル別: ${levelSummary}

## ヘビーユーザー（トップ5）
${data.topUsers.length > 0 ? data.topUsers.map((u, i) => `${i + 1}. ${u.lang}ユーザー - 診断${u.diagnosisCount}回, AI相談${u.aiChatCount}回`).join('\n') : 'データなし'}

${data.anomalies.length > 0 ? `
## ⚠️ 自動検出された注目ポイント
${data.anomalies.map(a => `- ${a}`).join('\n')}
` : ''}

---
【注意】上記データのみに基づいて回答してください。データにない情報（前週比など）は推測せず、「そのデータはありません」と答えてください。
`;
}

export function AIChatSidebar({ isOpen, onClose }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiContext, setAIContext] = useState<AIContextData | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelId>('gpt-4o-mini');
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [conversationSummary, setConversationSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // ダッシュボードの期間設定を共有（Contextから取得）
  const { getAIPeriod, getPeriodLabel } = useDashboardPeriod();
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ローカルストレージから会話履歴とイベントを復元（クライアント側でのみ実行）
  useEffect(() => {
    // 会話履歴の復元
    const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const restored = parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(restored);
        setShowSuggestions(false);
      } catch (e) {
        console.error('Failed to restore chat history:', e);
        setMessages([createInitialMessage()]);
      }
    } else {
      // 初回アクセス時は初期メッセージを設定
      setMessages([createInitialMessage()]);
    }

    // イベントの復元
    const savedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (savedEvents) {
      try {
        setEvents(JSON.parse(savedEvents));
      } catch (e) {
        console.error('Failed to restore events:', e);
      }
    }

    // 要約の復元
    const savedSummary = localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (savedSummary) {
      setConversationSummary(savedSummary);
    }

    setIsInitialized(true);
  }, []);

  // 会話履歴をローカルストレージに保存
  useEffect(() => {
    if (isInitialized && messages.length > 1) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  // イベントをローカルストレージに保存
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    }
  }, [events, isInitialized]);

  // AIコンテキストデータを取得（ダッシュボードの期間に連動）
  const currentPeriod = getAIPeriod();
  useEffect(() => {
    if (isOpen) {
      fetchAIContext();
    }
  }, [isOpen, currentPeriod]);

  const fetchAIContext = async () => {
    setIsLoadingContext(true);
    try {
      const period = getAIPeriod();
      const res = await fetch(`/api/dashboard/ai-context?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setAIContext(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 古い会話を要約する
  const summarizeOldMessages = async (messagesToSummarize: Message[]): Promise<string> => {
    try {
      setIsSummarizing(true);
      const apiMessages = messagesToSummarize.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Summarize API failed');
      }

      const data = await response.json();
      return data.summary || '';
    } catch (error) {
      console.error('Failed to summarize:', error);
      return '';
    } finally {
      setIsSummarizing(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      // API用のメッセージ形式に変換（初期メッセージを除く）
      let filteredMessages = updatedMessages.filter((msg) => msg.id !== '1');

      // メッセージ数が制限を超えている場合、古いメッセージを要約
      let currentSummary = conversationSummary;
      if (filteredMessages.length > MAX_MESSAGES_TO_SEND) {
        // 要約対象のメッセージ（古い方）
        const messagesToSummarize = filteredMessages.slice(0, filteredMessages.length - MAX_MESSAGES_TO_SEND);
        // 保持するメッセージ（新しい方）
        const recentMessages = filteredMessages.slice(-MAX_MESSAGES_TO_SEND);

        // 新しい要約を生成（既存の要約 + 新たに要約する分）
        const newSummary = await summarizeOldMessages(messagesToSummarize);
        if (newSummary) {
          currentSummary = currentSummary
            ? `${currentSummary}\n\n【追加の要約】\n${newSummary}`
            : newSummary;
          setConversationSummary(currentSummary);
          localStorage.setItem(SUMMARY_STORAGE_KEY, currentSummary);
        }

        filteredMessages = recentMessages;
      }

      const apiMessages = filteredMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // ダッシュボードデータをシステムプロンプトに追加
      let fullSystemPrompt = DASHBOARD_ANALYST_SYSTEM_PROMPT;

      // 過去の会話要約を追加
      if (currentSummary) {
        fullSystemPrompt += `\n\n## 過去の会話の要約\n以下は、これまでの会話で議論した内容の要約です。この文脈を踏まえて回答してください。\n\n${currentSummary}`;
      }

      if (aiContext) {
        fullSystemPrompt += '\n\n' + formatRichContextForAI(aiContext);
      }
      // 登録済みイベントを追加
      fullSystemPrompt += formatEventsForAI();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: fullSystemPrompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat API error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // 会話履歴をクリア（要約も含む）
  const clearChatHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(SUMMARY_STORAGE_KEY);
    setMessages([createInitialMessage()]);
    setConversationSummary('');
    setShowSuggestions(true);
  };

  // イベント追加
  const addEvent = () => {
    if (!newEventDate || !newEventTitle.trim()) return;

    const newEvent: DashboardEvent = {
      id: Date.now().toString(),
      date: newEventDate,
      title: newEventTitle.trim(),
      description: newEventDesc.trim() || undefined,
    };

    setEvents(prev => [...prev, newEvent].sort((a, b) => b.date.localeCompare(a.date)));
    setNewEventDate('');
    setNewEventTitle('');
    setNewEventDesc('');
  };

  // イベント削除
  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // アクションをAIコンテキストに追加するヘルパー
  const formatEventsForAI = (): string => {
    if (events.length === 0) return '';

    const eventList = events
      .map(e => `- ${e.date}: ${e.title}${e.description ? `（${e.description}）` : ''}`)
      .join('\n');

    return `\n\n## 登録済みビジネスイベント\n${eventList}\n\n※ 上記のイベントを考慮してデータを分析してください。特に、イベント前後の変化に注目してください。`;
  };

  // アクションをレポート用にフォーマット
  const formatActionsForReport = (): string => {
    if (events.length === 0) return '';

    const actionList = events
      .map(e => `- ${e.date}: ${e.title}${e.description ? `（${e.description}）` : ''}`)
      .join('\n');

    return `\n\n## 📝 今週やったこと（実施済みアクション）\n${actionList}\n\n※ 上記のアクションを「対策」セクションの「実施済み」として反映し、効果があったかどうかも言及してください。`;
  };

  // MTGレポート生成
  const generateMTGReport = () => {
    const actionsContext = formatActionsForReport();
    const reportPrompt = `MTGレポートを生成してください。「現状・課題・対策」形式で、以下のテンプレートに従って出力してください。\n\n${MTG_REPORT_TEMPLATE}${actionsContext}`;
    sendMessage(reportPrompt);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-screen w-[380px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">AIアナリスト</h2>
                <p className="text-xs text-slate-500">
                  {isLoadingContext ? 'データ読み込み中...' : aiContext ? '分析データ準備完了' : 'ダッシュボード分析'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEventModal(true)}
                className={`p-2 hover:bg-slate-100 rounded-lg transition ${events.length > 0 ? 'text-blue-600' : 'text-slate-500'}`}
                title={`やったこと${events.length > 0 ? ` (${events.length}件)` : ''}`}
              >
                <CalendarDaysIcon className="h-5 w-5" />
              </button>
              <button
                onClick={generateMTGReport}
                disabled={isLoading || isLoadingContext}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="MTGレポート生成"
              >
                <DocumentChartBarIcon className="h-5 w-5" />
              </button>
              <button
                onClick={clearChatHistory}
                className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500"
                title="履歴をクリア"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>
          {/* Model & Period Selector - Dropdowns */}
          <div className="flex items-center gap-2 mt-3">
            {/* モデル選択 */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">モデル</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModelId)}
                className={`text-xs px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500 w-[90px] ${
                  isReasoningModel(selectedModel)
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {AI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            {/* 期間表示（ダッシュボードと連動） */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-400">期間</span>
              <div className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200">
                {getPeriodLabel()}
              </div>
            </div>
          </div>
          {/* 推論モデル選択時の注意表示 */}
          {isReasoningModel(selectedModel) && (
            <div className="mt-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-xs text-amber-700">
                🧠 推論モデルは深い分析が可能ですが、応答に30秒〜2分かかります
              </p>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm prose prose-sm prose-slate max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:my-2">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {/* Quick Suggestions */}
          {showSuggestions && !isLoading && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">よく聞かれる質問:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs rounded-full hover:bg-purple-100 transition border border-purple-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="質問を入力..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-2 text-center">
            ⌘+Enter または Ctrl+Enter で送信
          </p>
        </div>
      </aside>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">今週やったこと</h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Add Event Form */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <p className="text-xs text-slate-500">
                実施した施策やアクションを登録すると、MTGレポート生成時に反映されます
              </p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="やったこと"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="詳細（任意）例: リッチメニュー改善、配信4000人"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={addEvent}
                  disabled={!newEventDate || !newEventTitle.trim()}
                  className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  追加
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto p-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  まだ登録がありません
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">{event.date}</span>
                          <span className="text-sm font-medium text-slate-900">{event.title}</span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="p-1 hover:bg-slate-200 rounded transition text-slate-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
