'use client';

import React, { useState, useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { Users, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SEAT_THEMES = [
  { label: 'Kursi 1 (Merah)', border: 'border-rose-500/40 focus:border-rose-500' },
  { label: 'Kursi 2 (Biru)', border: 'border-cyan-500/40 focus:border-cyan-500' },
  { label: 'Kursi 3 (Hijau)', border: 'border-emerald-500/40 focus:border-emerald-500' },
  { label: 'Kursi 4 (Kuning)', border: 'border-amber-500/40 focus:border-amber-500' },
];

export const EditPlayerNamesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { match, updatePlayerNames } = useScorerStore();

  const [playersInput, setPlayersInput] = useState<{ seatNumber: 1 | 2 | 3 | 4; name: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setPlayersInput(
        match.players.map((p) => ({ seatNumber: p.seatNumber, name: p.name }))
      );
    }
  }, [isOpen, match.players]);

  if (!isOpen) return null;

  const handleNameChange = (seatNumber: 1 | 2 | 3 | 4, name: string) => {
    setPlayersInput((prev) =>
      prev.map((p) => (p.seatNumber === seatNumber ? { ...p, name } : p))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlayerNames(playersInput);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h3 className="text-lg font-black text-white font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Edit Nama Pemain
            </h3>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 font-mono mb-4">
            Ubah nama pemain secara langsung tanpa mempengaruhi poin atau riwayat ronde.
          </p>

          <form onSubmit={handleSave} className="space-y-3 font-mono text-xs">
            {SEAT_THEMES.map((theme, idx) => {
              const seatNum = (idx + 1) as 1 | 2 | 3 | 4;
              const currentInput = playersInput.find((p) => p.seatNumber === seatNum);

              return (
                <div key={seatNum} className="space-y-1">
                  <label className="block text-slate-400 font-bold">
                    {theme.label}
                  </label>
                  <input
                    type="text"
                    value={currentInput?.name || ''}
                    onChange={(e) => handleNameChange(seatNum, e.target.value)}
                    className={`w-full bg-slate-950 border ${theme.border} rounded-xl px-3.5 py-2.5 text-white font-extrabold focus:outline-none text-sm`}
                    placeholder={`Pemain ${seatNum}`}
                    required
                  />
                </div>
              );
            })}

            <div className="pt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Batal
              </button>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Check className="w-4 h-4" /> Simpan Nama
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
