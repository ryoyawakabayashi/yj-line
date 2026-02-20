'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  TrophyIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  SparklesIcon,
  UserGroupIcon,
  LifebuoyIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  Bars3BottomLeftIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ダッシュボード',
    items: [
      { label: '概要', href: '/dashboard/overview', icon: ChartBarIcon },
      { label: '分析', href: '/dashboard/analytics', icon: ChartPieIcon },
      { label: 'トレンド', href: '/dashboard/trends', icon: ArrowTrendingUpIcon },
      { label: 'GA4 CV', href: '/dashboard/ga4', icon: CursorArrowRaysIcon },
      { label: 'ランキング', href: '/dashboard/ranking', icon: TrophyIcon },
      { label: 'アクティビティ', href: '/dashboard/activity', icon: ClockIcon },
      { label: '会話履歴', href: '/dashboard/conversations', icon: ChatBubbleLeftRightIcon },
      { label: '応募者追跡', href: '/dashboard/conversions', icon: UserGroupIcon },
    ],
  },
  {
    title: 'サポート',
    items: [
      { label: 'チケット一覧', href: '/dashboard/support', icon: LifebuoyIcon },
      { label: 'FAQ管理', href: '/support/faq', icon: QuestionMarkCircleIcon },
      { label: 'フロー管理', href: '/support/flows', icon: Squares2X2Icon },
      { label: 'リッチメニュー', href: '/support/richmenu', icon: Bars3BottomLeftIcon },
    ],
  },
  {
    title: '会議ツール',
    items: [
      { label: 'AIチャット', href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon },
      { label: '議事録', href: '/dashboard/minutes', icon: DocumentTextIcon },
    ],
  },
];

interface SidebarProps {
  onOpenChat?: () => void;
}

export function Sidebar({ onOpenChat }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[240px] bg-slate-900 flex-col h-screen sticky top-0">
      {/* Logo + AI Chat Button */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">YOLO JAPAN</p>
              <p className="text-xs text-slate-500">LINE Bot Admin</p>
            </div>
          </div>
          {/* AI Chat Button */}
          <button
            onClick={onOpenChat}
            className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
            title="AIチャット"
          >
            <SparklesIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">Production</span>
        </div>
      </div>
    </aside>
  );
}
