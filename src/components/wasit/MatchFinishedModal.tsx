'use client';

import React, { useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import confetti from 'canvas-confetti';
import { Trophy, ChevronRight, X, Sparkles, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  /** Ticket GH#14: tutup popup saja — wasit tetap di Live Wasit, tanpa logout/unlock. */
  onClose?: () => void;
}

export const MatchFinishedModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { match, getRankedPlayers, getFunAwards } = useScorerStore();

  useEffect(() => {
    if (isOpen) {
      // Ultra-light, subtle single confetti pop (15 particles max)
      confetti({
        particleCount: 15,
        spread: 50,
        origin: { y: 0.35 },
        colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#e2e8f0', '#3b82f6'],
        disableForReducedMotion: true,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rankedPlayers = getRankedPlayers();
  const matchWinner = rankedPlayers[0];
  const runnerUps = rankedPlayers.slice(1); // Ranks 2, 3, 4
  const awards = getFunAwards();

  // Ticket GH#14: SELESAI & TUTUP = tutup popup hasil saja.
  // Wasit tetap login & di Live Wasit; status COMPLETED tampil di pad.
  // Match baru dimulai lewat halaman Setup (sesi COMPLETED -> setup membuat sesi segar).
  const handleClose = () => {
    if (onClose) onClose();
  };

  const getRankBadgeInfo = (rankNum: number) => {
    switch (rankNum) {
      case 2:
        return {
          label: 'PERINGKAT 2',
          emoji: '🥈',
          badgeStyle: 'bg-slate-800 text-slate-200 border-slate-600',
          scoreColor: 'text-slate-200',
        };
      case 3:
        return {
          label: 'PERINGKAT 3',
          emoji: '🥉',
          badgeStyle: 'bg-amber-950/80 text-amber-400 border-amber-700/80',
          scoreColor: 'text-amber-400',
        };
      case 4:
      default:
        return {
          label: 'PERINGKAT 4',
          emoji: '🧱',
          badgeStyle: 'bg-rose-950/60 text-rose-400 border-rose-900/80',
          scoreColor: 'text-rose-400',
        };
    }
  };

  const activeAwards = [
    awards.rajaKandang && { key: 'kandang', label: '🔥 Raja Kandang', player: awards.rajaKandang.player.name, count: `${awards.rajaKandang.count}x`, bg: 'bg-orange-950/30 border-orange-800/50 text-orange-400' },
    awards.terbanyakPalang && { key: 'palang', label: '🐐 Terbanyak Palang', player: awards.terbanyakPalang.player.name, count: `${awards.terbanyakPalang.count}x`, bg: 'bg-purple-950/30 border-purple-800/50 text-purple-400' },
    awards.cekiMaster && { key: 'ceki', label: '✅ Ceki Master', player: awards.cekiMaster.player.name, count: `${awards.cekiMaster.count}x`, bg: 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400' },
    awards.palingSeringDitangkap && { key: 'tangkap', label: '💀 Korban Tangkap', player: awards.palingSeringDitangkap.player.name, count: `${awards.palingSeringDitangkap.count}x`, bg: 'bg-rose-950/30 border-rose-800/50 text-rose-400' },
  ].filter(Boolean);

  return (
    <AnimatePresence>
      <div
        onClick={handleClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative max-w-4xl w-full bg-slate-900 border border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto font-mono max-h-[90vh] cursor-default"
        >
          {/* Top Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors z-10"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Top Ambient Golden Radial Glow */}
          <div className="absolute -top-24 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 text-[10px] font-extrabold uppercase tracking-widest w-fit mb-4 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            PERTANDINGAN SELESAI • MEJA #{match.tableNumber || 1}
          </div>

          {/* WIDE 2-COLUMN GRID (JUARA 1 ON LEFT, KLASEMEN & AWARDS ON RIGHT) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            
            {/* LEFT COLUMN: 🥇 JUARA 1 WINNER MEDAL CARD + ACTION BUTTONS (col-span-5) */}
            <div className="md:col-span-5 bg-gradient-to-b from-amber-950/30 via-slate-950/60 to-slate-950 border border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden">
              <div className="relative space-y-2 my-auto py-2">
                {/* Glowing Medal Icon */}
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="relative w-20 h-20 mx-auto flex items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 animate-pulse blur-md opacity-70" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 p-1 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border-2 border-amber-300/80 shadow-inner">
                      <span className="text-4xl drop-shadow-[0_4px_10px_rgba(245,158,11,0.6)]">🥇</span>
                    </div>
                  </div>
                </motion.div>

                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block font-sans">
                  MEDALI PEMENANG JUARA 1
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
                  {matchWinner?.name || 'Pemain'}
                </h2>
                <p className="text-xs text-amber-200/90 font-mono">
                  Juara 1 dengan <strong className="text-amber-300 font-extrabold">{matchWinner?.currentScore || 0} Poin</strong>
                </p>
              </div>

              {/* Action Buttons — Ticket GH#14: SELESAI & TUTUP (tetap di Live Wasit) */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> SELESAI & TUTUP <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: 📊 KLASEMEN PERINGKAT 2 - 4 + 🏆 FUN AWARDS (col-span-7) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              
              {/* Leaderboard Ranks 2, 3, 4 */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-cyan-400" /> KLASEMEN PERINGKAT 2 - 4:
                </h4>

                <div className="space-y-2">
                  {runnerUps.map((player, idx) => {
                    const rankNum = idx + 2; // Rank 2, 3, 4
                    const rankInfo = getRankBadgeInfo(rankNum);

                    return (
                      <div
                        key={player.id}
                        className="p-2.5 sm:p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between transition-all hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border ${rankInfo.badgeStyle}`}>
                            {rankInfo.emoji} #{rankNum}
                          </span>
                          <div>
                            <span className="font-extrabold text-white text-sm font-sans block leading-tight">
                              {player.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold block">
                              Kursi #{player.seatNumber}
                            </span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className={`text-base font-black ${rankInfo.scoreColor}`}>
                            {player.currentScore}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">POIN</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Awards Grid (Widens horizontally based on active win condition awards) */}
              {activeAwards.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    🎖️ DETAIL KONDISI MENANG:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    {activeAwards.map((item: any) => (
                      <div key={item.key} className={`p-2.5 rounded-xl border ${item.bg}`}>
                        <span className="font-bold block text-[10px] uppercase tracking-wider">{item.label}</span>
                        <span className="text-white font-extrabold text-xs">{item.player} ({item.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

