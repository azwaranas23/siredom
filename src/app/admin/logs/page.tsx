'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import Link from 'next/link';
import { Match, Round } from '@/types/domino';
import {
  FileText,
  Download,
  Search,
  Filter,
  ArrowLeft,
  Trophy,
  Calendar,
  Layers,
  Activity,
  ChevronRight,
  X,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  menang_biasa: { label: 'Menang Biasa', icon: '👑' },
  kandang: { label: 'Kandang', icon: '🔥' },
  ceki: { label: 'Ceki', icon: '✅' },
  palang: { label: 'Palang', icon: '🐐' },
  tangkap: { label: 'Tangkap', icon: '🚓' },
};

export default function AdminLogsPage() {
  const { tenantCode, masterTables, getAllMatchHistory, getRankedPlayers } = useScorerStore();

  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<Match | null>(null);

  const allMatches = getAllMatchHistory();

  // Filter matches based on search and dropdown filters
  const filteredMatches = allMatches.filter((match) => {
    // Table Filter
    if (selectedTable !== 'all' && match.tableNumber !== Number(selectedTable)) {
      return false;
    }
    // Status Filter
    if (selectedStatus !== 'all' && match.status !== selectedStatus) {
      return false;
    }
    // Search Query (Player Name or Session ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchIdHit = match.id.toLowerCase().includes(q);
      const playerHit = match.players.some((p) => p.name.toLowerCase().includes(q));
      const tableHit = `meja ${match.tableNumber}`.toLowerCase().includes(q);
      if (!matchIdHit && !playerHit && !tableHit) {
        return false;
      }
    }
    return true;
  });

  // Calculate Overall KPI Recap Stats
  const totalMatchesCount = filteredMatches.length;
  const totalRoundsPlayed = filteredMatches.reduce((sum, m) => sum + m.rounds.length, 0);
  const totalPointsAwarded = filteredMatches.reduce((sum, m) => {
    return sum + m.players.reduce((pSum, p) => pSum + p.currentScore, 0);
  }, 0);

  // Count Action Frequencies for Top Action KPI
  const actionCounts: Record<string, number> = {
    menang_biasa: 0,
    kandang: 0,
    ceki: 0,
    palang: 0,
    tangkap: 0,
  };
  filteredMatches.forEach((m) => {
    m.rounds.forEach((r) => {
      if (actionCounts[r.actionType] !== undefined) {
        actionCounts[r.actionType] += 1;
      }
    });
  });

  let topAction = 'menang_biasa';
  let topActionCount = 0;
  Object.entries(actionCounts).forEach(([act, cnt]) => {
    if (cnt > topActionCount) {
      topActionCount = cnt;
      topAction = act;
    }
  });

  // Export Filtered Log Data to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Sesi',
      'Nomor Meja',
      'Status Sesi',
      'Mode Pertandingan',
      'Target Match',
      'Total Ronde',
      'Juara 1',
      'Skor Juara 1',
      'Pemain Kursi 1 (Merah)',
      'Poin Kursi 1',
      'Pemain Kursi 2 (Biru)',
      'Poin Kursi 2',
      'Pemain Kursi 3 (Hijau)',
      'Poin Kursi 3',
      'Pemain Kursi 4 (Kuning)',
      'Poin Kursi 4',
    ];

    const rows = filteredMatches.map((m) => {
      const ranked = getRankedPlayers(m.tableNumber);
      const champion = ranked[0]?.name || '-';
      const champScore = ranked[0]?.currentScore || 0;

      const p1 = m.players.find((p) => p.seatNumber === 1);
      const p2 = m.players.find((p) => p.seatNumber === 2);
      const p3 = m.players.find((p) => p.seatNumber === 3);
      const p4 = m.players.find((p) => p.seatNumber === 4);

      return [
        `"${m.id}"`,
        `"Meja #${m.tableNumber}"`,
        `"${m.status.toUpperCase()}"`,
        `"${m.matchMode === 'rounds' ? 'Fixed Rounds' : 'Race to Points'}"`,
        `"${m.targetValue}"`,
        `"${m.rounds.length}"`,
        `"${champion}"`,
        `"${champScore}"`,
        `"${p1?.name || '-'}"`,
        `"${p1?.currentScore || 0}"`,
        `"${p2?.name || '-'}"`,
        `"${p2?.currentScore || 0}"`,
        `"${p3?.name || '-'}"`,
        `"${p3?.currentScore || 0}"`,
        `"${p4?.name || '-'}"`,
        `"${p4?.currentScore || 0}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIREDOM_Audit_Log_${tenantCode}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner & Action Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Kembali ke Dashboard Admin"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 font-display">
              <FileText className="w-6 h-6 text-cyan-400" />
              Audit Log & Rekap Sesi Pertandingan Admin
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1 ml-11">
            Rekapitulasi lengkap riwayat skor, statistik meja, & log per ronde ({tenantCode})
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" /> EKSPOR DATA REKAP (CSV)
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">TOTAL SESI MEJA</span>
            <span className="text-2xl font-black font-mono text-white">{totalMatchesCount} <span className="text-xs text-slate-500 font-normal">Sesi</span></span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">TOTAL RONDE DIMAINKAN</span>
            <span className="text-2xl font-black font-mono text-cyan-400">{totalRoundsPlayed} <span className="text-xs text-slate-500 font-normal">Ronde</span></span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">TOTAL POIN TERKUMPUL</span>
            <span className="text-2xl font-black font-mono text-emerald-400">{totalPointsAwarded} <span className="text-xs text-slate-500 font-normal">PTS</span></span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl">
            {ACTION_LABELS[topAction]?.icon || '👑'}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">AKSI PALING FREKUEN</span>
            <span className="text-sm font-extrabold text-amber-300 block">{ACTION_LABELS[topAction]?.label || 'Menang Biasa'}</span>
            <span className="text-[11px] font-mono text-slate-400">{topActionCount}x Kejadian</span>
          </div>
        </div>
      </div>

      {/* Multi-Criteria Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pemain / meja / Sesi ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Table Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-bold">MEJA:</span>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-transparent text-cyan-300 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">Semua Meja</option>
              {masterTables.map((t) => (
                <option key={t.id} value={t.tableNumber} className="bg-slate-900 text-white">
                  Meja #{t.tableNumber} - {t.tableName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-slate-400 font-bold">STATUS:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-cyan-300 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">Semua Status</option>
              <option value="in_progress" className="bg-slate-900 text-white">Aktif (In Progress)</option>
              <option value="completed" className="bg-slate-900 text-white">Selesai (Completed)</option>
              <option value="setup" className="bg-slate-900 text-white">Belum Setup</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-500">
          Menampilkan <strong className="text-cyan-400">{filteredMatches.length}</strong> dari {allMatches.length} Sesi
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 font-bold">MEJA & ID SESI</th>
                <th className="py-3.5 px-4 font-bold">MODE & TARGET</th>
                <th className="py-3.5 px-4 font-bold">KLASMEN & SKOR 4 PEMAIN</th>
                <th className="py-3.5 px-4 font-bold">JUARA MEJA</th>
                <th className="py-3.5 px-4 font-bold text-center">TOTAL RONDE</th>
                <th className="py-3.5 px-4 font-bold text-right">AKSI AUDIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-mono">
                    Tidak ada data log pertandingan yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredMatches.map((m) => {
                  const ranked = getRankedPlayers(m.tableNumber);
                  const champion = ranked[0];
                  const masterTableObj = masterTables.find((t) => t.tableNumber === m.tableNumber);

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Table & Session ID */}
                      <td className="py-4 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
                            MEJA #{m.tableNumber}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {masterTableObj?.tableName || ''}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">ID: {m.id}</div>
                      </td>

                      {/* Mode & Target */}
                      <td className="py-4 px-4 font-mono">
                        <span className="font-bold text-white block">
                          {m.matchMode === 'rounds' ? 'FIXED ROUNDS' : 'RACE TO POINTS'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Target: {m.targetValue} {m.matchMode === 'rounds' ? 'Ronde' : 'Poin'}
                        </span>
                      </td>

                      {/* 4 Players & Scores */}
                      <td className="py-4 px-4">
                        <div className="grid grid-cols-2 gap-1.5 max-w-sm">
                          {ranked.map((p) => {
                            const seatColors = [
                              'border-rose-500/40 text-rose-300',
                              'border-cyan-500/40 text-cyan-300',
                              'border-emerald-500/40 text-emerald-300',
                              'border-amber-500/40 text-amber-300',
                            ];
                            const border = seatColors[p.seatNumber - 1];

                            return (
                              <div
                                key={p.id}
                                className={`px-2 py-1 rounded border ${border} bg-slate-950/60 font-mono text-[11px] flex items-center justify-between`}
                              >
                                <span className="font-bold truncate max-w-[90px]">
                                  #{p.rank} {p.name}
                                </span>
                                <span className="font-extrabold text-white">{p.currentScore} PTS</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Champion / Winner */}
                      <td className="py-4 px-4 font-mono">
                        {m.status === 'setup' ? (
                          <span className="text-slate-500 italic text-[11px]">Belum Di-setup</span>
                        ) : champion && champion.currentScore > 0 ? (
                          <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-xl text-amber-300 font-extrabold text-xs inline-flex">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>{champion.name}</span>
                            <span className="text-[10px] text-amber-400">({champion.currentScore} Pts)</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Belum Ada Poin</span>
                        )}
                      </td>

                      {/* Total Rounds */}
                      <td className="py-4 px-4 font-mono text-center">
                        <span className="font-black text-sm text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          #{m.rounds.length}
                        </span>
                      </td>

                      {/* Audit Action Button */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setSelectedMatchDetail(m)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-slate-700 transition-colors shadow-md"
                        >
                          <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                          Detail Log Ronde
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Round Detail Modal */}
      {selectedMatchDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-cyan-400" />
                  Rincian Log Per Ronde - Meja #{selectedMatchDetail.tableNumber}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID Sesi: {selectedMatchDetail.id} • Total {selectedMatchDetail.rounds.length} Ronde Dimainkan
                </p>
              </div>

              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Round Breakdown Table */}
            {selectedMatchDetail.rounds.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-mono text-xs">
                Belum ada ronde yang dimainkan pada sesi meja ini.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMatchDetail.rounds.map((r) => {
                  const winner = selectedMatchDetail.players.find((p) => p.id === r.winnerPlayerId);
                  const actInfo = ACTION_LABELS[r.actionType] || { label: r.actionType, icon: '👑' };

                  return (
                    <div
                      key={r.id}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                            RONDE #{r.roundNumber}
                          </span>
                          <span className="font-extrabold text-amber-300 flex items-center gap-1">
                            {actInfo.icon} {actInfo.label}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          Pemenang: <strong className="text-white font-extrabold">{winner?.name || 'Pemain'}</strong>
                        </div>
                      </div>

                      {/* Score Breakdown per Player in Round */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                        {r.scores.map((s) => {
                          const pObj = selectedMatchDetail.players.find((p) => p.id === s.playerId);
                          const isWinner = s.playerId === r.winnerPlayerId;

                          return (
                            <div
                              key={s.playerId}
                              className={`p-2 rounded-xl border text-[11px] ${
                                isWinner
                                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                                  : s.pointsAwarded < 0
                                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <div className="font-bold truncate">{pObj?.name}</div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="uppercase text-[9px] opacity-75">{s.status}</span>
                                <span className="font-black text-xs">
                                  {s.pointsAwarded > 0 ? `+${s.pointsAwarded}` : s.pointsAwarded} Pts
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Tutup Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
