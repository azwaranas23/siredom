'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { setupMatchSessionAction } from '@/features/scorer/actions';
import { Users, Target, Sliders, ArrowRight, Shield, Trophy, BookOpen } from 'lucide-react';
import { PointsConfig, RulesetMode, MatchCategory, OradoConfig, EnabledActionsConfig } from '@/types/domino';
import { Switch } from '@/components/ui/switch';

const SEAT_CONFIG = [
  { seat: 1, team: 'A', label: 'Kursi 1 (Merah - Tim A)', border: 'border-[#FB7185]/40 focus:border-[#FB7185]' },
  { seat: 2, team: 'B', label: 'Kursi 2 (Biru - Tim B)', border: 'border-[#6366F1]/40 focus:border-[#6366F1]' },
  { seat: 3, team: 'A', label: 'Kursi 3 (Hijau - Tim A)', border: 'border-[#34D399]/40 focus:border-[#34D399]' },
  { seat: 4, team: 'B', label: 'Kursi 4 (Kuning - Tim B)', border: 'border-[#FBBF24]/40 focus:border-[#FBBF24]' },
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

const DEFAULT_ENABLED_ACTIONS: EnabledActionsConfig = {
  menang_biasa: true,
  kandang: true,
  ceki: true,
  palang: true,
  tangkap: true,
  ditangkap: true,
  berdiri: true,
  duduk: true,
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

  const displayTableId = /^\d+$/.test(tableId) ? tableId : (tableNumber ? `Meja #${tableNumber}` : 'Meja Wasit');
  const tableLabel = displayTableId ? `Meja #${displayTableId}` : 'Meja Wasit';

  const [rulesetMode, setRulesetMode] = useState<RulesetMode>(match.rulesetMode || 'CASUAL');
  const [matchCategory, setMatchCategory] = useState<MatchCategory>(match.matchCategory || 'SINGLE_1V1V1V1');
  const [matchMode, setMatchMode] = useState<'rounds' | 'points'>(match.matchMode || 'rounds');
  const [targetType, setTargetType] = useState<'FIXED_ROUNDS' | 'RACE_TO_POINTS' | 'SET_101'>(match.targetType || 'FIXED_ROUNDS');
  const [targetValue, setTargetValue] = useState<number | string>(match.targetValue || 10);
  const [pointsConfig, setPointsConfig] = useState<PointsConfig>(match.pointsConfig || PORDI_DEFAULT_POINTS);
  const [enabledActions, setEnabledActions] = useState<EnabledActionsConfig>(
    match.rulesConfig?.enabledActions || DEFAULT_ENABLED_ACTIONS
  );

  const [oradoConfig] = useState<OradoConfig>(() => ({
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

  const handleToggleAction = (key: keyof EnabledActionsConfig) => {
    setEnabledActions((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
        rulesConfig: { pointsConfig, enabledActions, oradoConfig },
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

  const renderSeatInput = (seat: (typeof SEAT_CONFIG)[number]) => {
    const currentVal = players.find((p) => p.seatNumber === seat.seat)?.name || '';
    return (
      <div key={seat.seat} className="space-y-1 font-mono">
        <label className="block text-[11px] font-bold text-content-muted">
          {matchCategory === 'TEAM_2V2'
            ? `Kursi ${seat.seat} (${seat.team === 'A' ? 'Tim A' : 'Tim B'})`
            : `Kursi ${seat.seat}`}
        </label>
        <input
          type="text"
          value={currentVal}
          onChange={(e) => handlePlayerNameChange(seat.seat as any, e.target.value)}
          placeholder={`Pemain ${seat.seat}...`}
          className={`w-full px-3 py-2 rounded-lg bg-surface-elevated border text-white text-xs font-bold focus:outline-none transition-colors ${seat.border}`}
        />
      </div>
    );
  };

  const CASUAL_ACTION_ROWS: { key: keyof PointsConfig; label: string; desc: string; icon: string }[] = [
    { key: 'menang_biasa', label: 'Menang Biasa', desc: 'Standard victory round', icon: '👑' },
    { key: 'kandang', label: 'Kandang', desc: 'Closed game victory', icon: '🔥' },
    { key: 'ceki', label: 'Ceki', desc: 'Domino check win', icon: '✅' },
    { key: 'palang', label: 'Palang', desc: 'Palang special win', icon: '🐐' },
    { key: 'tangkap', label: 'Tangkap', desc: 'Capturer bonus pts', icon: '🚓' },
    { key: 'ditangkap', label: 'Ditangkap (Penalti Korban)', desc: 'Captured victim penalty', icon: '💀' },
    { key: 'berdiri', label: 'Status Berdiri', desc: 'Loser post-round status', icon: '😭' },
    { key: 'duduk', label: 'Status Duduk', desc: 'Safe post-round status', icon: '🪑' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-3.5 md:p-5 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-3.5">
        {/* Header Bar */}
        <div className="bg-surface border border-border rounded-xl p-3.5 md:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-black text-white flex items-center gap-2 font-display">
              <Users className="w-5 h-5 text-brand-cyan" />
              Setup Meja & Matriks Ruleset {tableLabel}
            </h1>
            <p className="text-[11px] text-content-muted font-mono mt-0.5">
              Konfigurasi Mode Regulasi, Formasi Pemain, Target Match & Matriks Bobot Poin Wasit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin mereset skor dan status meja ini ke kondisi awal?')) {
                  useScorerStore.getState().resetFSM();
                  alert('Skor meja berhasil di-reset.');
                }
              }}
              className="px-3 py-2 rounded-lg bg-surface-elevated hover:bg-danger/20 border border-border hover:border-danger text-danger text-xs font-mono font-bold transition-all"
            >
              Reset Skor Meja
            </button>
          </div>
        </div>

        {submitError && (
          <div className="bg-danger/10 border border-danger text-danger p-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Split 2-Panel Layout (Approach B) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* PANEL KIRI (Col-span 7): Global Setup & Roster */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* STEP 1: Ruleset Mode Switcher */}
              <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xl space-y-3 font-mono">
                <h2 className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Trophy className="w-4 h-4 text-brand-cyan" />
                  1. Mode Ruleset Permainan
                </h2>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRulesetMode('CASUAL')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rulesetMode === 'CASUAL'
                        ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan ring-1 ring-brand-cyan'
                        : 'bg-surface-elevated border-border text-content-muted hover:border-content-muted'
                    }`}
                  >
                    <div className="font-black text-white text-xs">CASUAL</div>
                    <p className="text-[10px] text-content-muted font-sans mt-0.5">
                      Mode Bebas Warkop
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRulesetMode('PB_PORDI')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rulesetMode === 'PB_PORDI'
                        ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-surface-elevated border-border text-content-muted hover:border-content-muted'
                    }`}
                  >
                    <div className="font-black text-amber-300 text-xs">PB PORDI</div>
                    <p className="text-[10px] text-content-muted font-sans mt-0.5">
                      Standar Resmi PORDI
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRulesetMode('PB_ORADO')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rulesetMode === 'PB_ORADO'
                        ? 'bg-purple-500/10 border-purple-400 text-purple-300 ring-1 ring-purple-400'
                        : 'bg-surface-elevated border-border text-content-muted hover:border-content-muted'
                    }`}
                  >
                    <div className="font-black text-purple-300 text-xs">PB ORADO</div>
                    <p className="text-[10px] text-content-muted font-sans mt-0.5">
                      Counting Titik Set 101
                    </p>
                  </button>
                </div>
              </div>

              {/* STEP 2: Match Category Switcher (1v1 vs 2v2) */}
              <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xl space-y-3 font-mono">
                <h2 className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Users className="w-4 h-4 text-brand-cyan" />
                  2. Kategori Pertandingan
                </h2>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={rulesetMode === 'PB_ORADO'}
                    onClick={() => setMatchCategory('SINGLE_1V1V1V1')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rulesetMode === 'PB_ORADO'
                        ? 'opacity-40 cursor-not-allowed bg-surface-sunken border-border'
                        : matchCategory === 'SINGLE_1V1V1V1'
                        ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan ring-1 ring-brand-cyan'
                        : 'bg-surface-elevated border-border text-content-muted hover:border-content-muted'
                    }`}
                  >
                    <div className="font-black text-white text-xs">TUNGGAL (1V1V1V1)</div>
                    <p className="text-[10px] text-content-muted font-sans mt-0.5">
                      4 Pemain Individu
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchCategory('TEAM_2V2')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      matchCategory === 'TEAM_2V2'
                        ? 'bg-brand-lime/10 border-brand-lime text-brand-lime ring-1 ring-brand-lime'
                        : 'bg-surface-elevated border-border text-content-muted hover:border-content-muted'
                    }`}
                  >
                    <div className="font-black text-white text-xs">GANDA / TIM (2V2)</div>
                    <p className="text-[10px] text-content-muted font-sans mt-0.5">
                      Tim A vs Tim B Berhadapan
                    </p>
                  </button>
                </div>
              </div>

              {/* STEP 3: Formasi & Nama Pemain (4-Kolom Horizontal Grid jika 1v1v1v1) */}
              <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xl space-y-3 font-mono">
                <h2 className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Users className="w-4 h-4 text-brand-cyan" />
                  3. Formasi & Nama Pemain
                </h2>

                {matchCategory === 'TEAM_2V2' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['A', 'B'] as const).map((team) => (
                      <div
                        key={team}
                        className={`rounded-lg border p-3 space-y-2 ${
                          team === 'A' ? 'border-[#34D399]/40 bg-[#34D399]/5' : 'border-[#6366F1]/40 bg-[#6366F1]/5'
                        }`}
                      >
                        <div className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${team === 'A' ? 'text-[#34D399]' : 'text-[#6366F1]'}`}>
                          {team === 'A' ? '🟢 TIM A' : '🔵 TIM B'}
                          <span className="text-[10px] font-bold text-content-muted normal-case">
                            (Kursi {team === 'A' ? '1 & 3' : '2 & 4'})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {SEAT_CONFIG.filter((s) => s.team === team).map((seat) => renderSeatInput(seat))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Layout Grid 4-Kolom Berjejer Horizontal untuk mode Tunggal 1v1v1v1 */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {SEAT_CONFIG.map((seat) => renderSeatInput(seat))}
                  </div>
                )}
              </div>

              {/* STEP 4: Stepper Target Match */}
              <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xl space-y-3 font-mono">
                <h2 className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Target className="w-4 h-4 text-brand-cyan" />
                  4. Stepper Target Match
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 text-xs">
                    <label className="block text-content-muted font-bold uppercase text-[10px]">MODE TARGET</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={rulesetMode !== 'CASUAL'}
                        onClick={() => {
                          setMatchMode('rounds');
                          setTargetType('FIXED_ROUNDS');
                          setTargetValue(10);
                        }}
                        className={`p-2.5 rounded-lg border font-bold text-xs ${
                          matchMode === 'rounds'
                            ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan'
                            : 'bg-surface-elevated border-border text-content-muted'
                        }`}
                      >
                        FIXED ROUNDS
                      </button>

                      <button
                        type="button"
                        disabled={rulesetMode !== 'CASUAL'}
                        onClick={() => {
                          setMatchMode('points');
                          setTargetType('RACE_TO_POINTS');
                          setTargetValue(50);
                        }}
                        className={`p-2.5 rounded-lg border font-bold text-xs ${
                          matchMode === 'points'
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                            : 'bg-surface-elevated border-border text-content-muted'
                        }`}
                      >
                        RACE TO POINTS
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="block text-content-muted font-bold uppercase text-[10px]">TARGET BATAS</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={rulesetMode !== 'CASUAL'}
                        onClick={() => setTargetValue((prev) => Math.max(1, Number(prev) - 1))}
                        className="w-9 h-9 rounded-lg bg-surface-elevated border border-border font-black text-base text-white hover:bg-surface-subtle disabled:opacity-40"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        disabled={rulesetMode !== 'CASUAL'}
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-full bg-surface-sunken border border-border rounded-lg px-2 py-1.5 text-center text-white font-mono font-extrabold text-sm focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={rulesetMode !== 'CASUAL'}
                        onClick={() => setTargetValue((prev) => Number(prev) + 1)}
                        className="w-9 h-9 rounded-lg bg-surface-elevated border border-border font-black text-base text-white hover:bg-surface-subtle disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL KANAN (Col-span 5): Matriks Bobot Poin Adaptif & Edukasi Regulasi */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="bg-surface border border-border rounded-xl p-3.5 shadow-xl space-y-3 font-mono sticky top-4">
                <h2 className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Sliders className="w-4 h-4 text-brand-lime" />
                  Matriks Bobot Poin Adaptif
                </h2>

                {rulesetMode === 'CASUAL' ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-content-muted font-sans">
                      Atur status [ON/OFF] dan bobot poin per aksi kemenangan/kekalahan meja:
                    </p>

                    {CASUAL_ACTION_ROWS.map((item) => {
                      const k = item.key;
                      const val = pointsConfig[k];
                      const isEnabled = enabledActions[k] ?? true;

                      return (
                        <div
                          key={item.key}
                          className={`p-2 rounded-lg border flex items-center justify-between transition-opacity ${
                            isEnabled
                              ? 'bg-surface-elevated border-border'
                              : 'bg-surface-sunken/60 border-border/40 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => handleToggleAction(k)}
                              className="scale-90 shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                                <span>{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </span>
                              <span className="text-[10px] text-content-muted block truncate">{item.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={!isEnabled}
                              onClick={() => handleConfigChange(k, -1)}
                              className="w-6 h-6 rounded-md bg-surface-subtle hover:bg-surface border border-border text-white font-black text-xs disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="w-9 text-center font-mono font-black text-base text-brand-lime">
                              {val > 0 ? `+${val}` : val}
                            </span>
                            <button
                              type="button"
                              disabled={!isEnabled}
                              onClick={() => handleConfigChange(k, 1)}
                              className="w-6 h-6 rounded-md bg-surface-subtle hover:bg-surface border border-border text-white font-black text-xs disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Edukasi Regulasi Resmi PB PORDI & PB ORADO */
                  <div className="space-y-3 font-sans">
                    <div className="p-3.5 rounded-lg bg-surface-sunken border border-border space-y-2.5">
                      <div className="flex items-center justify-between border-b border-border pb-2 font-mono">
                        <span className="text-xs font-black text-brand-lime uppercase flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-amber-400" /> PRESET LOCKED
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          RESMI {rulesetMode}
                        </span>
                      </div>

                      {rulesetMode === 'PB_PORDI' ? (
                        <div className="space-y-2 text-xs text-content-secondary leading-relaxed">
                          <p className="font-semibold text-amber-200">
                            🏆 Mekanisme Resmi Pengurus Besar PORDI:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-[11px] font-mono text-content-muted">
                            <li><strong className="text-white">Format Target:</strong> 7 Ronde (Tunggal) / Race to 7 Pts (Ganda).</li>
                            <li><strong className="text-white">Pembuka Ronde:</strong> Dimulai oleh pemegang kartu Balak 6.</li>
                            <li><strong className="text-white">Matriks Poin Kemenangan:</strong> Biasa (+1), Kandang (+2), Ceki (+2), Palang (+4), Tangkap (+3 / -3 denda).</li>
                            <li><strong className="text-white">Denda Passed Palsu:</strong> Denda +1 / +3 poin untuk lawan jika wasit menemukan kecurangan lewat balak.</li>
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs text-content-secondary leading-relaxed">
                          <p className="font-semibold text-purple-200">
                            ⚡ Mekanisme Resmi Pengurus Besar ORADO:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-[11px] font-mono text-content-muted">
                            <li><strong className="text-white">Format Target:</strong> Set 101 Poin Kumulatif (Tim 2v2 Best of 3).</li>
                            <li><strong className="text-white">Pembuka Ronde:</strong> Dimulai oleh pemegang kartu Balak 0.</li>
                            <li><strong className="text-white">Counting Titik:</strong> Menghitung total sisa titik kartu tangan lawan saat ronde usai.</li>
                            <li><strong className="text-white">Multiplier Aksi:</strong> Dua Ujung (x2), Balak Habis (x2), Macet Beradu, Denda Balak 0 Mati = 13 titik.</li>
                            <li><strong className="text-white">Kondisi Apollo:</strong> Kemenangan mutlak 101 vs 0 instan menyapu set.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-brand-cyan to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-background font-black text-xs uppercase tracking-wider shadow-xl shadow-brand-cyan/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? 'MENYIMPAN & MEMULAI...' : 'SIMPAN & MULAI PERTANDINGAN'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
