'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface SupportTicket {
  id: string;
  userId: string;
  ticketType: string;
  service: string | null;
  status: string;
  priority: string;
  category: string | null;
  content: string;
  aiSummary: string | null;
  userDisplayName: string | null;
  userLang: string | null;
  humanTakeover: boolean;
  humanOperatorName: string | null;
  escalatedAt: string | null;
  escalationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: string;
  ticketId: string;
  role: 'user' | 'assistant' | 'system' | 'operator';
  content: string;
  senderName: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済',
};

const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

export default function SupportTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [operatorName, setOperatorName] = useState('サポート担当');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchTicketData();

    // ポーリング開始（5秒間隔）
    pollingRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketData = async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/dashboard/support/${ticketId}`),
        fetch(`/api/support/messages/${ticketId}`),
      ]);

      if (ticketRes.ok) {
        const data = await ticketRes.json();
        setTicket(data.ticket);
        setIsHumanMode(data.ticket?.humanTakeover || false);
      }

      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch ticket data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/support/messages/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const toggleHumanTakeover = async () => {
    try {
      const res = await fetch('/api/support/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          enable: !isHumanMode,
          operatorName,
        }),
      });

      if (res.ok) {
        setIsHumanMode(!isHumanMode);
        fetchTicketData();
      }
    } catch (error) {
      console.error('Failed to toggle human takeover:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !isHumanMode) return;

    setSending(true);
    try {
      const res = await fetch('/api/support/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          message: newMessage,
          operatorName,
        }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/dashboard/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchTicketData();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-slate-500">チケットが見つかりません</p>
          <Link href="/dashboard/support" className="text-blue-600 mt-4 inline-block">
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/support"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              チケット #{ticket.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-slate-500">
              {ticket.userDisplayName || ticket.userId} - {SERVICE_LABELS[ticket.service || ''] || '未選択'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="open">未対応</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">解決済</option>
          </select>

          {/* Human Takeover Toggle */}
          <button
            onClick={toggleHumanTakeover}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              isHumanMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {isHumanMode ? (
              <>
                <UserCircleIcon className="h-5 w-5" />
                有人対応中
              </>
            ) : (
              <>
                <SparklesIcon className="h-5 w-5" />
                AI対応中
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-slate-400 py-8">メッセージがありません</p>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            {!isHumanMode && (
              <p className="text-sm text-amber-600 mb-2">
                メッセージを送信するには「有人対応」に切り替えてください
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={!isHumanMode || sending}
                placeholder={isHumanMode ? 'メッセージを入力...' : '有人対応モードをONにしてください'}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                onClick={sendMessage}
                disabled={!isHumanMode || sending || !newMessage.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Ticket Info Sidebar */}
        <div className="w-80 bg-white rounded-lg shadow p-4 space-y-4 overflow-y-auto">
          <h3 className="font-semibold text-slate-900">チケット情報</h3>

          <div className="space-y-3 text-sm">
            <InfoRow label="ステータス" value={STATUS_LABELS[ticket.status] || ticket.status} />
            <InfoRow label="優先度" value={ticket.priority?.toUpperCase() || 'NORMAL'} />
            <InfoRow label="種別" value={ticket.ticketType} />
            <InfoRow label="カテゴリ" value={ticket.category || '-'} />
            <InfoRow label="サービス" value={SERVICE_LABELS[ticket.service || ''] || '-'} />
            <InfoRow label="言語" value={ticket.userLang?.toUpperCase() || '-'} />
            <InfoRow
              label="作成日時"
              value={new Date(ticket.createdAt).toLocaleString('ja-JP')}
            />
            {ticket.escalatedAt && (
              <InfoRow
                label="エスカレ日時"
                value={new Date(ticket.escalatedAt).toLocaleString('ja-JP')}
              />
            )}
            {ticket.humanOperatorName && (
              <InfoRow label="担当者" value={ticket.humanOperatorName} />
            )}
          </div>

          {ticket.aiSummary && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-slate-700 mb-2">AI要約</h4>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                {ticket.aiSummary}
              </p>
            </div>
          )}

          {ticket.escalationReason && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-red-600 mb-2">エスカレ理由</h4>
              <p className="text-sm text-slate-600 bg-red-50 p-3 rounded-lg">
                {ticket.escalationReason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isUser = message.role === 'user';
  const isOperator = message.role === 'operator';
  const isAI = message.role === 'assistant';

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-slate-100 text-slate-900'
            : isOperator
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isUser && <UserIcon className="h-4 w-4" />}
          {isAI && <SparklesIcon className="h-4 w-4" />}
          {isOperator && <UserCircleIcon className="h-4 w-4" />}
          <span className="text-xs opacity-75">
            {isUser ? 'ユーザー' : isOperator ? message.senderName || 'オペレーター' : 'AI'}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs opacity-50 mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium">{value}</span>
    </div>
  );
}
