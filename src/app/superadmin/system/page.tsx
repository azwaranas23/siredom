'use client';

import React from 'react';
import { Server, Activity, Database, Cpu, HardDrive, ShieldCheck, RefreshCcw } from 'lucide-react';

export default function SuperAdminSystemPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Server className="w-6 h-6 text-purple-400" />
            System Performance & Database Telemetry Log
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Status Server Node.js Next.js App Router, Prisma MySQL Client, & WebSockets Realtime Channel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse text-emerald-400" /> SYSTEM HEALTHY 99.9%
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">DATABASE ORM</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">MySQL (Prisma 7)</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            ● Connection Active (4ms)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">SERVER MEMORY</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white">184.2 MB / 1024 MB</div>
          <div className="text-xs text-slate-400 mt-1">RAM Utilization 18%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">REALTIME WEBSOCKET</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">12 Subscribed</div>
          <div className="text-xs text-emerald-400 mt-1">● TV Spectator Channels</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase">HTTP LATENCY</span>
            <Cpu className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">12 ms p99</div>
          <div className="text-xs text-emerald-400 mt-1">● Next.js App Router</div>
        </div>
      </div>

      {/* System Audit Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-mono">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Server Execution & Error Logs
          </h2>
          <span className="text-[10px] text-slate-500">Live Auto-Scroll</span>
        </div>

        <div className="p-6 bg-slate-950 text-xs text-slate-300 space-y-2 overflow-x-auto">
          <div className="text-emerald-400">[2026-08-16 10:50:12] [INFO] Prisma Client connection pool established. Provider: MySQL</div>
          <div className="text-cyan-400">[2026-08-16 10:50:15] [INFO] Tenant WARKOP-A loaded active table session #1</div>
          <div className="text-slate-400">[2026-08-16 10:51:00] [DEBUG] Commit Round #21 for Match match-1. Winner: p1, Action: MENANG_BIASA</div>
          <div className="text-amber-400">[2026-08-16 10:51:01] [REALTIME] Broadcasted round commit payload to channel match-1-tv</div>
          <div className="text-slate-400">[2026-08-16 10:51:45] [DEBUG] FSM Engine state set to IDLE</div>
        </div>
      </div>
    </div>
  );
}
