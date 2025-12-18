'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
import {
  DocumentTextIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  MicrophoneIcon,
  StopIcon,
  UserIcon,
  PlusIcon,
  DocumentChartBarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface Utterance {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

// 話者の色
const SPEAKER_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];

export default function MinutesPage() {
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [reportLoading, setReportLoading] = useState(false);

  // 話者管理
  const [speakers, setSpeakers] = useState<string[]>(['話者1']);
  const [currentSpeaker, setCurrentSpeaker] = useState('話者1');

  // 音声録音関連
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 録音時間のフォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Web Speech API でリアルタイム文字起こし
  const startRecording = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('このブラウザは音声認識に対応していません。Chrome をお使いください。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (final) {
        const newUtterance: Utterance = {
          id: Date.now().toString(),
          speaker: currentSpeaker,
          text: final,
          timestamp: formatTime(recordingTime),
        };
        setUtterances((prev) => [...prev, newUtterance]);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        alert('音声認識エラー: ' + event.error);
      }
    };

    recognition.onend = () => {
      // 録音中なら再開
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordingTime(0);

    // タイマー開始
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, [currentSpeaker, isRecording, recordingTime]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 話者追加
  const addSpeaker = () => {
    const newSpeaker = `話者${speakers.length + 1}`;
    setSpeakers((prev) => [...prev, newSpeaker]);
    setCurrentSpeaker(newSpeaker);
  };

  // 話者名変更
  const renameSpeaker = (oldName: string, newName: string) => {
    if (!newName.trim() || speakers.includes(newName)) return;

    setSpeakers((prev) => prev.map((s) => (s === oldName ? newName : s)));
    setUtterances((prev) =>
      prev.map((u) => (u.speaker === oldName ? { ...u, speaker: newName } : u))
    );
    if (currentSpeaker === oldName) {
      setCurrentSpeaker(newName);
    }
  };

  // utterances をテキストに変換
  const getContentText = () => {
    return utterances
      .map((u) => `[${u.timestamp}] ${u.speaker}: ${u.text}`)
      .join('\n');
  };

  const processContent = async (type: 'summarize' | 'action-items' | 'format') => {
    const content = getContentText();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/minutes/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });

      if (!res.ok) throw new Error('Failed to process');

      const data = await res.json();
      setResult(data.result);
      setActiveTab('preview');
    } catch (error) {
      console.error('Process error:', error);
      setResult('エラーが発生しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsText = () => {
    const text = result || getContentText();
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `議事録_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const text = result || getContentText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch {
      alert('コピーに失敗しました');
    }
  };

  const clearAll = () => {
    setUtterances([]);
    setResult('');
    setActiveTab('edit');
    setSpeakers(['話者1']);
    setCurrentSpeaker('話者1');
    setRecordingTime(0);
  };

  // 週次/月次レポート生成
  const generateReport = async (type: 'weekly' | 'monthly') => {
    setReportLoading(true);
    try {
      const period = type === 'weekly' ? 'week' : 'month';

      // AIチャットで登録した「やったこと」を取得
      let actionsParam = '';
      try {
        const savedEvents = localStorage.getItem('dashboard-events');
        if (savedEvents) {
          const events = JSON.parse(savedEvents);
          if (Array.isArray(events) && events.length > 0) {
            actionsParam = `&actions=${encodeURIComponent(JSON.stringify(events))}`;
          }
        }
      } catch (e) {
        console.error('Failed to load events:', e);
      }

      const res = await fetch(`/api/dashboard/mtg-report?period=${period}${actionsParam}`);

      if (!res.ok) throw new Error('Failed to generate report');

      const data = await res.json();
      setResult(data.report);
      setActiveTab('preview');
    } catch (error) {
      console.error('Report generation error:', error);
      setResult('レポート生成に失敗しました。もう一度お試しください。');
      setActiveTab('preview');
    } finally {
      setReportLoading(false);
    }
  };

  // 発言を削除
  const deleteUtterance = (id: string) => {
    setUtterances((prev) => prev.filter((u) => u.id !== id));
  };

  // 発言を編集
  const editUtterance = (id: string, newText: string) => {
    setUtterances((prev) =>
      prev.map((u) => (u.id === id ? { ...u, text: newText } : u))
    );
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">議事録</h1>
          <p className="text-slate-500 text-sm mt-1">リアルタイム音声文字起こし + AI整理</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            コピー
          </button>
          <button
            onClick={downloadAsText}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            保存
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <TrashIcon className="h-4 w-4" />
            クリア
          </button>
        </div>
      </div>

      {/* 音声録音 + 話者選択 */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        {/* 録音ボタン */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
            isRecording
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isRecording ? (
            <>
              <StopIcon className="h-5 w-5" />
              録音停止
            </>
          ) : (
            <>
              <MicrophoneIcon className="h-5 w-5" />
              録音開始
            </>
          )}
        </button>

        {/* 録音時間 */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
            <span className="text-lg font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* 話者選択 */}
        <div className="flex items-center gap-2 ml-auto">
          <UserIcon className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-500">話者:</span>
          <div className="flex gap-1">
            {speakers.map((speaker, index) => (
              <button
                key={speaker}
                onClick={() => setCurrentSpeaker(speaker)}
                onDoubleClick={() => {
                  const newName = prompt('話者名を入力', speaker);
                  if (newName) renameSpeaker(speaker, newName);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
                  currentSpeaker === speaker
                    ? SPEAKER_COLORS[index % SPEAKER_COLORS.length]
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {speaker}
              </button>
            ))}
            <button
              onClick={addSpeaker}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* リアルタイム表示 */}
      {interimText && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-blue-600 text-sm">{currentSpeaker}: </span>
          <span className="text-blue-800">{interimText}</span>
          <span className="animate-pulse">|</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* 議事録系ボタン */}
        <button
          onClick={() => processContent('summarize')}
          disabled={loading || utterances.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <SparklesIcon className="h-4 w-4" />
          議事録に整形
        </button>
        <button
          onClick={() => processContent('action-items')}
          disabled={loading || utterances.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ClipboardDocumentListIcon className="h-4 w-4" />
          アクション抽出
        </button>
        <button
          onClick={() => processContent('format')}
          disabled={loading || utterances.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <DocumentTextIcon className="h-4 w-4" />
          整形のみ
        </button>

        {/* 区切り */}
        <div className="w-px h-8 bg-slate-200 self-center" />

        {/* レポート生成ボタン */}
        <button
          onClick={() => generateReport('weekly')}
          disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <DocumentChartBarIcon className="h-4 w-4" />
          {reportLoading ? '生成中...' : '週次レポート'}
        </button>
        <button
          onClick={() => generateReport('monthly')}
          disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <CalendarIcon className="h-4 w-4" />
          {reportLoading ? '生成中...' : '月次レポート'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'edit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          発言一覧 ({utterances.length})
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          結果
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {activeTab === 'edit' ? (
          <div className="h-full p-4 overflow-y-auto space-y-2">
            {utterances.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <MicrophoneIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>「録音開始」を押して会議を記録しましょう</p>
                  <p className="text-sm mt-1">話者ボタンをダブルクリックで名前変更</p>
                </div>
              </div>
            ) : (
              utterances.map((utterance, index) => {
                const speakerIndex = speakers.indexOf(utterance.speaker);
                return (
                  <div
                    key={utterance.id}
                    className="flex gap-3 p-3 rounded-lg hover:bg-slate-50 group"
                  >
                    <span className="text-xs text-slate-400 font-mono w-12 pt-1">
                      {utterance.timestamp}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap h-fit ${
                        SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]
                      }`}
                    >
                      {utterance.speaker}
                    </span>
                    <input
                      type="text"
                      value={utterance.text}
                      onChange={(e) => editUtterance(utterance.id, e.target.value)}
                      className="flex-1 bg-transparent focus:outline-none focus:bg-blue-50 rounded px-2 -mx-2"
                    />
                    <button
                      onClick={() => deleteUtterance(utterance.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="h-full p-4 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-slate-500">処理中...</p>
                </div>
              </div>
            ) : result ? (
              <div className="prose prose-sm prose-slate max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p>AIで処理した結果がここに表示されます</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
