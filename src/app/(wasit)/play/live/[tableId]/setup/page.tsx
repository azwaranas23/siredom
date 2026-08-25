'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { setupMatchSessionAction } from '@/features/scorer/actions';
import { Users, Target, Sliders, ArrowRight, Shield, Trophy, CheckSquare, Square, Sparkles } from 'lucide-react';
import { PointsConfig, RulesetMode, MatchCategory, OradoConfig } from '@/types/domino';

const SEAT_CONFIG = [
  { seat: 1, team: 'A', label: 'Kursi 1 (Merah - Tim A)', border: 'border-rose-500/40 focus:border-rose-500' },
  { seat: 2, team: 'B', label: 'Kursi 2 (Biru - Tim B)', border: 'border-blue-500/40 focus:border-blue-500' },
  { seat: 3, team: 'A', label: 'Kursi 3 (Hijau - Tim A)', border: 'border-emerald-500/40 focus:border-emerald-500' },
  { seat: 4, team: 'B', label: 'Kursi 4 (Kuning - Tim B)', border: 'border-amber-500/40 focus:border-amber-500' },
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

interface PageProps {
  params: Promise<{
    tableId: string;
  }>;
}

export default function TableSetupPage({ params }: PageProps) {
  const { tableId } = use(params);
  const router = useRouter();
  const { match, setMatchFromDb, tenantCode, tableNumber } = useScorerStore();

  // Display label: prefer numeric table number; fallback to raw ID only when non-numeric
  const displayTableId = /^\d+$/.test(tableId) ? tableId : (tableNumber ? `Meja #${tableNumber}` : 'Meja Wasit');
  const tableLabel = displayTableId ? `Meja #${displayTableId}` : 'Meja Wasit';

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
    setPlayers((prev) => prev.map((p) => (p.seatNumber === seatNumber ? { ...p, name } : p)));
  };

  const handleConfigChange = (key: keyof PointsConfig, delta: number) => {
    setPointsConfig((prev) => ({
      ...prev,
      [key]: prev[key] + delta,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Reset error handling if any
    setSubmitError('');
    
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

    try {
      if (!tenantCode || !tenantCode.trim()) {
        setSubmitError('Sesi kedaluwarsa. Silakan login ulang melalui portal /play.');
        setIsSubmitting(false);
        return;
      }

      const result = await setupMatchSessionAction({
        tableId,
        matchId: match.id === 'empty' ? undefined : match.id,
        tenantCode,
        rulesetMode,
        matchCategory,
        matchMode,
        targetType,
        targetValue: finalTargetVal,
        pointsConfig,
        rulesConfig: { pointsConfig, oradoConfig },
        oradoConfig,
        players: formattedPlayers,
      });

      setIsSubmitting(false);

      if (result.success && result.data) {
        setMatchFromDb(result.data);
        router.push(`/play/live/${tableId}`);
      } else {
        setSubmitError(result.message || 'Gagal melakukan setup. Silakan coba lagi.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError('Terjadi kesalahan sistem: ' + (err.message || 'Unknown'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 p-4 md:p-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <Users className="w-6 h-6 text-cyan-400" />
            Konfigurasi Pertandingan {tableLabel}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Setup Mode Aturan, Kategori Match, Formasi Pemain & Target Nilai
          </p>
        </div>
      </div>

      {submitError && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-shake">
          <Shield className="w-5 h-5 text-rose-500 shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      {/* STEP 1: RULESET SELECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
          <Trophy className="w-4 h-4 text-cyan-400" />
          1. Pilih Mode Aturan Permainan (Ruleset Mode)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          {/* CASUAL */}
          <button
            type="button"
            onClick={() => setRulesetMode('CASUAL')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              rulesetMode === 'CASUAL'
                ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-400 ring-2 ring-cyan-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white text-sm">CASUAL MODE</span>
              {rulesetMode === 'CASUAL' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Bebas tentukan batas poin/ronde dan bobot nilai custom untuk warkop.
            </p>
          </button>

          {/* PB PORDI */}
          <button
            type="button"
            onClick={() => setRulesetMode('PB_PORDI')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              rulesetMode === 'PB_PORDI'
                ? 'bg-gradient-to-br from-amber-950 to-slate-900 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 text-sm">PB PORDI STANDAR</span>
              {rulesetMode === 'PB_PORDI' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Resmi PORDI: Fixed 7 Ronde (Tunggal) atau Race to 7 Poin (Ganda).
            </p>
          </button>

          {/* PB ORADO */}
          <button
            type="button"
            onClick={() => setRulesetMode('PB_ORADO')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              rulesetMode === 'PB_ORADO'
                ? 'bg-gradient-to-br from-purple-950 to-slate-900 border-purple-400 ring-2 ring-purple-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-300 text-sm">PB ORADO (COUNTING)</span>
              {rulesetMode === 'PB_ORADO' && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Counting Titik Batu (Khusus Tim 2v2). Target Set 101 Poin & Apollo 101-0.
            </p>
          </button>
        </div>
      </div>

      {/* STEP 2: MATCH CATEGORY (TUNGGAL VS TIM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Users className="w-4 h-4 text-cyan-400" />
          2. Pilih Kategori Pertandingan (Tunggal vs Tim)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={rulesetMode === 'PB_ORADO'}
            onClick={() => setMatchCategory('SINGLE_1V1V1V1')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              rulesetMode === 'PB_ORADO'
                ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-900'
                : matchCategory === 'SINGLE_1V1V1V1'
                ? 'bg-gradient-to-br from-cyan-950 to-slate-900 border-cyan-400 ring-2 ring-cyan-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-extrabold text-white text-sm">TUNGGAL / PERORANGAN (1V1V1V1)</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              4 Pemain bertanding secara individu (Setiap orang mencari poin sendiri).
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMatchCategory('TEAM_2V2')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              matchCategory === 'TEAM_2V2'
                ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-400 ring-2 ring-emerald-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-extrabold text-white text-sm flex items-center justify-between">
              <span>GANDA / TIM (2V2)</span>
              {rulesetMode === 'PB_ORADO' && (
                <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-700">Wajib ORADO</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Tim A (Kursi 1 & 3) vs Tim B (Kursi 2 & 4). Poin diakumulasi per Tim.
            </p>
          </button>
        </div>
      </div>

      {/* STEP 3: PLAYER NAMES SETUP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Users className="w-4 h-4 text-cyan-400" />
          3. Nama Pemain Per Kursi
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEAT_CONFIG.map((seat) => {
            const currentVal = players.find((p) => p.seatNumber === seat.seat)?.name || '';

            return (
              <div key={seat.seat} className="space-y-1.5 font-mono">
                <label className="block text-xs font-bold text-slate-400">
                  {matchCategory === 'TEAM_2V2'
                    ? `Kursi ${seat.seat} (${seat.team === 'A' ? 'Tim A' : 'Tim B'})`
                    : `Kursi ${seat.seat} (Individu)`}
                </label>
                <input
                  type="text"
                  value={currentVal}
                  onChange={(e) => handlePlayerNameChange(seat.seat as any, e.target.value)}
                  placeholder={`Nama Pemain ${seat.seat}...`}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-white text-sm font-bold focus:outline-none transition-colors ${seat.border}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 4: RULESET SPECIFIC CONFIGURATION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-cyan-400" />
          4. Konfigurasi Target & Poin Rules Match
        </h2>

        {rulesetMode === 'PB_ORADO' ? (
          /* PB ORADO SPECIFIC CONFIGS */
          <div className="bg-slate-950 border border-purple-800/80 rounded-2xl p-5 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider block">
                  KONFIGURASI ORADO ATURAN KHUSUS
                </span>
                <span className="text-[11px] text-slate-400 font-sans mt-0.5 block">
                  Target Poin per Set: <strong>101 POIN</strong> (Best of 3 Sets)
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl bg-purple-950 text-purple-300 font-black text-xs border border-purple-700">
                SET 101
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setOradoConfig((prev) => ({
                    ...prev,
                    apolloRule: !prev.apolloRule,
                  }))
                }
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-3 text-left"
              >
                {oradoConfig.apolloRule ? (
                  <CheckSquare className="w-5 h-5 text-purple-400 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-black text-white block">ATURAN KONDISI APOLLO (101 VS 0)</span>
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
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center gap-3 text-left"
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
          <div className="space-y-4 font-mono">
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

      {/* SUBMIT BUTTON */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'MENYIMPAN & MEMULAI...' : 'SIMPAN & MULAI SESI WASIT'} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
