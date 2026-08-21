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

export const SecondaryStatusModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { match, selectedWinnerId, selectedAction, manualStatuses, setManualPlayerStatus, commitCurrentRound } = useScorerStore();

  if (!isOpen || !selectedWinnerId || !selectedAction) return null;

  const winner = match.players.find((p) => p.id === selectedWinnerId);
  const remainingPlayers = match.players.filter((p) => p.id !== selectedWinnerId);

  const handleConfirm = async () => {
    const winnerName = winner?.name || '';
    const actionType = selectedAction;
    const committed = await commitCurrentRound();
    if (committed && actionType) {
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

        {/* Compact Title */}
        <div className="text-center mb-3">
          <h2 className="text-lg md:text-xl font-extrabold text-white font-sans tracking-wide">
            Status Pemain Lainnya
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Pemenang: <strong className="text-cyan-400">{winner?.name}</strong> ({String(selectedAction).toUpperCase()})
          </p>
        </div>

        {/* Compact Player Status Rows */}
        <div className="space-y-2.5 max-w-3xl mx-auto mb-4 font-mono">
          {remainingPlayers.map((player) => {
            const currentStatus = String(manualStatuses[player.id] || 'DUDUK').toUpperCase();
            const dotColor = SEAT_DOT_COLORS[player.seatNumber - 1] || 'bg-slate-400';
            const isBerdiri = currentStatus === 'BERDIRI';
            const isDuduk = currentStatus === 'DUDUK';

            return (
              <div
                key={player.id}
                className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 px-4 flex items-center justify-between shadow-sm"
              >
                {/* Left: Seat Indicator Dot + Name */}
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${dotColor} shadow-sm`} />
                  <span className="text-sm md:text-base font-extrabold text-white font-sans">
                    {player.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">K#{player.seatNumber}</span>
                </div>

                {/* Right: Side-by-side BERDIRI vs DUDUK Buttons with Solid Active Highlight */}
                <div className="flex items-center gap-2.5">
                  {/* DUDUK Button (Default Active) */}
                  <button
                    type="button"
                    onClick={() => setManualPlayerStatus(player.id, 'DUDUK')}
                    className={`rounded-xl px-3.5 py-2 min-w-[90px] flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black ${
                      isDuduk
                        ? 'bg-emerald-500 text-slate-950 border-2 border-emerald-300 shadow-lg shadow-emerald-500/40 scale-105'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-400 opacity-60 hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🪑</span>
                    <span>DUDUK</span>
                  </button>

                  {/* BERDIRI Button */}
                  <button
                    type="button"
                    onClick={() => setManualPlayerStatus(player.id, 'BERDIRI')}
                    className={`rounded-xl px-3.5 py-2 min-w-[90px] flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black ${
                      isBerdiri
                        ? 'bg-rose-600 text-white border-2 border-rose-300 shadow-lg shadow-rose-600/40 scale-105'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-400 opacity-60 hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">😭</span>
                    <span>BERDIRI</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Bottom Full-width Cyan Button */}
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs md:text-sm font-display uppercase tracking-wider shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.99] cursor-pointer"
          >
            Konfirmasi & Lanjut <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
