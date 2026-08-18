'use client';

import React, { useState, useTransition } from 'react';
import { Numpad } from '@/components/Numpad';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { KeyRound, LayoutDashboard, ShieldCheck, ArrowRight } from 'lucide-react';
import { loginAction } from '@/app/actions/authActions';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, tenantCode, tableNumber } = useScorerStore();

  const [mode, setMode] = useState<'wasit' | 'admin'>('wasit');
  const [pin, setPin] = useState('');
  const [tenantInput, setTenantInput] = useState(tenantCode || 'TAB-SLOWBAR');

  const [tableInput, setTableInput] = useState<number | string>(tableNumber || 1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleWasitLogin = () => {
    setErrorMsg('');
    if (!tenantInput.trim()) {
      setErrorMsg('Masukkan Kode Tenant');
      return;
    }
    if (!tableInput) {
      setErrorMsg('Masukkan Nomor Meja');
      return;
    }
    if (pin.length < 4) {
      setErrorMsg('Masukkan 4-digit PIN Meja');
      return;
    }

    startTransition(async () => {
      const res = await loginAction({
        role: 'wasit',
        identifier: pin,
        tableNumber: Number(tableInput),
      });

      if (res.success && res.role) {
        setAuth(true, res.role as any, res.tenantCode, res.tableNumber);
        router.push('/wasit/live');
      } else {
        setErrorMsg(res.error || 'PIN Wasit tidak valid!');
      }
    });
  };

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
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col justify-between p-4 selection:bg-cyan-500 selection:text-gray-950 font-sans">
      {/* Brand Header */}
      <div className="max-w-md mx-auto w-full pt-8 pb-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 p-1 mx-auto mb-3 shadow-2xl flex items-center justify-center font-black text-cyan-400 text-3xl">
          🀁
        </div>
        <h1 className="text-2xl font-black tracking-wider text-white font-display">SIREDOM PORTAL</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Sistem Rekapitulasi Domino SaaS Multi-Tenant</p>
      </div>

      <main className="max-w-md mx-auto w-full my-auto">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
          {/* Top Border Highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1.5 rounded-xl border border-slate-800 mb-6">
            <button
              onClick={() => {
                setMode('wasit');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-lg text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'wasit'
                  ? 'bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              MODE WASIT MEJA
            </button>

            <button
              onClick={() => {
                setMode('admin');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-lg text-xs font-extrabold tracking-wider flex items-center justify-center gap-2 transition-all ${
                mode === 'admin'
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              MODE CAFE ADMIN
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold text-center font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Mode Wasit Meja (Numeric Keypad PIN Login) */}
          {mode === 'wasit' && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase">KODE TENANT</label>
                  <input
                    type="text"
                    value={tenantInput}
                    onChange={(e) => setTenantInput(e.target.value.toUpperCase())}
                    className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-extrabold focus:outline-none focus:border-cyan-500 uppercase"
                    placeholder="TAB-SLOWBAR"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase">NOMOR MEJA</label>
                  <input
                    type="number"
                    value={tableInput}
                    onChange={(e) => setTableInput(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-extrabold focus:outline-none focus:border-cyan-500"
                    min={1}
                    max={25}
                  />
                </div>
              </div>

              <div className="text-center text-[11px] font-mono text-cyan-400 mb-3 font-bold">
                PIN WASIT MEJA
              </div>

              <Numpad value={pin} onChange={setPin} onSubmit={handleWasitLogin} maxLength={4} />
            </div>
          )}

          {/* Mode Admin / Super Admin Form */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">AKUN ADMIN CAFE / EMAIL</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="admin@tabslowbar.com atau KODE TENANT"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {isPending ? 'MEMVERIFIKASI...' : 'LOGIN PORTAL ADMIN'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-4 font-mono">
        SIREDOM Multi-Tenant SaaS Platform • Powered by Antigravity
      </footer>
    </div>
  );
}
