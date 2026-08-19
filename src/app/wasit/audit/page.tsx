'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { History, RotateCcw, ShieldAlert, Award, Tv, Trophy, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function WasitAuditPage() {
  const { match, rollbackLastRound, resetMatch, tenantCode, tableNumber, getRankedPlayers, getTelemetryData } = useScorerStore();
  const [isTvPopupOpen, setIsTvPopupOpen] = useState(false);

  const rankedPlayers = getRankedPlayers();
  const telemetryData = getTelemetryData();

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
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
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
          {/* Spectator TV Popup Modal Button */}
          <button
            onClick={() => setIsTvPopupOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold text-xs shadow-lg transition-all font-mono"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            SPECTATOR TV POP-UP
          </button>

          <button
            disabled={match.rounds.length === 0}
            onClick={handleRollback}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 disabled:opacity-50 text-amber-300 font-bold text-xs shadow-lg transition-all font-mono"
          >
            <RotateCcw className="w-4 h-4" />
            ROLLBACK RONDE TERAKHIR (R#{match.rounds.length})
          </button>

          <button
            disabled={match.rounds.length === 0 && match.players.every((p) => p.currentScore === 0)}
            onClick={handleResetFullMatch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-800 disabled:opacity-50 text-rose-300 font-extrabold text-xs shadow-lg transition-all font-mono"
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
                  <span className="text-[10px] text-slate-500">{new Date(round.timestamp).toLocaleTimeString('id-ID')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spectator TV Pop-Up Modal */}
      {isTvPopupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Tv className="w-5 h-5 text-cyan-400" />
                SPECTATOR TV LIVE TELEMETRY - MEJA #{tableNumber}
              </h3>
              <button
                onClick={() => setIsTvPopupOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standings Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rankedPlayers.map((p, idx) => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-[10px] text-slate-400 font-bold block">#{idx + 1} KURSI #{p.seatNumber}</span>
                  <span className="font-extrabold text-white truncate block">{p.name}</span>
                  <span className="text-sm font-black text-cyan-400 block mt-0.5">{p.currentScore} POIN</span>
                </div>
              ))}
            </div>

            {/* Telemetry Chart */}
            <div className="h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase mb-2">GRAFIK AKUMULASI POIN PER RONDE</h4>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={telemetryData}>
                  <XAxis dataKey="round" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                  {match.players.map((p, idx) => (
                    <Line
                      key={p.id}
                      type="monotone"
                      dataKey={p.name}
                      stroke={['#f59e0b', '#38bdf8', '#a855f7', '#f43f5e'][idx % 4]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
