'use client';

import { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ConversationUser {
  userId: string;
  lang: string;
  lastUsed: string | null;
  diagnosisCount: number;
  aiChatCount: number;
  lastMessage: string | null;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DiagnosisResult {
  timestamp: string;
  q1_living_in_japan: string | null;
  q2_gender: string | null;
  q3_urgency: string | null;
  q4_region: string | null;
  q5_japanese_level: string | null;
  q6_industry: string | null;
  q7_work_style: string | null;
}

interface UserDetail {
  userId: string;
  lang: string;
  history: ConversationMessage[];
  diagnosisResults: DiagnosisResult[];
}

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
  unknown: '不明',
};

export default function ConversationsPage() {
  const [users, setUsers] = useState<ConversationUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetail(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/dashboard/conversations');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/conversations?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    if (!mounted) return ''; // ハイドレーションエラー防止
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex">
      {/* Left: User List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">会話履歴</h2>
            <span className="text-xs text-slate-500 ml-auto">{users.length}件</span>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="user-search"
              name="user-search"
              type="text"
              placeholder="ユーザーIDで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              会話履歴がありません
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.userId}
                onClick={() => setSelectedUserId(user.userId)}
                className={`w-full p-3 text-left border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  selectedUserId === user.userId ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-600 truncate">
                        {user.userId.substring(0, 12)}...
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {LANG_LABELS[user.lang] || user.lang}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {user.lastMessage || '(履歴なし)'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">
                        診断: {user.diagnosisCount}回
                      </span>
                      <span className="text-xs text-slate-400">
                        AI: {user.aiChatCount}回
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Conversation Detail */}
      <div className="flex-1 bg-slate-50 flex flex-col">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>ユーザーを選択してください</p>
            </div>
          </div>
        ) : detailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : userDetail ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-mono text-sm text-slate-700">{userDetail.userId}</p>
                  <p className="text-xs text-slate-500">
                    {LANG_LABELS[userDetail.lang] || userDetail.lang} |
                    会話数: {userDetail.history.length} |
                    診断: {userDetail.diagnosisResults.length}回
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {userDetail.history.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  会話履歴がありません
                </div>
              ) : (
                userDetail.history.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Diagnosis Results */}
            {userDetail.diagnosisResults.length > 0 && (
              <div className="bg-white border-t border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">診断履歴</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userDetail.diagnosisResults.map((result, idx) => (
                    <div key={idx} className="text-xs bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-600">
                          {formatDate(result.timestamp)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-slate-500">
                        {result.q3_urgency && (
                          <span>緊急度: {result.q3_urgency}</span>
                        )}
                        {result.q4_region && (
                          <span>地域: {result.q4_region}</span>
                        )}
                        {result.q5_japanese_level && (
                          <span>日本語: {result.q5_japanese_level}</span>
                        )}
                        {result.q6_industry && (
                          <span>業界: {result.q6_industry}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            データを取得できませんでした
          </div>
        )}
      </div>
    </div>
  );
}
