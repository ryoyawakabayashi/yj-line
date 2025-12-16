import type { DashboardStats } from '@/types/dashboard';

interface SummaryCardsProps {
  stats: DashboardStats | null;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  if (!stats) return null;

  const cards = [
    {
      title: '総ユーザー数',
      value: stats.totalUsers.toLocaleString(),
      icon: '👥',
      tag: '総計',
      helper: 'LINE ボット全登録数',
      border: 'border-blue-200',
      iconBg: 'bg-gradient-to-br from-[#409eff] to-[#66b1ff] shadow-[#409eff]/30',
      progress: '92%',
      progressBg: 'bg-gradient-to-r from-[#409eff] to-[#66b1ff]',
    },
    {
      title: 'リピートユーザー数',
      value: stats.repeatUserCount.toLocaleString(),
      icon: '🔁',
      tag: '定着',
      subtitle: `リピート率: ${stats.repeatRate}%`,
      helper: '戻ってきてくれたユーザー',
      border: 'border-emerald-200',
      iconBg: 'bg-gradient-to-br from-[#67c23a] to-[#7dd76f] shadow-emerald-300/40',
      progress: `${Math.min(100, stats.repeatRate)}%`,
      progressBg: 'bg-gradient-to-r from-[#67c23a] to-[#85e075]',
    },
    {
      title: 'AI診断実施数',
      value: stats.totalDiagnosis.toLocaleString(),
      icon: '📋',
      tag: '診断',
      helper: '累計の診断セッション',
      border: 'border-amber-200',
      iconBg: 'bg-gradient-to-br from-[#e6a23c] to-[#f3c76a] shadow-amber-200/60',
      progress: '78%',
      progressBg: 'bg-gradient-to-r from-[#e6a23c] to-[#f3c76a]',
    },
    {
      title: 'AIチャット利用数',
      value: stats.totalAIChats.toLocaleString(),
      icon: '💬',
      tag: '会話',
      helper: 'チャットボットとの対話回数',
      border: 'border-purple-200',
      iconBg: 'bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] shadow-purple-200/50',
      progress: '72%',
      progressBg: 'bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa]',
    },
    {
      title: '本日のアクティブユーザー',
      value: stats.todayActiveUsers.toLocaleString(),
      icon: '⚡',
      tag: '今日',
      helper: '当日のアクティブ数',
      border: 'border-orange-200',
      iconBg: 'bg-gradient-to-br from-[#ff8f5a] to-[#ffc085] shadow-orange-200/70',
      progress: '64%',
      progressBg: 'bg-gradient-to-r from-[#ff8f5a] to-[#ffc085]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`dashboard-panel p-5 border-l-4 ${card.border} hover:-translate-y-0.5 transition duration-200`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{card.tag}</p>
              <p className="text-lg font-semibold text-slate-900">{card.title}</p>
              <p className="text-3xl font-black text-slate-900">{card.value}</p>
              {card.subtitle && <p className="text-xs font-semibold text-slate-500">{card.subtitle}</p>}
              {card.helper && <p className="text-xs text-slate-500">{card.helper}</p>}
            </div>
            <div className={`h-12 w-12 rounded-xl text-2xl text-white flex items-center justify-center shadow-lg ${card.iconBg}`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full ${card.progressBg}`} style={{ width: card.progress }} />
          </div>
        </div>
      ))}
    </div>
  );
}
