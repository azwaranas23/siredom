'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Building2, Server, LogOut } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Super Admin Isolated Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Super Admin Badge */}
          <Link href="/superadmin/tenants" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 p-1 flex items-center justify-center font-black text-rose-400 text-xl shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wider font-display">SIREDOM</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/80">
                  SUPER ADMIN PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                PLATFORM MULTI-TENANT SAAS GOVERNANCE
              </p>
            </div>
          </Link>

          {/* Super Admin Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Link
              href="/superadmin/tenants"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/superadmin/tenants'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              MANAJEMEN TENANT WARKOP
            </Link>

            <Link
              href="/superadmin/system"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === '/superadmin/system'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              SYSTEM LOG & METRICS
            </Link>
          </nav>

          {/* Exit Button */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            KELUAR
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
