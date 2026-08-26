'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { releaseTableSessionAction } from '@/app/actions/tableActions';
import { clearSessionCookieAction } from '@/app/actions/authActions';
import { getOrCreateDeviceId } from '@/lib/device';
import { Radio, SlidersHorizontal, FileText, History, LogOut, Maximize2, Minimize2, Menu, X, Dices, ChevronDown } from 'lucide-react';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { tenantCode, tableNumber, logout } = useScorerStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rawTableId = (params?.tableId as string) || String(tableNumber || 1);

  // Display label: prefer numeric table number over UUID
  const displayTableLabel = /^\d+$/.test(rawTableId) ? `Meja #${rawTableId}` : `Meja #${tableNumber || 1}`;

  // Ticket GH#15: rute live scorer saja -> immersive (navbar disembunyikan,
  // dipanggil lewat chip mengambang). Setup/Audit/Riwayat tetap ber-navbar.
  const isLiveScorer = /^\/play\/live\/[^/]+$/.test(pathname);

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
    const numericTable = Number(tableNumber);

    // Ref meja valid: UUID dari rute, ATAU pasangan tenant+nomor dari store.
    // Tanpa ref yang valid, unlock dilewati (jangan menebak-nebak Meja #1).
    const tableRef = isUuid
      ? { tableId: rawTableId }
      : tenantCode && Number.isFinite(numericTable) && numericTable > 0
      ? { tenantCode, tableNumber: numericTable }
      : null;

    if (deviceId && tableRef) {
      const res = await releaseTableSessionAction({ ...tableRef, deviceId });
      if (res.status !== 'success') {
        // Jangan biarkan gagal senyap: wasit harus tahu meja masih terkunci.
        window.alert(`Meja belum dilepas: ${res.message}\nAnda tetap keluar; minta panitia membuka sesi bila perlu.`);
      }
    } else {
      console.warn('Logout tanpa unlock: deviceId/ref meja tidak tersedia.');
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

  // Ticket GH#15 — Immersive Live Scorer: navbar disembunyikan; chip pojok
  // kanan-atas memanggil panel navigasi overlay. Pad mengisi seluruh layar.
  if (isLiveScorer) {
    return (
      <div className="h-dvh bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
        {/* Floating summon chip */}
        <button
          onClick={() => setIsNavPanelOpen(!isNavPanelOpen)}
          className="fixed top-3 right-3 z-50 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white backdrop-blur-sm transition-colors shadow-lg"
          title="Menu Navigasi"
        >
          {isNavPanelOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Overlay nav panel */}
        {isNavPanelOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsNavPanelOpen(false)} />
            <div className="fixed top-14 right-3 z-50 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-800">
                <span className="font-extrabold text-white tracking-wide font-display">SIREDOM v2.0</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {tenantCode || '—'} • {displayTableLabel}
                </span>
              </div>
              {wasitLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsNavPanelOpen(false)}
                    className={`w-full px-4 py-2.5 font-bold flex items-center gap-2 transition-colors ${
                      isActive ? 'text-cyan-300 bg-cyan-950/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="border-t border-slate-800">
                <button
                  onClick={toggleFullscreen}
                  className="w-full px-4 py-2.5 font-bold flex items-center gap-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  {isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 font-bold flex items-center gap-2 text-rose-300 hover:bg-rose-950/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> KELUAR MEJA
                </button>
              </div>
            </div>
          </>
        )}

        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      </div>
    );
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

          {/* Desktop Navigation — Ticket GH#9: tab primer + dropdown menu sekunder */}
          <nav className="hidden md:flex items-center gap-1.5 font-mono text-xs">
            {wasitLinks.slice(0, 2).map((link) => {
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

            {/* Dropdown MENU sekunder (Audit & Riwayat) */}
            <div className="relative">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                  wasitLinks.slice(2).some((l) => l.href === pathname)
                    ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800'
                    : isMoreMenuOpen
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'
                }`}
              >
                <Menu className="w-3.5 h-3.5" /> MENU
                <ChevronDown className={`w-3 h-3 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMoreMenuOpen && (
                <>
                  {/* Klik-luar untuk menutup */}
                  <div className="fixed inset-0 z-30" onClick={() => setIsMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {wasitLinks.slice(2).map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMoreMenuOpen(false)}
                          className={`w-full px-4 py-2.5 font-bold flex items-center gap-2 transition-colors ${
                            isActive ? 'text-cyan-300 bg-cyan-950/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
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
