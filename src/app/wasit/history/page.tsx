'use client';

import React, { useState, useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { History, Trophy, Calendar, Coffee, ChevronRight, User } from 'lucide-react';

export default function WasitHistoryPage() {
  const { tenantCode, tableNumber } = useScorerStore();
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const codeToUse = tenantCode || 'TAB-SLOWBAR';
        const res = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
        const json = await res.json();

        if (json.data) {
          setHistoryMatches([json.data]);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [tenantCode, tableNumber]);

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <History className="w-5 h-5 text-cyan-400" />
            RIWAYAT PERTANDINGAN MEJA #{tableNumber}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arsip lengkap histori hasil pertandingan dan skor akhir yang tersimpan di PostgreSQL.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 font-mono">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Memuat arsip pertandingan...</p>
        </div>
      ) : historyMatches.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3 font-mono">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">Belum ada riwayat pertandingan selesai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 font-mono">
          {historyMatches.map((m) => {
            const players = m.players || [];
            const sortedPlayers = [...players].sort((a: any, b: any) => b.currentScore - a.currentScore);
            const winner = sortedPlayers[0];

            return (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
                      MEJA #{m.tableNumber || tableNumber}
                    </span>
                    <span className="text-xs font-black text-white">
                      {m.rounds?.length || 0} RONDE BERJALAN
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>MODE: <strong className="text-cyan-400 uppercase">{m.matchMode}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(m.createdAt || Date.now()).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>

                {winner && (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 uppercase block">PEMENANG MATCH</span>
                        <span className="text-sm font-black text-white">{winner.name}</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-amber-300 font-mono">{winner.currentScore} POIN</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {sortedPlayers.map((p: any, idx: number) => (
                    <div key={p.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 font-bold block">#{idx + 1} KURSI #{p.seatNumber}</span>
                      <span className="font-extrabold text-white truncate block">{p.name}</span>
                      <span className="text-xs font-black text-cyan-400 block mt-0.5">{p.currentScore} Poin</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
