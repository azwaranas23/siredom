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

        {/* Compact Victim Candidates Rows */}
        <div className="space-y-2 max-w-3xl mx-auto mb-4">
          {candidateVictims.map((player) => {
            const isSelected = player.id === selectedVictimId;
            const dotColor = SEAT_DOT_COLORS[player.seatNumber - 1] || 'bg-slate-400';

            return (
              <button
                key={player.id}
                onClick={() => setSelectedVictimId(player.id)}
                className={`w-full bg-slate-900/90 border rounded-xl p-2.5 px-4 flex items-center justify-between shadow-sm transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-2 border-rose-500 bg-[#2a1318] ring-2 ring-rose-500/30 scale-[1.005]'
                    : 'border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${dotColor} shadow-sm`} />
                  <span className="text-sm md:text-base font-extrabold text-white">
                    {player.name}
                  </span>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1 ${
                    isSelected
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  💀 DITANGKAP (-3)
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact Bottom Full-width Cyan Button */}
        <div className="max-w-3xl mx-auto">
          <button
            disabled={!selectedVictimId}
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-black text-xs md:text-sm font-display uppercase tracking-wider shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.99]"
          >
            Konfirmasi & Lanjut <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
