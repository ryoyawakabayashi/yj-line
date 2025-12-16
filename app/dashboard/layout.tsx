import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#409eff] to-[#66b1ff] text-white flex items-center justify-center shadow-md shadow-[#409eff]/25">
                🛰️
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Control Center</p>
                <p className="text-base font-semibold text-slate-900">Dashboard Overview</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="dashboard-chip">環境: Production</span>
              <span className="dashboard-chip">データ: LINE / GA4</span>
              <button className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:-translate-y-0.5 transition">
                🔎 コマンドパレット (⌘+K)
              </button>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center shadow-inner">
                管
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
