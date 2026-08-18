'use client';

import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, HardDrive, RefreshCcw, Building2, Layers, Users, ShieldCheck } from 'lucide-react';

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'SUCCESS';
  service: string;
  message: string;
}

interface SystemStats {
  tenantsCount: number;
  tablesCount: number;
  activeMatchesCount: number;
  usersCount: number;
}

export default function SuperAdminSystemPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    tenantsCount: 0,
    tablesCount: 0,
    activeMatchesCount: 0,
    usersCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSystemLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/logs');
      const json = await res.json();
      if (json.status === 'success') {
        setLogs(json.data.logs || []);
        setStats(json.data.stats || { tenantsCount: 0, tablesCount: 0, activeMatchesCount: 0, usersCount: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Server className="w-6 h-6 text-purple-400" />
            System Audit Logs & Database Telemetry
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Audit Log Dinamis Berbasis Data Real-Time Supabase PostgreSQL Database & Node.js Server
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSystemLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-colors"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> REFRESH LOGS
          </button>

          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse text-emerald-400" /> SUPABASE DB CONNECTED
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">TOTAL TENANT SAAAS</span>
            <Building2 className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.tenantsCount} Tenant</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            ● Terdaftar di PostgreSQL
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">TOTAL MEJA MASTER</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.tablesCount} Meja</div>
          <div className="text-xs text-slate-400 mt-1">Status Meja Aktif</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">SESI LIVE MATCH</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.activeMatchesCount} Sesi Aktif</div>
          <div className="text-xs text-emerald-400 mt-1">● In-Progress Match Sessions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">PENGGUNA & AUTH</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.usersCount} Akun User</div>
          <div className="text-xs text-emerald-400 mt-1">● Bcrypt Password Encrypted</div>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Live System Audit & Execution Logs
          </h2>
          <span className="text-[10px] text-slate-500">Auto-fetched from Supabase PostgreSQL</span>
        </div>

        <div className="p-6 bg-slate-950 text-xs text-slate-300 space-y-2.5 overflow-x-auto max-h-[450px]">
          {isLoading ? (
            <div className="text-slate-500 font-bold p-4 text-center">Memuat log sistem dinamis...</div>
          ) : logs.length === 0 ? (
            <div className="text-slate-500 font-bold p-4 text-center">Belum ada log sistem tercatat.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  log.level === 'SUCCESS'
                    ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                    : log.level === 'WARN'
                    ? 'bg-amber-950/30 border-amber-900/60 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 font-extrabold uppercase border border-slate-800">
                    {log.service}
                  </span>
                  <span className="font-semibold">{log.message}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
