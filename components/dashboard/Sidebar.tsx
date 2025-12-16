'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  TrophyIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  label: string;
  hash: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  { label: '概要', hash: 'overview', icon: ChartBarIcon },
  { label: '分析', hash: 'analytics', icon: ChartPieIcon },
  { label: 'トレンド', hash: 'trends', icon: ArrowTrendingUpIcon },
  { label: 'GA4 CV', hash: 'ga4', icon: CursorArrowRaysIcon },
  { label: 'ランキング', hash: 'ranking', icon: TrophyIcon },
  { label: 'アクティビティ', hash: 'activity', icon: ClockIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string>('overview');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHash = () => {
      const hash = window.location.hash.replace('#', '');
      setActiveHash(hash || 'overview');
    };

    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  const handleNavClick = (hash: string) => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${hash}`);
      setActiveHash(hash);
    }
  };

  return (
    <aside className="hidden lg:flex w-[240px] bg-slate-900 flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">YOLO JAPAN</p>
            <p className="text-xs text-slate-500">LINE Bot Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeHash === item.hash;

          return (
            <button
              key={item.hash}
              onClick={() => handleNavClick(item.hash)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
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
