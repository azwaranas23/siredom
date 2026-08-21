'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionType } from '@/types/domino';
import { useScorerStore } from '@/store/useScorerStore';

interface Props {
  actionType: ActionType | null;
  winnerName?: string;
  victimName?: string;
  onComplete: () => void;
}

export const VictoryAnimationOverlay: React.FC<Props> = ({ actionType, winnerName, victimName, onComplete }) => {

  useEffect(() => {
    if (!actionType) return;

    // Skip round victory confetti if match is completed to avoid duplicate confetti stack
    const isMatchCompleted = useScorerStore.getState().match.status === 'completed';
    if (isMatchCompleted) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1800);
      return () => clearTimeout(timer);
    }

    const normAction = String(actionType).toUpperCase();

    // Duolingo-style light confetti physics per win action
    if (normAction === 'MENANG_BIASA') {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#fbbf24', '#06b6d4', '#ffffff'],
        disableForReducedMotion: true,
      });
    } else if (normAction === 'KANDANG') {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#ea580c', '#f97316', '#ef4444', '#f59e0b'],
        disableForReducedMotion: true,
      });
    } else if (normAction === 'CEKI') {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#059669', '#ffffff'],
        disableForReducedMotion: true,
      });
    } else if (normAction === 'PALANG') {
      confetti({
        particleCount: 45,
        spread: 75,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#c084fc', '#f59e0b', '#38bdf8'],
        disableForReducedMotion: true,
      });
    } else if (normAction === 'TANGKAP') {
      confetti({
        particleCount: 35,
        spread: 65,
        origin: { y: 0.5 },
        colors: ['#3b82f6', '#ef4444', '#1d4ed8', '#ffffff'],
        disableForReducedMotion: true,
      });
    }

    // Dismiss overlay after 2.0s max or instant tap-to-skip
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [actionType, onComplete]);

  if (!actionType) return null;

  const normAction = String(actionType).toUpperCase();

  return (
    <AnimatePresence>
      <div
        onClick={onComplete}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer overflow-hidden font-sans"
      >
        {/* ========================================================================= */}
        {/* ACTION 1: 👑 MENANG BIASA (Duolingo Golden Crown Royalty) */}
        {/* ========================================================================= */}
        {normAction === 'MENANG_BIASA' && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            className="relative p-8 md:p-10 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.4)] text-center max-w-md w-full overflow-hidden"
          >
            {/* Rotating Sunburst Ray Background */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/30 via-yellow-500/10 to-transparent pointer-events-none"
            />

            {/* Bouncing Crown Emoji */}
            <motion.div
              initial={{ y: -30, scale: 0.6 }}
              animate={{ y: [0, -12, 0], scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-8xl md:text-9xl mb-3 inline-block drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)]"
            >
              👑
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-amber-950 border border-amber-500/60 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase mb-2">
                ✨ VICTORY CROWN ✨
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-white font-display tracking-tight">
                MENANG DOMINO!
              </h3>
              <p className="text-xs md:text-sm text-amber-200/90 font-mono mt-2">
                <strong>{winnerName || 'Pemain'}</strong> memenangkan ronde permainan!
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* ACTION 2: 🔥 KANDANG (Duolingo Intense Fire ignition) */}
        {/* ========================================================================= */}
        {normAction === 'KANDANG' && (
          <div className="relative flex items-center justify-center max-w-md w-full">
            {/* Animated Rising Ember Particles Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -inset-10 bg-gradient-to-t from-red-600/50 via-orange-500/30 to-transparent rounded-full blur-3xl pointer-events-none"
            />

            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220 }}
              className="relative p-8 md:p-10 rounded-3xl bg-slate-900/95 border-2 border-orange-500 shadow-[0_0_80px_rgba(234,88,12,0.6)] text-center max-w-md w-full overflow-hidden"
            >
              {/* Flame Burst Icon */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [-4, 4, -4] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                className="text-8xl md:text-9xl mb-3 inline-block drop-shadow-[0_10px_25px_rgba(234,88,12,0.7)]"
              >
                🔥
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-block px-3 py-1 rounded-full bg-orange-950 border border-orange-500/60 text-orange-300 text-xs font-mono font-bold tracking-wider uppercase mb-2">
                  🔥 KANDANG 🔥
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-white font-display tracking-tight">
                  KANDANG!
                </h3>
                <p className="text-xs md:text-sm text-orange-200/90 font-mono mt-2">
                  Panggil Damkar suruh padamkan {winnerName}! 3 Pemain lainnya otomatis <strong className="text-red-400">Berdiri 😭</strong>
                </p>
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACTION 3: ✅ CEKI (Duolingo Elastic Success Checkmark) */}
        {/* ========================================================================= */}
        {normAction === 'CEKI' && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            className="relative p-8 md:p-10 rounded-3xl bg-slate-900/95 border-2 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.5)] text-center max-w-md w-full overflow-hidden"
          >
            {/* Green Ripple Energy Ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-emerald-400 pointer-events-none"
            />

            {/* Springing Checkmark Emoji */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, ease: 'backOut' }}
              className="text-8xl md:text-9xl mb-3 inline-block drop-shadow-[0_10px_20px_rgba(16,185,129,0.5)]"
            >
              ✅
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold tracking-wider uppercase mb-2">
                ✅ PERFECT CEKI ✅
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-white font-display tracking-tight">
                CEKI!
              </h3>
              <p className="text-xs md:text-sm text-emerald-200/90 font-mono mt-2">
                Berikan <strong>{winnerName || 'Pemain'}</strong> Kulkas 2 Pintu!
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* ACTION 4: 🐐 PALANG (G.O.A.T. SPECTACULAR - ANIMASI PALING HEBOH!) */}
        {/* ========================================================================= */}
        {normAction === 'PALANG' && (
          <div className="relative flex items-center justify-center max-w-md w-full">
            {/* Fullscreen Rotating Rainbow Starburst Ray */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-40 bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-purple-600/40 via-amber-500/30 to-fuchsia-600/40 opacity-70 pointer-events-none rounded-full blur-xl"
            />

            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220 }}
              className="relative p-8 md:p-10 rounded-3xl bg-slate-900/95 border-4 border-amber-400 shadow-[0_0_100px_rgba(168,85,247,0.8)] text-center max-w-md w-full overflow-hidden"
            >
              {/* GOAT Icon with Crown Overlay */}
              <div className="relative inline-block mb-3">
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                  className="text-8xl md:text-9xl inline-block drop-shadow-[0_10px_30px_rgba(245,158,11,0.8)]"
                >
                  🐐
                </motion.div>
                <motion.div
                  initial={{ scale: 0, y: -20 }}
                  animate={{ scale: 1, y: -45 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-4xl"
                >
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-purple-600 to-amber-500 text-slate-950 text-xs font-black tracking-widest uppercase mb-2 shadow-lg shadow-purple-500/40">
                  🐐 G.O.A.T. 🐐
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-purple-300 font-display tracking-tight">
                  PALANG!
                </h3>
                <p className="text-xs md:text-sm text-purple-200 font-mono mt-2 font-bold">
                  Mau dimasak apa ini kambingnya, <strong>{winnerName || 'Pemain'}</strong>?
                </p>
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ACTION 5: 🚓 TANGKAP (Police Siren Strobe Merah-Biru) */}
        {/* ========================================================================= */}
        {normAction === 'TANGKAP' && (
          <div className="relative flex items-center justify-center max-w-md w-full">
            {/* Alternating Intense Police Red & Blue Strobe Flash Overlay */}
            <motion.div
              animate={{ backgroundColor: ['rgba(239, 68, 68, 0.45)', 'rgba(59, 130, 246, 0.45)', 'rgba(239, 68, 68, 0.45)'] }}
              transition={{ duration: 0.25, repeat: Infinity }}
              className="fixed inset-0 pointer-events-none"
            />

            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 220 }}
              className="relative p-8 md:p-10 rounded-3xl bg-slate-900/95 border-4 border-blue-500 shadow-[0_0_70px_rgba(59,130,246,0.6)] text-center max-w-md w-full overflow-hidden"
            >
              {/* Rotating Police Siren Emoji */}
              <motion.div
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="text-8xl md:text-9xl mb-3 inline-block drop-shadow-[0_10px_25px_rgba(59,130,246,0.6)]"
              >
                🚓
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-950 border border-blue-500/60 text-blue-300 text-xs font-mono font-bold tracking-wider uppercase">
                    🚨 POLICE ACTION: TANGKAP 🚨
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                </div>

                <h3 className="text-3xl md:text-4xl font-black text-white font-display tracking-tight">
                  TANGKAP!
                </h3>
                <p className="text-xs md:text-sm text-blue-200/90 font-mono mt-2">
                  <strong>{winnerName || 'Pemain'}</strong> berhasil menangkap {victimName ? <strong className="text-rose-300 font-extrabold">{victimName}</strong> : 'batu lawan'}! Korban kena <strong className="text-rose-400 font-bold">-3 Poin 💀</strong>
                </p>

              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
