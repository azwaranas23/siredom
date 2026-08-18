'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { SlidersHorizontal, Check, Save, RotateCcw } from 'lucide-react';

export default function AdminRulesPage() {
  const { match, updateMatchSetup, tenantCode } = useScorerStore();
  const [activePreset, setActivePreset] = useState<'individual' | 'team'>('individual');
  const [config, setConfig] = useState(match.pointsConfig);
  const [isSaved, setIsSaved] = useState(false);

  const handleApplyPreset = (type: 'individual' | 'team') => {
    setActivePreset(type);
    if (type === 'individual') {
      setConfig({
        menang_biasa: 1,
        kandang: 2,
        ceki: 3,
        palang: 4,
        tangkap: 3,
        ditangkap: -3,
        berdiri: 0,
        duduk: 0,
      });
    } else {
      // 2v2 Teams Mode Preset
      setConfig({
        menang_biasa: 2,
        kandang: 4,
        ceki: 6,
        palang: 8,
        tangkap: 4,
        ditangkap: -4,
        berdiri: 0,
        duduk: 0,
      });
    }
  };

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPlayers = match.players.map((p) => ({ seatNumber: p.seatNumber, name: p.name }));
    updateMatchSetup(currentPlayers, match.matchMode, match.targetValue, config);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2 font-display">
            <SlidersHorizontal className="w-6 h-6 text-blue-400" />
            Konfigurasi Aturan Bobot Poin Turnamen
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Preset Bobot Poin 1v1v1v1 (Individu) vs 2v2 (Tim) untuk Tenant {tenantCode}
          </p>
        </div>
      </div>

      {/* Preset Selection Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleApplyPreset('individual')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activePreset === 'individual'
              ? 'bg-cyan-950/80 border-cyan-500 ring-2 ring-cyan-500/20 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-xs font-mono font-bold uppercase text-cyan-400">
            PRESET A: 1V1V1V1 INDIVIDU
          </div>
          <div className="text-lg font-extrabold mt-1">Aturan Standar Warkop</div>
          <p className="text-xs text-slate-400 mt-1">
            Menang Biasa +1, Kandang +2, Ceki +3, Palang +4, Tangkap +3/-3
          </p>
        </button>

        <button
          onClick={() => handleApplyPreset('team')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            activePreset === 'team'
              ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/20 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-xs font-mono font-bold uppercase text-purple-400">
            PRESET B: 2V2 TIM (GANDA)
          </div>
          <div className="text-lg font-extrabold mt-1">Aturan Turnamen Tim</div>
          <p className="text-xs text-slate-400 mt-1">
            Menang Biasa +2, Kandang +4, Ceki +6, Palang +8, Tangkap +4/-4
          </p>
        </button>
      </div>

      {/* Form Details */}
      <form onSubmit={handleSaveRules} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3">
          Rincian Nilai Bobot Poin Custom
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">MENANG BIASA (👑)</label>
            <input
              type="number"
              value={config.menang_biasa}
              onChange={(e) => setConfig({ ...config, menang_biasa: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">KANDANG / CHECK (🔥)</label>
            <input
              type="number"
              value={config.kandang}
              onChange={(e) => setConfig({ ...config, kandang: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">CEKI (✅)</label>
            <input
              type="number"
              value={config.ceki}
              onChange={(e) => setConfig({ ...config, ceki: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">PALANG (🐐)</label>
            <input
              type="number"
              value={config.palang}
              onChange={(e) => setConfig({ ...config, palang: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">BONUS TANGKAP (🚓)</label>
            <input
              type="number"
              value={config.tangkap}
              onChange={(e) => setConfig({ ...config, tangkap: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">PENALTI DITANGKAP (💀)</label>
            <input
              type="number"
              value={config.ditangkap}
              onChange={(e) => setConfig({ ...config, ditangkap: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {isSaved && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Aturan bobot poin berhasil disimpan ke seluruh meja!
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Save className="w-4 h-4" /> SIMPAN ATURAN POIN
          </button>
        </div>
      </form>
    </div>
  );
}
