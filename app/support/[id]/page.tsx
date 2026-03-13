'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

export default function SupportTicketPage() {
  const params = useParams();
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">チケットが見つかりません</p>
        <Link href="/support" className="text-blue-600 hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/support"
            className="text-blue-600 hover:underline text-sm"
          >
            &larr; サポート一覧
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              チケット #{ticket.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-slate-500">
              {ticket.userDisplayName || ticket.userId} - {SERVICE_LABELS[ticket.service || ''] || '未選択'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="open">未対応</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">解決済</option>
          </select>

          <button
            onClick={toggleHumanTakeover}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              isHumanMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isHumanMode ? '有人対応中' : 'AI対応中'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow flex flex-col min-h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 py-8">メッセージがありません</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gray-100 text-gray-900'
                        : msg.role === 'operator'
                        ? 'bg-green-600 text-white'
                        : msg.role === 'system'
                        ? 'bg-gray-300 text-gray-700 text-xs'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1">
                      {msg.role === 'user' && '👤 ユーザー'}
                      {msg.role === 'assistant' && '🤖 AI'}
                      {msg.role === 'operator' && `👨‍💼 ${msg.senderName || 'オペレーター'}`}
                      {msg.role === 'system' && '⚙️ システム'}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            {!isHumanMode && (
              <p className="text-sm text-amber-600 mb-2">
                ⚠️ メッセージを送信するには「有人対応」に切り替えてください
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
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!isHumanMode || sending || !newMessage.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                送信
              </button>
            </div>
          </div>
        </div>

        {/* Ticket Info Sidebar */}
        <div className="w-80 bg-white rounded-lg shadow p-4 space-y-4 h-fit">
          <h3 className="font-semibold text-gray-900 border-b pb-2">チケット情報</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">ステータス</span>
              <span className="font-medium">
                {ticket.status === 'open' && '未対応'}
                {ticket.status === 'in_progress' && '対応中'}
                {ticket.status === 'resolved' && '解決済'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">優先度</span>
              <span className="font-medium">{ticket.priority?.toUpperCase() || 'NORMAL'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">種別</span>
              <span className="font-medium">{ticket.ticketType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">カテゴリ</span>
              <span className="font-medium">{ticket.category || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">サービス</span>
              <span className="font-medium">{SERVICE_LABELS[ticket.service || ''] || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">言語</span>
              <span className="font-medium">{ticket.userLang?.toUpperCase() || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">作成日時</span>
              <span className="font-medium">
                {new Date(ticket.createdAt).toLocaleString('ja-JP')}
              </span>
            </div>
            {ticket.humanOperatorName && (
              <div className="flex justify-between">
                <span className="text-gray-500">担当者</span>
                <span className="font-medium">{ticket.humanOperatorName}</span>
              </div>
            )}
          </div>

          {ticket.aiSummary && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-700 mb-2">AI要約</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {ticket.aiSummary}
              </p>
            </div>
          )}

          {ticket.escalationReason && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-red-600 mb-2">エスカレ理由</h4>
              <p className="text-sm text-gray-600 bg-red-50 p-3 rounded-lg">
                {ticket.escalationReason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
