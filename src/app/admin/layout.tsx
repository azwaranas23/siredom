'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { LayoutDashboard, SlidersHorizontal, Tv, LogOut, Coffee } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenantCode } = useScorerStore();

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-gray-950">
      {/* Cafe Admin Isolated Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Admin Info */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 p-1 flex items-center justify-center font-black text-emerald-400 text-xl shadow-inner">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wider font-display">SIREDOM</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  CAFE ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                TENANT: {tenantCode}
              </p>
            </div>
          </Link>

          {/* Admin Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/admin/dashboard'
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              DASHBOARD MEJA
            </Link>

            <Link
              href="/admin/rules"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/admin/rules'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              ATURAN BOBOT POIN
            </Link>

            <Link
              href="/admin/leaderboard-tv"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/admin/leaderboard-tv'
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              SPECTATOR TV
            </Link>
          </nav>

          {/* Right Exit Button */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            KELUAR PORTAL
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
