'use client';

import React, { useState, useEffect, use } from 'react';
import { History, Trophy, Calendar } from 'lucide-react';
import { useScorerStore } from '@/store/useScorerStore';

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default function TableHistoryPage({ params }: PageProps) {
  const { tableId } = use(params);
  const { tenantCode } = useScorerStore();
  const [historyMatches, setHistoryMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!tenantCode || !tenantCode.trim()) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/matches?tenantCode=${encodeURIComponent(tenantCode)}&tableId=${tableId}`);
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
  }, [tableId, tenantCode]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <History className="w-5 h-5 text-cyan-400" />
            RIWAYAT PERTANDINGAN MEJA ID: {tableId}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arsip lengkap histori hasil pertandingan yang tersimpan di PostgreSQL.
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
            const players = m.players || m.playersData || [];
            const sortedPlayers = [...players].sort((a: any, b: any) => b.currentScore - a.currentScore);
            const winner = sortedPlayers[0];

            return (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
                      MEJA ID: {tableId}
                    </span>
                    <span className="text-xs font-black text-white">
                      {m.rounds?.length || m.roundsHistory?.length || 0} RONDE BERJALAN
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>MODE: <strong className="text-cyan-400 uppercase">{m.rulesetMode || m.matchMode}</strong></span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
