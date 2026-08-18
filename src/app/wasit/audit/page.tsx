'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { History, RotateCcw, ShieldAlert, Award, FileSpreadsheet } from 'lucide-react';

export default function WasitAuditPage() {
  const { match, rollbackLastRound, resetMatch, tenantCode, tableNumber } = useScorerStore();

  const handleRollback = () => {
    if (confirm('Apakah Anda yakin ingin membatalkan (rollback) ronde terakhir? Skor kumulatif akan dihitung ulang secara otomatis.')) {
      rollbackLastRound();
    }
  };

  const handleResetFullMatch = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin MERISET PERTANDINGAN SECARA KESELURUHAN? Semua riwayat ronde akan dihapus dan poin kembali ke 0.')) {
      resetMatch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <History className="w-6 h-6 text-purple-400" />
            Audit Log & Rollback Ronde Meja
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Riwayat Kronologis Pertandingan Meja ({tenantCode} • MEJA #{tableNumber})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            disabled={match.rounds.length === 0}
            onClick={handleRollback}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 disabled:opacity-50 text-amber-300 font-bold text-xs shadow-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            ROLLBACK RONDE TERAKHIR (R#{match.rounds.length})
          </button>

          <button
            disabled={match.rounds.length === 0 && match.players.every((p) => p.currentScore === 0)}
            onClick={handleResetFullMatch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-800 disabled:opacity-50 text-rose-300 font-extrabold text-xs shadow-lg transition-all"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            RESET MATCH TOTAL
          </button>
        </div>
      </div>


      {/* Rounds Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            Tabel Kronologis Ronde Dimainkan ({match.rounds.length} Total Ronde)
          </h2>
        </div>

        {match.rounds.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs italic font-mono">
            Belum ada ronde dimainkan pada sesi ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">Ronde #</th>
                  <th className="p-4">Jenis Aksi</th>
                  <th className="p-4">Pemenang</th>
                  {match.players.map((p) => (
                    <th key={p.id} className="p-4">
                      {p.name} (Kursi {p.seatNumber})
                    </th>
                  ))}
                  <th className="p-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {match.rounds.map((round) => {
                  const winner = match.players.find((p) => p.id === round.winnerPlayerId);

                  return (
                    <tr key={round.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-black text-cyan-400">R#{round.roundNumber}</td>
                      <td className="p-4 font-bold text-white uppercase">
                        {round.actionType === 'menang_biasa' && '👑 Menang Biasa'}
                        {round.actionType === 'kandang' && '🔥 Kandang'}
                        {round.actionType === 'ceki' && '✅ Ceki'}
                        {round.actionType === 'palang' && '🐐 Palang'}
                        {round.actionType === 'tangkap' && '🚓 Tangkap'}
                      </td>
                      <td className="p-4 font-extrabold text-amber-300">{winner?.name || '-'}</td>

                      {match.players.map((player) => {
                        const score = round.scores.find((s) => s.playerId === player.id);
                        if (!score) return <td key={player.id} className="p-4 text-slate-600">-</td>;

                        let badgeColor = 'bg-slate-950 text-slate-400 border-slate-800';
                        if (score.status === 'menang') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800/80 font-bold';
                        if (score.status === 'ditangkap') badgeColor = 'bg-rose-950 text-rose-300 border-rose-800/80 font-bold';
                        if (score.status === 'berdiri') badgeColor = 'bg-red-950 text-red-300 border-red-800/80';

                        return (
                          <td key={player.id} className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${badgeColor}`}>
                              {score.pointsAwarded > 0 ? `+${score.pointsAwarded}` : score.pointsAwarded} PTS
                            </span>
                          </td>
                        );
                      })}

                      <td className="p-4 text-right text-slate-500 text-[11px]">
                        {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
