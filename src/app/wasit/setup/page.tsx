'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { Users, Target, Sliders, ArrowRight } from 'lucide-react';
import { PointsConfig } from '@/types/domino';

const SEAT_LABELS = [
  { seat: 1, label: 'Kursi 1 (Merah)', placeholder: 'Masukkan nama Pemain 1...', border: 'border-rose-500/40 focus:border-rose-500' },
  { seat: 2, label: 'Kursi 2 (Biru)', placeholder: 'Masukkan nama Pemain 2...', border: 'border-blue-500/40 focus:border-blue-500' },
  { seat: 3, label: 'Kursi 3 (Hijau)', placeholder: 'Masukkan nama Pemain 3...', border: 'border-emerald-500/40 focus:border-emerald-500' },
  { seat: 4, label: 'Kursi 4 (Kuning)', placeholder: 'Masukkan nama Pemain 4...', border: 'border-amber-500/40 focus:border-amber-500' },
];

export default function WasitSetupPage() {
  const router = useRouter();
  const { match, updateMatchSetup, tenantCode, tableNumber } = useScorerStore();

  // Always initialize players array with 4 seat objects [seat 1..4]
  const [players, setPlayers] = useState<{ seatNumber: 1 | 2 | 3 | 4; name: string }[]>(() => {
    const existing = match?.players || [];
    return ([1, 2, 3, 4] as const).map((seatNum) => {
      const found = existing.find((p) => p.seatNumber === seatNum);
      return {
        seatNumber: seatNum,
        name: found ? found.name : '',
      };
    });
  });

  const [matchMode, setMatchMode] = useState<'rounds' | 'points'>(match.matchMode || 'rounds');
  const [targetValue, setTargetValue] = useState<number | string>(match.targetValue || 10);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(match.pointsConfig);

  const handlePlayerNameChange = (seatNumber: 1 | 2 | 3 | 4, name: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.seatNumber === seatNumber ? { ...p, name } : p))
    );
  };

  const handleConfigChange = (key: keyof PointsConfig, delta: number) => {
    setPointsConfig((prev) => ({
      ...prev,
      [key]: prev[key] + delta,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTargetValue = Number(targetValue) || (matchMode === 'rounds' ? 10 : 50);

    // Fallback names if left blank by wasit
    const formattedPlayers = players.map((p) => ({
      seatNumber: p.seatNumber,
      name: p.name.trim() || `Pemain ${p.seatNumber}`,
    }));

    updateMatchSetup(formattedPlayers, matchMode, finalTargetValue, pointsConfig);

    // Persist setup directly to Supabase PostgreSQL database
    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETUP_MATCH',
          tenantCode: codeToUse,
          tableNumber: tableNumber || 1,
          setupData: {
            matchMode,
            targetValue: finalTargetValue,
            pointsConfig,
            players: formattedPlayers,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to post SETUP_MATCH to DB API:', err);
    }

    router.push('/wasit/live');
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-cyan-400" />
            Konfigurasi Pertandingan Wasit Meja
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Setup Nama 4 Pemain, Target Pertandingan, & Aturan Bobot Poin Custom ({tenantCode} • MEJA {tableNumber})
          </p>
        </div>
      </div>

      {/* Section 1: Player Seats (Seats 1-4) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Users className="w-4 h-4 text-cyan-400" />
          1. Setup 4 Kursi Pemain Fisik
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEAT_LABELS.map((seat) => {
            const current = players.find((p) => p.seatNumber === seat.seat);

            return (
              <div key={seat.seat} className="space-y-1.5 font-mono text-xs">
                <label className="block text-slate-400 font-bold">
                  {seat.label}
                </label>
                <input
                  type="text"
                  value={current?.name || ''}
                  onChange={(e) =>
                    handlePlayerNameChange(seat.seat as 1 | 2 | 3 | 4, e.target.value)
                  }
                  className={`w-full bg-slate-950 border ${seat.border} rounded-xl px-4 py-3 text-white font-extrabold focus:outline-none text-sm`}
                  placeholder={seat.placeholder}
                  required
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Match Target (Fixed Rounds vs Race to Points) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Target className="w-4 h-4 text-amber-400" />
          2. Mode & Target Pertandingan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode Selector */}
          <div className="space-y-2 font-mono text-xs">
            <label className="block text-slate-400 font-bold uppercase">TIPE TARGET MATCH</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMatchMode('rounds');
                  setTargetValue(10);
                }}
                className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                  matchMode === 'rounds'
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                FIXED ROUNDS (Total Ronde)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMatchMode('points');
                  setTargetValue(50);
                }}
                className={`p-3 rounded-xl border font-bold text-xs transition-all ${
                  matchMode === 'points'
                    ? 'bg-amber-950 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                RACE TO POINTS (Target Poin)
              </button>
            </div>
          </div>

          {/* Target Value Input */}
          <div className="space-y-2 font-mono text-xs">
            <label className="block text-slate-400 font-bold uppercase">
              {matchMode === 'rounds' ? 'TOTAL RONDE MATCH' : 'TARGET BATAS POIN KEMENANGAN'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={targetValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setTargetValue('');
                  } else {
                    setTargetValue(val.replace(/^0+(?=\d)/, ''));
                  }
                }}
                min={1}
                max={200}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold text-base focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-bold text-slate-400 uppercase">
                {matchMode === 'rounds' ? 'RONDE' : 'POIN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Points Weight Config Steppers */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Sliders className="w-4 h-4 text-emerald-400" />
          3. Konfigurasi Bobot Poin (Custom Point Weights)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
          {[
            { key: 'menang_biasa', label: 'Menang Biasa (👑)', desc: 'Menang standar ronde' },
            { key: 'kandang', label: 'Kandang (🔥)', desc: 'Tutup ronde / check' },
            { key: 'ceki', label: 'Ceki (✅)', desc: 'Ceki batu domino' },
            { key: 'palang', label: 'Palang (🐐)', desc: 'Palang batu domino' },
            { key: 'tangkap', label: 'Tangkap (🚓)', desc: 'Bonus penangkap' },
            { key: 'ditangkap', label: 'Ditangkap (💀)', desc: 'Penalti korban tangkap' },
          ].map((item) => {
            const k = item.key as keyof PointsConfig;
            const val = pointsConfig[k];

            return (
              <div
                key={item.key}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-extrabold text-white block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfigChange(k, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center border border-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-black text-sm text-cyan-400">
                    {val > 0 ? `+${val}` : val}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleConfigChange(k, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center border border-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Submit Action Bar */}
      <div className="pt-2">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all active:scale-98"
        >
          SIMPAN & MULAI SESI WASIT <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
