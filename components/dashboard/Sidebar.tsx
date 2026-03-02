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
  InboxIcon,
  PaperAirplaneIcon,
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
      { label: 'キャリア診断', href: '/dashboard/career-diagnosis', icon: SparklesIcon },
      { label: 'お問い合わせ分析', href: '/dashboard/contact-flow', icon: InboxIcon },
      { label: 'GA4 CV', href: '/dashboard/ga4', icon: CursorArrowRaysIcon },
      { label: 'ランキング', href: '/dashboard/ranking', icon: TrophyIcon },
      { label: 'アクティビティ', href: '/dashboard/activity', icon: ClockIcon },
      { label: '会話履歴', href: '/dashboard/conversations', icon: ChatBubbleLeftRightIcon },
      { label: '応募者追跡', href: '/dashboard/conversions', icon: UserGroupIcon },
    ],
  },
  {
    title: '配信',
    items: [
      { label: '配信管理', href: '/dashboard/broadcast', icon: PaperAirplaneIcon },
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
    <aside className="hidden lg:flex w-[240px] bg-white border-r border-gray-200 flex-col h-screen sticky top-0">
      {/* Logo + AI Chat Button */}
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#d10a1c] flex items-center justify-center">
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">YOLO JAPAN</p>
              <p className="text-xs text-gray-400">LINE Bot Admin</p>
            </div>
          </div>
          {/* AI Chat Button */}
          <button
            onClick={onOpenChat}
            className="h-9 w-9 rounded-lg bg-[#eaae9e] flex items-center justify-center hover:bg-[#d4917f] transition-all"
            title="AIチャット"
          >
            <SparklesIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#fdf2ef] text-[#d10a1c] border border-[#f0c4b8]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#d10a1c]' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400">Production</span>
        </div>
      </div>
    </aside>
  );
}
