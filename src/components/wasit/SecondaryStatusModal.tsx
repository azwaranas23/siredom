'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Round } from '@/types/domino';
import { ArrowRight, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (round: Round, actionType: ActionType, winnerName: string) => void;
}

export const SecondaryStatusModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const {
    match,
    selectedWinnerId,
    selectedAction,
    manualStatuses,
    setManualPlayerStatus,
    commitCurrentRound,
  } = useScorerStore();

  if (!isOpen || !selectedWinnerId || !selectedAction) return null;

  const winner = match.players.find(
    (p) => p.id === selectedWinnerId || p.seatNumber === Number(selectedWinnerId)
  );

  const remainingPlayers = match.players.filter(
    (p) => p.id !== selectedWinnerId && (winner ? p.seatNumber !== winner.seatNumber : true)
  );

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

      {/* Centered Modal / Edge-to-Edge Bottom Sheet Drawer matching Image 2 */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0d1527]/95 backdrop-blur-xl border-t border-slate-800/80 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] p-4 md:p-6 pb-6 animate-in slide-in-from-bottom duration-300">
        {/* Top Pill Handle Bar */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-4" />

        {/* Modal Header */}
        <div className="relative max-w-3xl mx-auto mb-4 font-mono text-center">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-lg md:text-xl font-black text-white font-sans tracking-wide uppercase text-left">
                PILIH KEMENANGAN <span className="text-cyan-400">{winner?.name}</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono text-left mt-0.5">
                Atur status 3 pemain lainnya:
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Status Rows matching Image 2 */}
        <div className="space-y-3 max-w-3xl mx-auto mb-5 font-mono">
          {remainingPlayers.map((player) => {
            const currentStatus = String(manualStatuses[player.id] || 'DUDUK').toUpperCase();
            const isBerdiri = currentStatus === 'BERDIRI';
            const isDuduk = currentStatus === 'DUDUK';

            return (
              <div
                key={player.id}
                className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 px-4 flex items-center justify-between shadow-sm"
              >
                {/* Left: Seat Indicator Badge + Name */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">
                    KURSI #{player.seatNumber}
                  </span>
                  <span className="text-sm md:text-base font-extrabold text-white font-sans">
                    {player.name}
                  </span>
                </div>

                {/* Right: Side-by-side DUDUK vs BERDIRI Buttons matching Image 2 */}
                <div className="flex items-center gap-2">
                  {/* DUDUK Button */}
                  <button
                    type="button"
                    onClick={() => setManualPlayerStatus(player.id, 'DUDUK')}
                    className={`rounded-xl px-4 py-2 min-w-[95px] flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black font-mono ${
                      isDuduk
                        ? 'bg-blue-950 text-blue-300 border-2 border-blue-700 shadow-md shadow-blue-950/50 scale-105'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🪑</span>
                    <span>DUDUK</span>
                  </button>

                  {/* BERDIRI Button */}
                  <button
                    type="button"
                    onClick={() => setManualPlayerStatus(player.id, 'BERDIRI')}
                    className={`rounded-xl px-4 py-2 min-w-[95px] flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black font-mono ${
                      isBerdiri
                        ? 'bg-rose-600 text-white border-2 border-rose-400 shadow-md shadow-rose-600/50 scale-105'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-500 hover:text-white'
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

        {/* Full-width Cyan Submit Button matching Image 2 */}
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm font-sans uppercase tracking-wider shadow-xl shadow-cyan-400/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.98] cursor-pointer"
          >
            KONFIRMASI & SIMPAN RONDE <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};
