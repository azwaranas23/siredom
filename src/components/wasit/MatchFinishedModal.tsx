'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { Trophy, Award, RotateCcw, History, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
}

export const MatchFinishedModal: React.FC<Props> = ({ isOpen }) => {
  const router = useRouter();
  const { match, getRankedPlayers, getFunAwards, resetMatch } = useScorerStore();

  if (!isOpen || match.status !== 'completed') return null;

  const rankedPlayers = getRankedPlayers();
  const matchWinner = rankedPlayers[0];
  const awards = getFunAwards();

  const handleStartNewMatch = () => {
    resetMatch();
  };

  const handleGoToAudit = () => {
    router.push('/wasit/audit');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          className="relative max-w-lg w-full bg-slate-900 border border-amber-500/60 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans text-center"
        >
          {/* Top Radial Glow Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-cyan-500/10 to-transparent opacity-60 pointer-events-none" />

          {/* Trophy Icon */}
          <motion.div
            initial={{ scale: 0.4, rotate: -15 }}
            animate={{ scale: [0.8, 1.2, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 0.7 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 mx-auto mb-4 shadow-xl shadow-amber-500/30 flex items-center justify-center text-slate-950 text-4xl font-bold"
          >
            🏆
          </motion.div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-800 text-amber-300 text-xs font-mono font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            PERTANDINGAN SELESAI
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white font-display tracking-tight">
            JUARA: <span className="text-amber-400">{matchWinner?.name || 'Pemain'}</span>
          </h2>
          <p className="text-xs text-slate-300 font-mono mt-1">
            Mencapai target dengan total <strong className="text-cyan-400">{matchWinner?.currentScore || 0} Poin</strong> dalam {match.rounds.length} Ronde!
          </p>

          {/* Leaderboard Summary */}
          <div className="mt-5 space-y-2 text-left">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Klasemen Akhir Pertandingan:
            </h4>

            {rankedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-mono ${
                  idx === 0
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 font-bold'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-extrabold text-white text-sm font-sans">{player.name}</span>
                </div>
                <span className="font-black text-sm text-cyan-400">{player.currentScore} PTS</span>
              </div>
            ))}
          </div>

          {/* Fun Awards Cards */}
          {(awards.rajaKandang || awards.terbanyakPalang || awards.palingSeringDitangkap || awards.cekiMaster) && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-left text-[11px] font-mono">
              {awards.rajaKandang && (
                <div className="p-2.5 rounded-xl bg-orange-950/40 border border-orange-800/60">
                  <span className="text-orange-400 font-bold block">🔥 Raja Kandang</span>
                  <span className="text-white font-extrabold">{awards.rajaKandang.player.name} ({awards.rajaKandang.count}x)</span>
                </div>
              )}
              {awards.terbanyakPalang && (
                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60">
                  <span className="text-purple-400 font-bold block">🐐 Terbanyak Palang</span>
                  <span className="text-white font-extrabold">{awards.terbanyakPalang.player.name} ({awards.terbanyakPalang.count}x)</span>
                </div>
              )}
              {awards.cekiMaster && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                  <span className="text-emerald-400 font-bold block">✅ Ceki Master</span>
                  <span className="text-white font-extrabold">{awards.cekiMaster.player.name} ({awards.cekiMaster.count}x)</span>
                </div>
              )}
              {awards.palingSeringDitangkap && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60">
                  <span className="text-rose-400 font-bold block">💀 Korban Tangkap</span>
                  <span className="text-white font-extrabold">{awards.palingSeringDitangkap.player.name} ({awards.palingSeringDitangkap.count}x)</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={handleStartNewMatch}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> MULAI MATCH BARU
            </button>

            <button
              onClick={handleGoToAudit}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <History className="w-4 h-4 text-purple-400" /> AUDIT LOG
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
