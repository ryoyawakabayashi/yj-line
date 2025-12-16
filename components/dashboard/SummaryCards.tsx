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
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'AI診断実施数',
      value: stats.totalDiagnosis.toLocaleString(),
      icon: '📋',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'AIチャット利用数',
      value: stats.totalAIChats.toLocaleString(),
      icon: '💬',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: '本日のアクティブユーザー',
      value: stats.todayActiveUsers.toLocaleString(),
      icon: '⚡',
      color: 'bg-orange-50 border-orange-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.color} border-2 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
            <div className="text-4xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
