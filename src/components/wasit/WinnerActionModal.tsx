'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType } from '@/types/domino';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTIONS: { type: ActionType; label: string; icon: string }[] = [
  { type: 'menang_biasa', label: 'MENANG BIASA', icon: '👑' },
  { type: 'kandang', label: 'KANDANG', icon: '🔥' },
  { type: 'ceki', label: 'CEKI', icon: '✅' },
  { type: 'palang', label: 'PALANG', icon: '🐐' },
  { type: 'tangkap', label: 'TANGKAP', icon: '🚓' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  winnerPlayerId: string | null;
}

export const WinnerActionModal: React.FC<Props> = ({ isOpen, onClose, winnerPlayerId }) => {
  const { match, selectWinnerAndAction } = useScorerStore();

  if (!isOpen || !winnerPlayerId) return null;

  const winner = match.players.find((p) => p.id === winnerPlayerId);
  if (!winner) return null;

  const handleActionClick = (actionType: ActionType) => {
    selectWinnerAndAction(winnerPlayerId, actionType);
  };

  return (
    <>
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Full-width Edge-to-Edge Bottom Sheet Drawer */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0d1527]/95 backdrop-blur-xl border-t border-slate-800/80 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] p-4 md:p-6 pb-6 md:pb-8 animate-in slide-in-from-bottom duration-300">
        {/* Top Pill Handle Bar */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-4" />

        {/* Header Title */}
        <div className="relative max-w-4xl mx-auto mb-5 text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-white font-sans tracking-wide">
            Pilih Kemenangan <span className="text-cyan-400 font-black">{winner.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Horizontal Grid of 5 Action Tiles with Motion Tactile Feedback */}
        <div className="grid grid-cols-5 gap-2 md:gap-4 max-w-3xl mx-auto py-1">
          {ACTIONS.map((act) => (
            <motion.button
              key={act.type}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.90 }}
              onClick={() => handleActionClick(act.type)}
              className="bg-slate-900/90 border border-slate-800 hover:border-amber-400/90 hover:bg-amber-950/30 rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center min-h-[90px] md:min-h-[105px] cursor-pointer transition-all group shadow-lg active:ring-2 active:ring-amber-400"
            >
              <span className="text-2xl md:text-4xl mb-1.5 group-hover:scale-110 transition-transform">
                {act.icon}
              </span>
              <span className="text-[10px] md:text-xs font-black tracking-wider text-slate-300 font-mono text-center uppercase group-hover:text-amber-300">
                {act.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
};
