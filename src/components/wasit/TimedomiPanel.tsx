'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

/**
 * TIMEDOMI — Stopwatch Digital khusus Mode PB PORDI (PRD Bagian 2.2 & 4.3).
 * Diaktifkan manual oleh wasit saat giliran seorang pemain berganti;
 * berpindah kursi menghentikan & mereset hitungan (satu giliran = satu durasi).
 */
export default function TimedomiPanel() {
  const [activeSeat, setActiveSeat] = useState<1 | 2 | 3 | 4 | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const selectSeat = (seat: 1 | 2 | 3 | 4) => {
    if (activeSeat === seat) return;
    // Giliran berganti → hentikan & reset durasi
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveSeat(seat);
    setIsRunning(false);
    setElapsed(0);
  };

  const toggleRun = () => {
    if (!activeSeat) return;
    setIsRunning((r) => !r);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="bg-amber-950/30 border-b border-amber-900/40 px-3 py-1.5 flex items-center justify-between gap-3 font-mono text-xs shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[9px] uppercase flex items-center gap-1">
          <Timer className="w-3 h-3" /> Timedomi
        </span>
        <span className="text-[10px] text-slate-400 hidden sm:inline">Durasi pikir pemain (manual)</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Pemilih giliran kursi */}
        {[1, 2, 3, 4].map((seat) => (
          <button
            key={seat}
            onClick={() => selectSeat(seat as 1 | 2 | 3 | 4)}
            className={`w-8 h-8 rounded-lg border font-black text-[11px] transition-all ${
              activeSeat === seat
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-amber-700 hover:text-amber-300'
            }`}
            title={`Giliran Kursi ${seat}`}
          >
            K{seat}
          </button>
        ))}

        {/* Layar durasi */}
        <div
          className={`px-3 h-8 min-w-[72px] rounded-lg border flex items-center justify-center font-black text-base tracking-wider ${
            isRunning
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 animate-pulse'
              : elapsed > 0
              ? 'bg-slate-900 text-amber-300 border-amber-800'
              : 'bg-slate-950 text-slate-600 border-slate-800'
          }`}
        >
          {mm}:{ss}
        </div>

        {/* Kontrol */}
        <button
          onClick={toggleRun}
          disabled={!activeSeat}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-30 ${
            isRunning
              ? 'bg-rose-950 text-rose-300 border-rose-700 hover:bg-rose-900'
              : 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
          }`}
          title={isRunning ? 'Jeda' : 'Mulai'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={resetTimer}
          disabled={elapsed === 0}
          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-30"
          title="Reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
