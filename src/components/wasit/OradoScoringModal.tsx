'use client';

import React, { useState } from 'react';
import { Player, TeamIdentifier } from '@/types/domino';
import { Numpad } from '@/components/Numpad';
import { Trophy, Flame, CheckSquare, Square, Award, Sparkles } from 'lucide-react';

interface OradoScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  defaultSelectedTeam?: TeamIdentifier;
  onCommitOrado: (
    winnerTeam: TeamIdentifier,
    winnerPlayerId: string,
    rawRemainingPoints: number,
    multipliers: { duaUjung: boolean; balakHabis: boolean; macetBeradu: boolean }
  ) => void;
}

export const OradoScoringModal: React.FC<OradoScoringModalProps> = ({
  isOpen,
  onClose,
  players,
  defaultSelectedTeam,
  onCommitOrado,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'TEAM_A' | 'TEAM_B'>('TEAM_A');
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [rawInputStr, setRawInputStr] = useState<string>('');
  const [duaUjung, setDuaUjung] = useState<boolean>(false);
  const [balakHabis, setBalakHabis] = useState<boolean>(false);
  const [macetBeradu, setMacetBeradu] = useState<boolean>(false);

  const teamAPlayers = players.filter((p) => p.seatNumber === 1 || p.seatNumber === 3);
  const teamBPlayers = players.filter((p) => p.seatNumber === 2 || p.seatNumber === 4);

  React.useEffect(() => {
    if (isOpen && defaultSelectedTeam) {
      const targetTeam = defaultSelectedTeam === 'TEAM_B' ? 'TEAM_B' : 'TEAM_A';
      setSelectedTeam(targetTeam);
      const targetPlayers = targetTeam === 'TEAM_A' ? teamAPlayers : teamBPlayers;
      setSelectedWinnerId(targetPlayers[0]?.id || '');
    }
  }, [isOpen, defaultSelectedTeam]);

  if (!isOpen) return null;

  const activePlayers = selectedTeam === 'TEAM_A' ? teamAPlayers : teamBPlayers;
  const currentWinnerId = selectedWinnerId || activePlayers[0]?.id || '';

  const rawVal = Number(rawInputStr) || 0;
  let computedPoints = rawVal;
  if (duaUjung || macetBeradu) computedPoints *= 2;
  if (balakHabis) computedPoints += 50;

  const handleSubmit = () => {
    if (!currentWinnerId) return;
    onCommitOrado(selectedTeam, currentWinnerId, rawVal, {
      duaUjung,
      balakHabis,
      macetBeradu,
    });
    // Reset state & close modal
    setRawInputStr('');
    setDuaUjung(false);
    setBalakHabis(false);
    setMacetBeradu(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 font-mono my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Trophy className="w-5 h-5" />
            <h3 className="text-base font-black uppercase text-white font-display tracking-tight">
              INPUT SKOR HITUNGAN TITIK ORADO
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Select Winner Team & Player */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-400 font-bold uppercase">1. PILIH KUBUMENANG (TIM & PEMAIN)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedTeam('TEAM_A');
                setSelectedWinnerId(teamAPlayers[0]?.id || '');
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedTeam === 'TEAM_A'
                  ? 'bg-rose-950 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-xs font-black uppercase">TIM A (MERAH & HIJAU)</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                {teamAPlayers.map((p) => p.name).join(' & ')}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedTeam('TEAM_B');
                setSelectedWinnerId(teamBPlayers[0]?.id || '');
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                selectedTeam === 'TEAM_B'
                  ? 'bg-blue-950 border-blue-500 text-blue-300 ring-2 ring-blue-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-xs font-black uppercase">TIM B (BIRU & KUNING)</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                {teamBPlayers.map((p) => p.name).join(' & ')}
              </div>
            </button>
          </div>

          {/* Sub-selection: Player who completed/domi */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">PEMAIN PENENTU:</span>
            {activePlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedWinnerId(p.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  currentWinnerId === p.id
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                {p.name} (K#{p.seatNumber})
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Numpad Input for Remaining Points */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-400 font-bold uppercase">
            2. TOTAL SISA TITIK KARTU TIM LAWAN
          </label>
          <Numpad
            value={rawInputStr}
            onChange={(val) => setRawInputStr(val)}
            displayMode="number"
            showSubmitButton={false}
            maxLength={3}
          />
        </div>

        {/* Step 3: Multipliers & Special Modifiers */}
        <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-800 rounded-2xl">
          <label className="block text-xs text-slate-400 font-bold uppercase mb-2">
            3. PENGALI & ATURAN KHUSUS ORADO
          </label>

          <div className="space-y-2 text-xs">
            {/* Dua Ujung */}
            <button
              type="button"
              onClick={() => setDuaUjung(!duaUjung)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left font-bold"
            >
              <div className="flex items-center gap-2">
                {duaUjung ? (
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
                <span>DUA UJUNG COCOK (POIN ×2)</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">×2 POIN</span>
            </button>

            {/* Balak Habis */}
            <button
              type="button"
              onClick={() => setBalakHabis(!balakHabis)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left font-bold"
            >
              <div className="flex items-center gap-2">
                {balakHabis ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
                <span>BALAK TERAKHIR HABIS UJUNG (+50 POIN)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">+50 POIN</span>
            </button>

            {/* Batu Macet / Beradu */}
            <button
              type="button"
              onClick={() => setMacetBeradu(!macetBeradu)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left font-bold"
            >
              <div className="flex items-center gap-2">
                {macetBeradu ? (
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
                <span>BATU MACET / BERADU (AKHIR GAMPANG)</span>
              </div>
              <span className="text-[10px] text-purple-400 font-mono">BERADU ×2</span>
            </button>
          </div>
        </div>

        {/* Calculation Summary Bar */}
        <div className="p-3 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-700/60 rounded-2xl flex items-center justify-between">
          <span className="text-xs text-slate-300 font-bold uppercase flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" /> TOTAL SKOR DITAMBAHKAN:
          </span>
          <span className="text-2xl font-black text-cyan-300 font-mono">
            +{computedPoints} <span className="text-xs text-slate-400 uppercase">POIN</span>
          </span>
        </div>

        {/* Actions */}
        <div className="pt-1 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
          >
            BATAL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rawVal === 0 && !balakHabis}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            SIMPAN & TAMBAH POIN ➔
          </button>
        </div>
      </div>
    </div>
  );
};
