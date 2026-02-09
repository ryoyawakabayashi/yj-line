'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AIChatSidebar } from '@/components/dashboard/AIChatSidebar';

export default function SupportLayout({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar onOpenChat={() => setIsChatOpen(true)} />
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${
          isChatOpen ? 'mr-[380px]' : 'mr-0'
        }`}
      >
        {children}
      </main>
      <AIChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
