'use client';

import React, { useState } from 'react';
import { Player, MatchCategory } from '@/types/domino';
import { AlertOctagon, ShieldAlert, Award } from 'lucide-react';

interface PenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  matchCategory: MatchCategory;
  onApplyPenalty: (offenderPlayerId: string, amount: 1 | 3 | 4) => void;
}

export const PenaltyModal: React.FC<PenaltyModalProps> = ({
  isOpen,
  onClose,
  players,
  matchCategory,
  onApplyPenalty,
}) => {
  const [selectedOffenderId, setSelectedOffenderId] = useState<string | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState<1 | 3 | 4>(1);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedOffenderId) return;
    onApplyPenalty(selectedOffenderId, penaltyAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-rose-600/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 font-mono animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertOctagon className="w-5 h-5 animate-pulse" />
            <h3 className="text-base font-black uppercase text-white font-display">
              PANEL DENDA WASIT INSTAN
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Penalty Type Selector */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-400 font-bold uppercase">1. PILIH JENIS PELANGGARAN DENDA (PASAL 14)</label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPenaltyAmount(1)}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                penaltyAmount === 1
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg font-black mb-1">+1</span>
              <span className="text-[9px] uppercase font-bold text-slate-300 leading-tight">Ringan / Tanya di Luar Giliran</span>
            </button>

            <button
              type="button"
              onClick={() => setPenaltyAmount(3)}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                penaltyAmount === 3
                  ? 'bg-orange-950/90 border-orange-500 text-orange-300 ring-2 ring-orange-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg font-black mb-1">+3</span>
              <span className="text-[9px] uppercase font-bold text-slate-300 leading-tight">Kartu Turun Dua Sekaligus</span>
            </button>

            <button
              type="button"
              onClick={() => setPenaltyAmount(4)}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                penaltyAmount === 4
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 ring-2 ring-rose-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-lg font-black mb-1">+4</span>
              <span className="text-[9px] uppercase font-bold text-slate-300 leading-tight">Passed Palsu</span>
            </button>
          </div>
        </div>

        {/* Select Offender Player */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-400 font-bold uppercase">2. PILIH PEMAIN PELANGGAR (KORBAN DENDA)</label>
          <div className="grid grid-cols-2 gap-2.5">
            {players.map((p) => {
              const isSelected = selectedOffenderId === p.id;
              const teamLabel = matchCategory === 'TEAM_2V2' ? (p.seatNumber % 2 === 1 ? 'TIM A' : 'TIM B') : `KURSI ${p.seatNumber}`;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedOffenderId(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-rose-950 border-rose-500 text-rose-200 ring-2 ring-rose-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                      {teamLabel}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">K#{p.seatNumber}</span>
                  </div>
                  <div className="text-xs font-black text-white mt-1 truncate">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {matchCategory === 'TEAM_2V2'
              ? `Denda akan langsung menambahkan +${penaltyAmount} poin untuk Tim lawan.`
              : `Denda akan menambahkan +${penaltyAmount} poin untuk 3 pemain lain.`}
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
          >
            BATAL
          </button>
          <button
            type="button"
            disabled={!selectedOffenderId}
            onClick={handleConfirm}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/25 disabled:opacity-50"
          >
            TERAPKAN DENDA WASIT ➔
          </button>
        </div>
      </div>
    </div>
  );
};
