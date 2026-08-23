'use client';

import React, { use } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { History, RotateCcw, ShieldAlert } from 'lucide-react';

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default function TableAuditPage({ params }: PageProps) {
  const { tableId } = use(params);
  const { match, rollbackLastRound, resetMatch } = useScorerStore();

  const handleRollback = () => {
    if (confirm('Apakah Anda yakin ingin membatalkan (rollback) ronde terakhir? Skor kumulatif akan dihitung ulang secara otomatis.')) {
      rollbackLastRound();
    }
  };

  const handleResetFullMatch = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin MERISET PERTANDINGAN SECARA KESELURUHAN? Semua riwayat ronde akan dihapus.')) {
      resetMatch();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <History className="w-6 h-6 text-purple-400" />
            Audit Log & Rollback Ronde (Meja ID: {tableId})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Riwayat Kronologis Pertandingan Meja
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            disabled={match.rounds.length === 0}
            onClick={handleRollback}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800 disabled:opacity-50 text-amber-300 font-bold text-xs shadow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            ROLLBACK RONDE TERAKHIR (R#{match.rounds.length})
          </button>

          <button
            disabled={match.rounds.length === 0 && match.players.every((p) => p.currentScore === 0)}
            onClick={handleResetFullMatch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-800 disabled:opacity-50 text-rose-300 font-extrabold text-xs shadow-lg transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            RESET MATCH
          </button>
        </div>
      </div>

      {/* Round History Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
        <h2 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-slate-800 pb-3">
          LOG DETAIL PERTANDINGAN ({match.rounds.length} RONDE)
        </h2>

        {match.rounds.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Belum ada ronde yang dimainkan pada sesi ini.
          </div>
        ) : (
          <div className="space-y-2">
            {[...match.rounds].reverse().map((round) => {
              const winnerObj = match.players.find((p) => p.id === round.winnerPlayerId);
              const victimObj = match.players.find((p) => p.id === round.victimPlayerId);

              return (
                <div key={round.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 font-black">
                      R#{round.roundNumber}
                    </span>
                    <span className="font-extrabold text-white uppercase">
                      {round.actionType.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">
                      Pemenang: <strong className="text-amber-300">{winnerObj?.name || 'Pemain'}</strong>
                      {victimObj && (
                        <span className="text-rose-400 ml-2">(Korban: {victimObj.name})</span>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(round.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
