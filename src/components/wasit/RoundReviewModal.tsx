'use client';

import React from 'react';
import { Round } from '@/types/domino';
import { useScorerStore } from '@/store/useScorerStore';
import { ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  round: Round | null;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, { label: string; icon: string; bg: string }> = {
  menang_biasa: { label: 'MENANG BIASA', icon: '👑', bg: 'from-amber-500/20 to-yellow-500/10 border-amber-500/50' },
  kandang: { label: 'KANDANG (CHECK)', icon: '🔥', bg: 'from-orange-500/20 to-red-500/10 border-orange-500/50' },
  ceki: { label: 'CEKI', icon: '✅', bg: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/50' },
  palang: { label: 'PALANG (GOAT)', icon: '🐐', bg: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/50' },
  tangkap: { label: 'TANGKAP', icon: '🚓', bg: 'from-blue-500/20 to-red-500/10 border-blue-500/50' },
};

const SEAT_THEMES = [
  { border: 'border-rose-500/40', badge: 'bg-rose-950 text-rose-300' },
  { border: 'border-cyan-500/40', badge: 'bg-cyan-950 text-cyan-300' },
  { border: 'border-emerald-500/40', badge: 'bg-emerald-950 text-emerald-300' },
  { border: 'border-amber-500/40', badge: 'bg-amber-950 text-amber-300' },
];

export const RoundReviewModal: React.FC<Props> = ({ isOpen, round, onClose }) => {
  const { match } = useScorerStore();

  if (!isOpen || !round) return null;

  const actionInfo = ACTION_LABELS[round.actionType] || { label: round.actionType, icon: '🏆', bg: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/50' };
  const winner = match.players.find((p) => p.id === round.winnerPlayerId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans"
        >
          {/* Header Badge */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              REVIEW HASIL RONDE #{round.roundNumber}
            </div>

            <h2 className="text-2xl font-extrabold text-white font-sans tracking-wide flex items-center justify-center gap-2">
              <span>{actionInfo.icon}</span>
              <span>{winner?.name}</span>
            </h2>

            <p className="text-xs text-slate-400 font-mono mt-1">
              Menang <strong className="text-amber-400">{actionInfo.label}</strong>
            </p>
          </div>

          {/* Breakdown Table of Player Scores */}
          <div className="space-y-2.5 mb-6">
            {match.players.map((player) => {
              const playerScore = round.scores.find((s) => s.playerId === player.id);
              const theme = SEAT_THEMES[player.seatNumber - 1] || SEAT_THEMES[0];
              const isWinner = player.id === round.winnerPlayerId;
              const isVictim = player.id === round.victimPlayerId;

              let statusLabel = '🪑 Duduk';
              if (isWinner) statusLabel = `👑 Menang (${actionInfo.label})`;
              else if (isVictim) statusLabel = '💀 Ditangkap';
              else if (playerScore?.status === 'berdiri') statusLabel = '😭 Berdiri';

              return (
                <div
                  key={player.id}
                  className={`bg-slate-950/80 border ${isWinner ? 'border-amber-500/80 bg-amber-950/20' : theme.border} rounded-2xl p-3.5 flex items-center justify-between shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                      K{player.seatNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        {player.name}
                        {isWinner && <span className="text-amber-400 text-xs">👑</span>}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          (playerScore?.pointsAwarded || 0) > 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : (playerScore?.pointsAwarded || 0) < 0
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {(playerScore?.pointsAwarded || 0) > 0 ? `+${playerScore?.pointsAwarded}` : playerScore?.pointsAwarded || 0} PTS
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Total: <strong className="text-white">{playerScore?.scoreAfter || player.currentScore} Poin</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Continue Button */}
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            LANJUT RONDE BERIKUTNYA <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
