'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Tv, Trophy, TrendingUp, Radio, Activity, ChevronDown } from 'lucide-react';

const PLAYER_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b']; // Red, Blue, Green, Yellow

export default function LeaderboardTVPage() {
  const { masterTables, getTableMatch, getRankedPlayers, getTelemetryData, lastRoundDelta, tenantCode, tableNumber } = useScorerStore();
  const [selectedTableNum, setSelectedTableNum] = React.useState<number>(tableNumber || 1);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const activeMatch = getTableMatch(selectedTableNum);
  const rankedPlayers = getRankedPlayers(selectedTableNum);
  const telemetryData = getTelemetryData(selectedTableNum);
  const currentLeader = rankedPlayers[0];

  return (
    <div className="w-full min-h-screen bg-gray-950 text-white p-4 md:p-8 flex flex-col justify-between aspect-video font-sans">
      {/* Spectator TV Top Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 md:p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-2xl shadow-lg">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-display">
                SIREDOM LIVE TELEMETRY TV
              </h1>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" /> LIVE SYNC
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 font-mono mt-0.5">
              {tenantCode} • MEJA #{selectedTableNum} • Sesi ID: {activeMatch.id}
            </p>
          </div>
        </div>

        {/* Dynamic Table Selector & Match Stat Badges */}
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
          {/* Table Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 font-mono text-xs">
            <span className="text-slate-400 font-extrabold uppercase">PILIH MEJA:</span>
            <div className="relative">
              <select
                value={selectedTableNum}
                onChange={(e) => setSelectedTableNum(Number(e.target.value))}
                className="bg-slate-900 text-cyan-300 font-black px-3 py-1 pr-8 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none text-xs"
              >
                {masterTables.map((t) => (
                  <option key={t.id} value={t.tableNumber} className="bg-slate-900 text-white">
                    MEJA #{t.tableNumber} - {t.tableName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">TOTAL RONDE</span>
            <span className="text-xl font-black font-mono text-cyan-400">
              #{activeMatch.rounds.length}
            </span>
          </div>

          <div className="bg-amber-950/40 border border-amber-800/50 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-bold uppercase text-amber-400/80 block">LEADER SAAT INI</span>
            <span className="text-xl font-black text-amber-300 flex items-center justify-end gap-1">
              <Trophy className="w-4 h-4 text-amber-400" /> {currentLeader?.name || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column TV Grid (16:9 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-stretch">
        {/* Left Column: Live Standings (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between backdrop-blur-sm">
          <div>
            <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Klasemen Peringkat Meja #{selectedTableNum}
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {activeMatch.status === 'in_progress' ? 'AKTIF' : activeMatch.status === 'completed' ? 'FINISH' : 'SETUP'}
              </span>
            </h2>

            <div className="space-y-3">
              {rankedPlayers.map((player) => {
                const delta = lastRoundDelta[player.id];
                const seatColors = [
                  'border-rose-500/40 text-rose-300',
                  'border-blue-500/40 text-blue-300',
                  'border-emerald-500/40 text-emerald-300',
                  'border-amber-500/40 text-amber-300',
                ];
                const seatBorder = seatColors[player.seatNumber - 1];

                return (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border ${seatBorder} bg-slate-950/80 flex items-center justify-between shadow-lg transition-transform hover:scale-[1.01]`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm ${
                          player.rank === 1
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        #{player.rank}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-slate-400 font-mono">
                          KURSI {player.seatNumber}
                        </div>
                        <div className="text-lg font-extrabold text-white">
                          {player.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      {delta !== undefined && delta !== 0 && (
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            delta > 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                      <span className="text-2xl font-black font-mono text-white">
                        {player.currentScore} <span className="text-xs font-mono text-slate-500 font-bold">PTS</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between font-mono">
            <span>MODE: {activeMatch.matchMode.toUpperCase()}</span>
            <span>TARGET: {activeMatch.targetValue}</span>
          </div>
        </div>

        {/* Right Column: Telemetry Line Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between backdrop-blur-sm">
          <h2 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Grafik Akumulasi Poin Per Ronde (Meja #{selectedTableNum})
          </h2>

          <div className="w-full h-[340px] flex-1">
            {isClient && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="round" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {activeMatch.players.map((player, idx) => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={player.name}
                      stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Spectator Footer Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>SISTEM REKAPITULASI DOMINO (SIREDOM) • SPECTATOR MODE</span>
        </div>
        <div>REALTIME TELEMETRY ENGINE CONNECTED • MEJA #{selectedTableNum}</div>
      </div>
    </div>
  );
}
