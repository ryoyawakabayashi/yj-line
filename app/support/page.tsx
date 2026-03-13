'use client';

import { useState, useEffect } from 'react';
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
  createdAt: string;
  updatedAt: string;
}

interface SupportStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  humanTakeoverActive: number;
  todayTickets: number;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-gray-100 text-gray-800',
  low: 'bg-slate-100 text-slate-600',
};

const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    service: 'all',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetch('/api/dashboard/support'),
        fetch('/api/dashboard/support/stats'),
      ]);

      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.tickets || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch support data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (filter.status !== 'all' && ticket.status !== filter.status) return false;
    if (filter.service !== 'all' && ticket.service !== filter.service) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        ticket.content?.toLowerCase().includes(searchLower) ||
        ticket.userDisplayName?.toLowerCase().includes(searchLower) ||
        ticket.aiSummary?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            サポートチケット管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            お問い合わせの管理と有人対応
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/support/glossary"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            用語集
          </Link>
          <Link
            href="/support/faq"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            FAQ管理
          </Link>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            更新
          </button>
        </div>
      </div>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <StatCard label="合計" value={stats.totalTickets} color="bg-slate-500" />
            <StatCard label="未対応" value={stats.openTickets} color="bg-yellow-500" />
            <StatCard label="対応中" value={stats.inProgressTickets} color="bg-blue-500" />
            <StatCard label="解決済" value={stats.resolvedTickets} color="bg-green-500" />
            <StatCard label="エスカレ" value={stats.escalatedTickets} color="bg-red-500" />
            <StatCard label="有人対応中" value={stats.humanTakeoverActive} color="bg-purple-500" />
            <StatCard label="本日" value={stats.todayTickets} color="bg-indigo-500" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">フィルター:</span>

            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">全ステータス</option>
              <option value="open">未対応</option>
              <option value="in_progress">対応中</option>
              <option value="resolved">解決済</option>
            </select>

            <select
              value={filter.service}
              onChange={(e) => setFilter({ ...filter, service: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">全サービス</option>
              <option value="YOLO_JAPAN">YOLO JAPAN</option>
              <option value="YOLO_DISCOVER">YOLO DISCOVER</option>
              <option value="YOLO_HOME">YOLO HOME</option>
            </select>

            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="検索..."
              className="flex-1 min-w-[200px] border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ユーザー
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  サービス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  内容
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  優先度
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  作成日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    チケットがありません
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ticket.userDisplayName || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ticket.userLang?.toUpperCase() || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {ticket.service ? SERVICE_LABELS[ticket.service] || ticket.service : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-900 truncate">
                        {ticket.aiSummary || ticket.content?.slice(0, 50) || '-'}
                      </p>
                      {ticket.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                          {ticket.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ticket.humanTakeover && '👤 '}
                        {ticket.status === 'open' && '未対応'}
                        {ticket.status === 'in_progress' && '対応中'}
                        {ticket.status === 'resolved' && '解決済'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal
                        }`}
                      >
                        {ticket.priority?.toUpperCase() || 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/support/${ticket.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg ${color} flex items-center justify-center`}>
          <span className="text-white font-bold">{value}</span>
        </div>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  );
}
