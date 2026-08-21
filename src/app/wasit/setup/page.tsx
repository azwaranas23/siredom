'use client';

import React, { useState, useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { Users, Target, Sliders, ArrowRight, Shield, Lock, CheckSquare, Square, Trophy, Sparkles } from 'lucide-react';
import { PointsConfig, RulesetMode, MatchCategory, OradoConfig } from '@/types/domino';

const SEAT_CONFIG = [
  { seat: 1, team: 'A', colorName: 'Merah', label: 'Kursi 1 (Merah - Tim A)', placeholder: 'Nama Pemain 1...', border: 'border-rose-500/40 focus:border-rose-500' },
  { seat: 2, team: 'B', colorName: 'Biru', label: 'Kursi 2 (Biru - Tim B)', placeholder: 'Nama Pemain 2...', border: 'border-blue-500/40 focus:border-blue-500' },
  { seat: 3, team: 'A', colorName: 'Hijau', label: 'Kursi 3 (Hijau - Tim A)', placeholder: 'Nama Pemain 3...', border: 'border-emerald-500/40 focus:border-emerald-500' },
  { seat: 4, team: 'B', colorName: 'Kuning', label: 'Kursi 4 (Kuning - Tim B)', placeholder: 'Nama Pemain 4...', border: 'border-amber-500/40 focus:border-amber-500' },
];

const PORDI_DEFAULT_POINTS: PointsConfig = {
  menang_biasa: 1,
  kandang: 2,
  ceki: 2,
  palang: 4,
  tangkap: 3,
  ditangkap: -3,
  berdiri: 0,
  duduk: 0,
};

export default function WasitSetupPage() {
  const router = useRouter();
  const { match, updateMatchSetup, tenantCode, tableNumber } = useScorerStore();

  const [rulesetMode, setRulesetMode] = useState<RulesetMode>(match.rulesetMode || 'CASUAL');
  const [matchCategory, setMatchCategory] = useState<MatchCategory>(match.matchCategory || 'SINGLE_1V1V1V1');
  const [matchMode, setMatchMode] = useState<'rounds' | 'points'>(match.matchMode || 'rounds');
  const [targetType, setTargetType] = useState<'FIXED_ROUNDS' | 'RACE_TO_POINTS' | 'SET_101'>(match.targetType || 'FIXED_ROUNDS');
  const [targetValue, setTargetValue] = useState<number | string>(match.targetValue || 10);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(match.pointsConfig || PORDI_DEFAULT_POINTS);

  const [oradoConfig, setOradoConfig] = useState<OradoConfig>(() => ({
    apolloRule: match.rulesConfig?.oradoConfig?.apolloRule ?? true,
    deadBalak0Penalty: match.rulesConfig?.oradoConfig?.deadBalak0Penalty ?? true,
  }));

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

  // Handle Cascading Logic when RulesetMode or MatchCategory changes
  useEffect(() => {
    if (rulesetMode === 'PB_ORADO') {
      setMatchCategory('TEAM_2V2');
      setMatchMode('points');
      setTargetType('SET_101');
      setTargetValue(101);
    } else if (rulesetMode === 'PB_PORDI') {
      if (matchCategory === 'SINGLE_1V1V1V1') {
        setMatchMode('rounds');
        setTargetType('FIXED_ROUNDS');
        setTargetValue(7);
      } else {
        setMatchMode('points');
        setTargetType('RACE_TO_POINTS');
        setTargetValue(7);
      }
      setPointsConfig(PORDI_DEFAULT_POINTS);
    } else {
      // Casual
      if (matchMode === 'rounds') {
        setTargetType('FIXED_ROUNDS');
      } else {
        setTargetType('RACE_TO_POINTS');
      }
    }
  }, [rulesetMode, matchCategory, matchMode]);

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

    let finalTargetVal = Number(targetValue);
    if (rulesetMode === 'PB_ORADO') {
      finalTargetVal = 101;
    } else if (rulesetMode === 'PB_PORDI') {
      finalTargetVal = 7;
    } else {
      finalTargetVal = finalTargetVal || (matchMode === 'rounds' ? 10 : 50);
    }

    const formattedPlayers = players.map((p) => ({
      seatNumber: p.seatNumber,
      name: p.name.trim() || `Pemain ${p.seatNumber}`,
    }));

    await updateMatchSetup(
      formattedPlayers,
      matchMode,
      finalTargetVal,
      pointsConfig,
      rulesetMode,
      matchCategory,
      targetType,
      oradoConfig
    );

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
            Setup Mode Aturan, Kategori Match, Formasi Pemain & Target Nilai ({tenantCode} • MEJA {tableNumber})
          </p>
        </div>
      </div>

      {/* STEP 1: RULESET SELECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Trophy className="w-4 h-4 text-cyan-400" />
          1. Pilih Mode Aturan Permainan (Ruleset Mode)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          {/* CASUAL */}
          <button
            type="button"
            onClick={() => setRulesetMode('CASUAL')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              rulesetMode === 'CASUAL'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-black uppercase text-white mb-1">MODE CASUAL</div>
            <div className="text-[11px] text-slate-400 font-sans">
              Action-Based FSM (Bobot Poin Bebas, 1v1v1v1 atau 2v2). Target Ronde / Poin custom.
            </div>
          </button>

          {/* PB PORDI */}
          <button
            type="button"
            onClick={() => setRulesetMode('PB_PORDI')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              rulesetMode === 'PB_PORDI'
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-black uppercase text-amber-400 mb-1 flex items-center gap-1.5">
              <span>PB PORDI (RESMI)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Standar PORDI (Single: 7 Ronde, Ganda: 7 Poin). Tombol Denda Cepat (+1 / +4).
            </div>
          </button>

          {/* PB ORADO */}
          <button
            type="button"
            onClick={() => setRulesetMode('PB_ORADO')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              rulesetMode === 'PB_ORADO'
                ? 'bg-purple-950/80 border-purple-500 text-purple-300 ring-2 ring-purple-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-black uppercase text-purple-400 mb-1 flex items-center gap-1.5">
              <span>PB ORADO (COUNT)</span>
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Hitung Sisa Titik Batu (Race to 101 Poin per Set, Best of 3 Sets). Dua Ujung x2, Balak Habis +50, Apollo 101 vs 0.
            </div>
          </button>
        </div>
      </div>

      {/* STEP 2: MATCH CATEGORY SELECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Shield className="w-4 h-4 text-emerald-400" />
          2. Pilih Kategori Pertandingan (Match Category)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {/* TUNGGAL 1V1V1V1 */}
          <button
            type="button"
            disabled={rulesetMode === 'PB_ORADO'}
            onClick={() => setMatchCategory('SINGLE_1V1V1V1')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              matchCategory === 'SINGLE_1V1V1V1'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <div className="text-xs font-black uppercase text-white mb-1">TUNGGAL (1v1v1v1)</div>
            <div className="text-[11px] text-slate-400 font-sans">
              4 Pemain Individu berebut poin tertinggi (Kursi 1, 2, 3, 4).
            </div>
          </button>

          {/* TIM / GANDA 2V2 */}
          <button
            type="button"
            onClick={() => setMatchCategory('TEAM_2V2')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              matchCategory === 'TEAM_2V2'
                ? 'bg-blue-950/80 border-blue-500 text-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-white">TIM / GANDA (2v2)</span>
              {rulesetMode === 'PB_ORADO' && (
                <span className="text-[10px] text-purple-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> WAJIB ORADO
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-sans mt-1">
              Tim A (Kursi 1 & 3 - Berhadapan) vs Tim B (Kursi 2 & 4 - Berhadapan).
            </div>
          </button>
        </div>
      </div>

      {/* STEP 3: PLAYER / TEAM PAIRING FORM */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-3 font-mono">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            3. Form Susunan Pemain {matchCategory === 'TEAM_2V2' ? '& Pasangan Tim (2v2)' : '& 4 Kursi Fisik'}
          </span>
          {matchCategory === 'TEAM_2V2' && (
            <span className="text-[11px] text-cyan-400 font-bold bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-full">
              POSISI BERHADAPAN
            </span>
          )}
        </h2>

        {matchCategory === 'TEAM_2V2' ? (
          /* TEAM 2V2 VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
            {/* TIM A BOX */}
            <div className="bg-slate-950 border border-rose-900/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-rose-500" /> TIM A
                </span>
                <span className="text-[10px] text-slate-500 font-bold">KURSI 1 & 3</span>
              </div>

              {SEAT_CONFIG.filter((s) => s.team === 'A').map((seat) => {
                const current = players.find((p) => p.seatNumber === seat.seat);
                return (
                  <div key={seat.seat} className="space-y-1 text-xs">
                    <label className="block text-slate-300 font-bold">{seat.label}</label>
                    <input
                      type="text"
                      value={current?.name || ''}
                      onChange={(e) =>
                        handlePlayerNameChange(seat.seat as 1 | 2 | 3 | 4, e.target.value)
                      }
                      className={`w-full bg-slate-900 border ${seat.border} rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none text-sm`}
                      placeholder={seat.placeholder}
                      required
                    />
                  </div>
                );
              })}
            </div>

            {/* TIM B BOX */}
            <div className="bg-slate-950 border border-blue-900/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-900/40 pb-2">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-500" /> TIM B
                </span>
                <span className="text-[10px] text-slate-500 font-bold">KURSI 2 & 4</span>
              </div>

              {SEAT_CONFIG.filter((s) => s.team === 'B').map((seat) => {
                const current = players.find((p) => p.seatNumber === seat.seat);
                return (
                  <div key={seat.seat} className="space-y-1 text-xs">
                    <label className="block text-slate-300 font-bold">{seat.label}</label>
                    <input
                      type="text"
                      value={current?.name || ''}
                      onChange={(e) =>
                        handlePlayerNameChange(seat.seat as 1 | 2 | 3 | 4, e.target.value)
                      }
                      className={`w-full bg-slate-900 border ${seat.border} rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none text-sm`}
                      placeholder={seat.placeholder}
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SINGLE 1V1V1V1 VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEAT_CONFIG.map((seat) => {
              const current = players.find((p) => p.seatNumber === seat.seat);
              return (
                <div key={seat.seat} className="space-y-1.5 font-mono text-xs">
                  <label className="block text-slate-400 font-bold">{seat.label}</label>
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
        )}
      </div>

      {/* STEP 4: DYNAMIC TARGET & POINT WEIGHTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Target className="w-4 h-4 text-amber-400" />
          4. Target Pertandingan & Konfigurasi Poin
        </h2>

        {/* RULESET SPECIFIC TARGET CONTROLS */}
        {rulesetMode === 'PB_ORADO' ? (
          /* PB ORADO LOCKED TARGET */
          <div className="bg-slate-950 border border-purple-800/80 rounded-2xl p-4 space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider block">
                  TARGET PB ORADO: RACE TO 101 POIN PER SET (BEST OF 3 SETS)
                </span>
                <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
                  Pemenang set adalah Tim pertama yang mencapai total 101 titik. Tim yang memenangkan 2 set pertama menjadi Juara Match.
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 font-black text-xs border border-purple-700">
                101 POIN / SET
              </span>
            </div>

            {/* ORADO TOGGLES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setOradoConfig((prev) => ({ ...prev, apolloRule: !prev.apolloRule }))
                }
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-3 text-left"
              >
                {oradoConfig.apolloRule ? (
                  <CheckSquare className="w-5 h-5 text-purple-400 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-black text-white block">ATURAN APOLLO (101 vs 0)</span>
                  <span className="text-[10px] text-slate-400 font-sans block">Menang langsung jika 101 vs 0 poin lawan</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setOradoConfig((prev) => ({
                    ...prev,
                    deadBalak0Penalty: !prev.deadBalak0Penalty,
                  }))
                }
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-3 text-left"
              >
                {oradoConfig.deadBalak0Penalty ? (
                  <CheckSquare className="w-5 h-5 text-purple-400 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-black text-white block">DENDA BALAK 0 MATI (13 TITIK)</span>
                  <span className="text-[10px] text-slate-400 font-sans block">Balak 0 tidak bisa keluar = 13 titik denda</span>
                </div>
              </button>
            </div>
          </div>
        ) : rulesetMode === 'PB_PORDI' ? (
          /* PB PORDI LOCKED TARGET */
          <div className="bg-slate-950 border border-amber-800/80 rounded-2xl p-4 font-mono space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                  TARGET PB PORDI RESMI: {matchCategory === 'SINGLE_1V1V1V1' ? 'FIXED 7 RONDE (TUNGGAL)' : 'RACE TO 7 POIN (GANDA)'}
                </span>
                <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
                  Sesuai standar PORDI Indonesia. Bobot poin terunci sesuai aturan standar nasional.
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 font-black text-xs border border-amber-700">
                {matchCategory === 'SINGLE_1V1V1V1' ? '7 RONDE' : '7 POIN'}
              </span>
            </div>
          </div>
        ) : (
          /* CASUAL CUSTOM TARGET & WEIGHTS */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 font-mono text-xs">
                <label className="block text-slate-400 font-bold uppercase">TIPE TARGET MATCH</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchMode('rounds');
                      setTargetType('FIXED_ROUNDS');
                      setTargetValue(10);
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs ${
                      matchMode === 'rounds'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    FIXED ROUNDS
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMatchMode('points');
                      setTargetType('RACE_TO_POINTS');
                      setTargetValue(50);
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs ${
                      matchMode === 'points'
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    RACE TO POINTS
                  </button>
                </div>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <label className="block text-slate-400 font-bold uppercase">
                  {matchMode === 'rounds' ? 'TOTAL RONDE MATCH' : 'TARGET BATAS POIN'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
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

            {/* Custom Point Weight Steppers for Casual */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs text-slate-400 font-bold font-mono uppercase">BOBOT POIN AKSI CUSTOM</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                {[
                  { key: 'menang_biasa', label: 'Menang Biasa (👑)', desc: 'Standard Win' },
                  { key: 'kandang', label: 'Kandang (🔥)', desc: 'Close Game' },
                  { key: 'ceki', label: 'Ceki (✅)', desc: 'Domino Check' },
                  { key: 'palang', label: 'Palang (🐐)', desc: 'Palang Action' },
                  { key: 'tangkap', label: 'Tangkap (🚓)', desc: 'Capturer Bonus' },
                  { key: 'ditangkap', label: 'Ditangkap (💀)', desc: 'Victim Penalty' },
                ].map((item) => {
                  const k = item.key as keyof PointsConfig;
                  const val = pointsConfig[k];

                  return (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
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
          </div>
        )}
      </div>

      {/* Bottom Submit Action Bar */}
      <div className="pt-2">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all active:scale-98 cursor-pointer"
        >
          SIMPAN & MULAI SESI WASIT <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
