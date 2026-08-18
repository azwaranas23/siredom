'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { Trophy, Settings, History, LogOut, Radio } from 'lucide-react';

export default function WasitLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenantCode, tableNumber } = useScorerStore();

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-gray-950">
      {/* Wasit Isolated Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Wasit Info */}
          <Link href="/wasit/live" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center font-black text-cyan-400 text-xl shadow-inner">
              🀁
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wider font-display">SIREDOM</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                  WASIT MEJA
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {tenantCode} • MEJA {tableNumber}
              </p>
            </div>
          </Link>

          {/* Wasit Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Link
              href="/wasit/live"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/wasit/live'
                  ? 'bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              LIVE WASIT
            </Link>

            <Link
              href="/wasit/setup"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/wasit/setup'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              SETUP MEJA
            </Link>

            <Link
              href="/wasit/audit"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/wasit/audit'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              AUDIT RONDE
            </Link>
          </nav>

          {/* Status & Exit Session */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>SESI WASIT AKTIF</span>
            </div>

            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              KELUAR
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
