'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { releaseTableSessionAction } from '@/app/actions/tableActions';
import { clearSessionCookieAction } from '@/app/actions/authActions';
import { getOrCreateDeviceId } from '@/lib/device';
import { Radio, SlidersHorizontal, FileText, History, LogOut, Maximize2, Minimize2, Menu, X, Dices } from 'lucide-react';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { tenantCode, tableNumber, logout } = useScorerStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rawTableId = (params?.tableId as string) || String(tableNumber || 1);
  
  // Display label: prefer numeric table number over UUID
  const displayTableLabel = /^\d+$/.test(rawTableId) ? `Meja #${rawTableId}` : `Meja #${tableNumber || 1}`;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Logout lengkap (Ticket GH #1): lepas kunci meja di DB → hapus cookie sesi
  // httpOnly (wajib via Server Action) → bersihkan state lokal → keluar.
  const handleLogout = async () => {
    const deviceId = getOrCreateDeviceId();
    const isUuid = !/^\d+$/.test(rawTableId);

    try {
      if (deviceId) {
        await releaseTableSessionAction({
          tableId: isUuid ? rawTableId : undefined,
          tenantCode: tenantCode || undefined,
          tableNumber: Number(tableNumber) || 1,
          deviceId,
        });
      }
    } catch (err) {
      console.error('Gagal melepas kunci meja saat logout:', err);
    }

    try {
      await clearSessionCookieAction();
    } catch (err) {
      console.error('Gagal menghapus cookie sesi:', err);
    }

    logout();
    router.push('/play');
  };

  const wasitLinks = [
    { href: `/play/live/${rawTableId}`, label: 'LIVE WASIT', icon: Radio },
    { href: `/play/live/${rawTableId}/setup`, label: 'SETUP MEJA', icon: SlidersHorizontal },
    { href: `/play/live/${rawTableId}/audit`, label: 'AUDIT RONDE', icon: FileText },
    { href: `/play/live/${rawTableId}/history`, label: 'RIWAYAT', icon: History },
  ];

  const isPlayPortal = pathname === '/play';

  if (isPlayPortal) {
    return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Wasit Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/play/live/${rawTableId}`} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-black text-cyan-400 text-xl shadow-inner">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white tracking-wide font-display">SIREDOM v2.0</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  WASIT MEJA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {tenantCode || 'TAB-SLOWBAR'} • {displayTableLabel}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 font-mono text-xs">
            {wasitLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (Fullscreen)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 border border-slate-700 font-mono text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> KELUAR
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-2 font-mono text-xs mt-2 animate-in slide-in-from-top duration-200">
            {wasitLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full p-3 rounded-xl font-bold flex items-center justify-between ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-extrabold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
