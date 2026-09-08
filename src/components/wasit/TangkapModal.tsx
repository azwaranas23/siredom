'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Round } from '@/types/domino';
import { ArrowRight } from 'lucide-react';

const SEAT_DOT_COLORS = [
  'bg-rose-500',   // Seat 1
  'bg-cyan-400',   // Seat 2
  'bg-emerald-400',// Seat 3
  'bg-amber-400',  // Seat 4
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (round: Round, actionType: ActionType, winnerName: string) => void;
}

export const TangkapModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { match, selectedWinnerId, selectedAction, selectTangkapVictim, commitCurrentRound } = useScorerStore();
  const [selectedVictimId, setSelectedVictimId] = React.useState<string | null>(null);

  if (!isOpen || !selectedWinnerId) return null;

  const winner = match.players.find((p) => p.id === selectedWinnerId);
  const candidateVictims = match.players.filter((p) => p.id !== selectedWinnerId);

  const handleConfirm = async () => {
    if (!selectedVictimId) return;
    selectTangkapVictim(selectedVictimId);
    const winnerName = winner?.name || '';
    const actionType = selectedAction || 'TANGKAP';
    const committed = await commitCurrentRound();
    if (committed) {
      onSuccess(committed, actionType, winnerName);
    }
    onClose();
  };

  return (
    <>
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Full-width Edge-to-Edge Compact Bottom Sheet Drawer */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0d1527]/95 backdrop-blur-xl border-t border-slate-800/80 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] p-4 md:p-5 pb-5 animate-in slide-in-from-bottom duration-300">
        {/* Top Pill Handle Bar */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-3" />

        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="text-lg md:text-xl font-black text-white font-display tracking-tight flex items-center justify-center gap-2">
            <span>🚓</span> Pilih Korban Tangkap
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Penangkap: <strong className="text-cyan-400">{winner?.name}</strong> (+3 PTS)
          </p>
        </div>

        {/* Horizontal 3-Column Victim Candidates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto mb-5 font-mono">
          {candidateVictims.map((player) => {
            const isSelected = player.id === selectedVictimId;

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedVictimId(player.id)}
                className={`w-full bg-slate-900/90 border rounded-xl p-3 flex flex-col justify-between space-y-3 shadow-sm transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-2 border-rose-500 bg-[#2a1318] ring-2 ring-rose-500/30 scale-[1.02]'
                    : 'border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800 shrink-0">
                    K#{player.seatNumber}
                  </span>
                  <span className="text-sm font-extrabold text-white truncate">
                    {player.name}
                  </span>
                </div>

                <div
                  className={`w-full py-2 rounded-lg border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <span>💀</span>
                  <span>DITANGKAP (-3)</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact Bottom Full-width Cyan Button */}
        <div className="max-w-4xl mx-auto">
          <button
            disabled={!selectedVictimId}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-black text-xs md:text-sm font-sans uppercase tracking-wider shadow-xl shadow-cyan-400/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.98] cursor-pointer"
          >
            Konfirmasi & Lanjut <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
