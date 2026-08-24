'use client';

import React, { useState, useTransition } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { loginAction } from '@/app/actions/authActions';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useScorerStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const inputIdentifier = email.trim();
    if (!inputIdentifier || !password) {
      setErrorMsg('Masukkan email/kode tenant dan password admin');
      return;
    }

    startTransition(async () => {
      // 1. Try Cafe Admin Login
      const adminRes = await loginAction({
        role: 'admin',
        identifier: inputIdentifier,
        password,
      });

      if (adminRes.success && adminRes.role) {
        setAuth(true, 'admin', adminRes.tenantCode, 1);
        router.push('/admin/dashboard');
        return;
      }

      // 2. Try Super Admin Login
      const superAdminRes = await loginAction({
        role: 'superadmin',
        identifier: inputIdentifier,
        password,
      });

      if (superAdminRes.success && superAdminRes.role) {
        setAuth(true, 'superadmin', 'SUPERADMIN', 1);
        router.push('/superadmin/tenants');
        return;
      }

      setErrorMsg(adminRes.error || superAdminRes.error || 'Akun Admin tidak terdaftar atau password salah!');
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col justify-between p-4 md:p-6 selection:bg-cyan-500 selection:text-gray-950 font-sans">
      {/* Brand Header */}
      <div className="max-w-md mx-auto w-full pt-4 md:pt-8 pb-4 text-center">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-slate-900 border border-slate-800 p-1 mx-auto mb-3 shadow-2xl flex items-center justify-center font-black text-cyan-400 text-2xl md:text-3xl">
          🀁
        </div>
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-white font-display">SIREDOM ADMIN</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Portal Admin & Super Admin</p>
      </div>

      <main className="max-w-md mx-auto w-full my-auto">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 md:p-6 shadow-2xl relative overflow-hidden">
          {/* Top Border Highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold text-center font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Admin / Super Admin Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs md:text-sm font-mono">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase text-xs">AKUN ADMIN CAFE / EMAIL</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3.5 py-2.5 md:py-3 text-white font-bold focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="admin@tabslowbar.com atau KODE TENANT"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase text-xs">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3.5 py-2.5 md:py-3 text-white font-bold focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 md:py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isPending ? 'MEMVERIFIKASI...' : 'LOGIN PORTAL ADMIN'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-4 font-mono">
        SIREDOM Multi-Tenant SaaS Platform • Powered by Antigravity
      </footer>
    </div>
  );
}
