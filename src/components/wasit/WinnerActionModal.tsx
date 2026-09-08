'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, EnabledActionsConfig } from '@/types/domino';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTIONS: { type: ActionType; label: string; icon: string; key: keyof EnabledActionsConfig }[] = [
  { type: 'MENANG_BIASA', label: 'MENANG BIASA', icon: '👑', key: 'menang_biasa' },
  { type: 'KANDANG', label: 'KANDANG', icon: '🔥', key: 'kandang' },
  { type: 'CEKI', label: 'CEKI', icon: '✅', key: 'ceki' },
  { type: 'PALANG', label: 'PALANG', icon: '🐐', key: 'palang' },
  { type: 'TANGKAP', label: 'TANGKAP', icon: '🚓', key: 'tangkap' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  winnerPlayerId: string | null;
}

export const WinnerActionModal: React.FC<Props> = ({ isOpen, onClose, winnerPlayerId }) => {
  const { match, selectWinnerAndAction } = useScorerStore();

  if (!isOpen || !winnerPlayerId) return null;

  const winner = match.players.find(
    (p) => p.id === winnerPlayerId || p.seatNumber === Number(winnerPlayerId)
  );
  if (!winner) return null;

  const handleActionClick = (actionType: ActionType) => {
    selectWinnerAndAction(winner.id, actionType);
  };

  const enabledActionsConfig = match.rulesConfig?.enabledActions;
  const activeActions = ACTIONS.filter((act) => {
    if (!enabledActionsConfig) return true;
    return enabledActionsConfig[act.key] ?? true;
  });

  return (
    <>
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Full-width Edge-to-Edge Bottom Sheet Drawer */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0d1527]/95 backdrop-blur-xl border-t border-slate-800/80 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] p-4 md:p-6 pb-6 md:pb-8 animate-in slide-in-from-bottom duration-300">
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

        {/* Grid of Arcade Keycap Action Tiles (filtered by enabledActions) */}
        <div className={`grid gap-2 md:gap-4 max-w-4xl mx-auto py-1 ${activeActions.length <= 2
          ? 'grid-cols-2'
          : activeActions.length === 3
            ? 'grid-cols-3'
            : activeActions.length === 4
              ? 'grid-cols-4'
              : 'grid-cols-5'
          }`}>
          {activeActions.map((act) => {
            const colorClass =
              act.type === 'MENANG_BIASA'
                ? 'border-win-biasa/50 text-win-biasa hover:bg-win-biasa/10'
                : act.type === 'KANDANG'
                  ? 'border-win-kandang/50 text-win-kandang hover:bg-win-kandang/10'
                  : act.type === 'CEKI'
                    ? 'border-win-ceki/50 text-win-ceki hover:bg-win-ceki/10'
                    : act.type === 'PALANG'
                      ? 'border-win-palang/50 text-win-palang hover:bg-win-palang/10'
                      : 'border-win-tangkap/50 text-win-tangkap hover:bg-win-tangkap/10';

            return (
              <motion.button
                key={act.type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleActionClick(act.type)}
                className={`bg-surface-elevated border-2 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center min-h-[90px] md:min-h-[110px] cursor-pointer transition-all group shadow-xl ${colorClass}`}
              >
                <span className="text-2xl md:text-4xl mb-1.5 group-hover:scale-110 transition-transform">
                  {act.icon}
                </span>
                <span className="text-[10px] md:text-xs font-black tracking-wider font-mono text-center uppercase text-white">
                  {act.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </>
  );
};
