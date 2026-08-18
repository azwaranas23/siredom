'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { Trophy, Tv, Settings, History, Shield, LogOut, LayoutDashboard, SlidersHorizontal, Radio } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { tenantCode, tableNumber, isAuthenticated, userRole, setAuth } = useScorerStore();

  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/play/live" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center font-black text-cyan-400 text-lg tracking-tighter">
              🀁
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-white tracking-wider font-display">SIREDOM</span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                PRO FSM
              </span>
            </div>
            <p className="text-[11px] text-gray-4 text-gray-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {tenantCode} • MEJA {tableNumber}
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-900/90 p-1 rounded-xl border border-gray-800">
          <Link
            href="/play/live"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname === '/play/live'
                ? 'bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            KIOSK SKOR
          </Link>

          <Link
            href="/admin/leaderboard-tv"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname === '/admin/leaderboard-tv'
                ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-amber-950" />
            SPECTATOR TV
          </Link>

          <Link
            href="/play/setup"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname === '/play/setup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            SETUP MEJA
          </Link>

          <Link
            href="/play/audit"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname === '/play/audit'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            AUDIT LOG
          </Link>

          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname?.startsWith('/admin') && pathname !== '/admin/leaderboard-tv'
                ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            CAFE ADMIN
          </Link>

          <Link
            href="/superadmin/tenants"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pathname?.startsWith('/superadmin')
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            SUPER ADMIN
          </Link>
        </nav>

        {/* Right Status Pill & Auth button */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full text-xs font-medium text-gray-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>ROLE: <strong className="text-cyan-400 uppercase font-mono">{userRole}</strong></span>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs font-bold text-gray-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            PIN LOGIN
          </Link>
        </div>
      </div>
    </header>
  );
};
