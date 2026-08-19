'use client';

import React, { useState, useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Tv, Trophy, TrendingUp, Radio, Activity, ChevronDown, AlertCircle } from 'lucide-react';
import { Match, Player } from '@/types/domino';

const PLAYER_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b']; // Red, Blue, Green, Yellow

export default function LeaderboardTVPage() {
  const { masterTables, tenantCode, tableNumber } = useScorerStore();
  const [selectedTableNum, setSelectedTableNum] = useState<number>(tableNumber || 1);
  const [isClient, setIsClient] = useState(false);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch live match session from Supabase Database API for selectedTableNum
  const fetchLiveMatchForTable = async (tNum: number, isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const res = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tNum}`);
      const json = await res.json();

      if (json.status === 'success' && json.data) {
        const m = json.data;
        const formattedMatch: Match = {
          id: m.id,
          tenantId: m.tenantId,
          tableNumber: m.tableNumber,
          matchMode: (m.matchMode?.toLowerCase() as any) || 'rounds',
          targetValue: m.targetValue,
          pointsConfig: m.pointsConfig,
          status: (m.status?.toLowerCase() as any) || 'in_progress',
          players: m.players || [],
          rounds: m.rounds || [],
        };
        setLiveMatch(formattedMatch);
      } else {
        setLiveMatch(null);
      }
    } catch (err) {
      console.error('Failed to fetch live match for TV:', err);
      setLiveMatch(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatchForTable(selectedTableNum, true);

    // Silent background polling every 3 seconds
    const interval = setInterval(() => {
      fetchLiveMatchForTable(selectedTableNum, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTableNum, tenantCode]);

  if (!isClient) return null;

  // Active match data or fallback to empty state
  const matchToDisplay = liveMatch || {
    id: 'empty',
    tenantId: tenantCode || 'TAB-SLOWBAR',
    tableNumber: selectedTableNum,
    matchMode: 'rounds' as const,
    targetValue: 10,
    pointsConfig: { menang_biasa: 1, kandang: 3, ceki: 2, palang: 3, tangkap: 2, ditangkap: -3, berdiri: 0, duduk: 0 },
    status: 'in_progress' as const,
    players: [],
    rounds: [],
  };

  // Get ranked players sorted by score
  const sortedPlayers = [...matchToDisplay.players].sort((a, b) => b.currentScore - a.currentScore);
  const currentLeader = sortedPlayers.length > 0 && sortedPlayers[0].currentScore > 0 ? sortedPlayers[0] : null;

  // Compute telemetry line chart data per round
  const telemetryChartData = matchToDisplay.rounds.map((round) => {
    const roundItem: Record<string, any> = { round: `R${round.roundNumber}` };
    matchToDisplay.players.forEach((p) => {
      const scoreObj = round.scores?.find((s: any) => s.playerId === p.id);
      roundItem[p.name] = scoreObj ? scoreObj.scoreAfter : p.currentScore;
    });
    return roundItem;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 md:px-8 rounded-3xl backdrop-blur-md shadow-2xl font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center font-black text-cyan-400 text-xl shadow-inner">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black text-white tracking-wide font-display">
                SIREDOM SPECTATOR TV
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse flex items-center gap-1">
                <Radio className="w-3 h-3" /> LIVE BROADCAST
              </span>
            </div>
            <p className="text-xs text-slate-400">
              TENANT: <strong className="text-cyan-400">{tenantCode || 'TAB-SLOWBAR'}</strong>
            </p>
          </div>
        </div>

        {/* Table Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase">PILIH MEJA BROADCAST:</label>
          <div className="relative">
            <select
              value={selectedTableNum}
              onChange={(e) => setSelectedTableNum(Number(e.target.value))}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 pr-9 text-xs font-extrabold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  MEJA #{num}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </header>

      {/* Main Broadcast Content Grid */}
      <main className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left 5 Columns: Leaderboard Cards */}
        <div className="lg:col-span-5 space-y-4 font-mono">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs font-black text-white flex items-center gap-2 uppercase">
              <Trophy className="w-4 h-4 text-amber-400" /> KLASEMEN SEMENTARA MEJA #{selectedTableNum}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {matchToDisplay.rounds.length} RONDE BERJALAN
            </span>
          </div>

          {isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Menghubungkan ke telemetry meja...</p>
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Belum ada sesi pertandingan aktif pada Meja #{selectedTableNum}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const isLeader = index === 0;
                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between shadow-xl ${
                      isLeader
                        ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/80 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border ${
                          isLeader
                            ? 'bg-amber-950 text-amber-300 border-amber-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {index === 0 ? '👑' : `#${index + 1}`}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base truncate font-display">{player.name}</h3>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">KURSI #{player.seatNumber}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-2xl font-black font-mono block ${isLeader ? 'text-amber-300' : 'text-cyan-400'}`}>
                        {player.currentScore}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">POIN</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 7 Columns: Recharts Telemetry Line Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between shadow-2xl font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <span className="text-xs font-black text-white flex items-center gap-2 uppercase">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> TELEMETRY POIN PER RONDE
            </span>
            <span className="text-xs text-slate-400 font-bold">
              MODE: <strong className="text-cyan-400 uppercase">{matchToDisplay.matchMode}</strong> (TARGET: {matchToDisplay.targetValue})
            </span>
          </div>

          <div className="h-80 w-full">
            {telemetryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                Grafik akan tampil otomatis setelah ronde pertama selesai.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="round" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '16px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {matchToDisplay.players.map((player, idx) => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={player.name}
                      stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
