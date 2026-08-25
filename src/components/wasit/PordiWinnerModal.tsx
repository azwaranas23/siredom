'use client';

import React, { useMemo, useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { ActionType, KandangVariant, MatchCategory, Player } from '@/types/domino';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  winnerPlayerId: string | null;
  players: Player[];
  matchCategory: MatchCategory;
  /** Dipanggil saat pilihan akhir (termasuk konteks Kandang) sudah lengkap. */
  onFinal: (
    actionType: ActionType,
    opts?: { kandangVariant?: KandangVariant; kandangRecipients?: string[] }
  ) => void;
}

type Level = 'L1' | 'CEKI' | 'KANDANG_TYPE' | 'KANDANG_PICK';

/**
 * Ticket GH#7 — Modal Pilih Kemenangan PB PORDI (2 level).
 * L1 : Domi Biasa · Domi Balak · Domi Ceki→ · Domi Kandang→ · Tangkap
 * L2 : Sub-opsi Ceki (4) / sub-jenis Kandang (3) + pemilihan lawan penerima
 *      poin untuk SERI/KALAH (tap urut, tanpa input angka — hasil grilling).
 */
export default function PordiWinnerModal({ isOpen, onClose, winnerPlayerId, players, matchCategory, onFinal }: Props) {
  const [level, setLevel] = useState<Level>('L1');
  const [kandangVariant, setKandangVariant] = useState<KandangVariant | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const winner = players.find((p) => p.id === winnerPlayerId);
  const isTeam = matchCategory === 'TEAM_2V2';
  const winnerTeam = winner?.teamIdentifier || (winner && winner.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B');

  // Lawan = selain pemenang (Tunggal) / di luar tim pemenang (Ganda)
  const opponents = useMemo(
    () =>
      players.filter((p) => {
        if (p.id === winnerPlayerId) return false;
        if (!isTeam) return true;
        const t = p.teamIdentifier || (p.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B');
        return t !== winnerTeam;
      }),
    [players, winnerPlayerId, winnerTeam, isTeam]
  );

  if (!isOpen) {
    if (level !== 'L1') {
      // reset saat tertutup
      setTimeout(() => {
        setLevel('L1');
        setKandangVariant(null);
        setPicked([]);
      }, 0);
    }
    return null;
  }

  const backToL1 = () => {
    setLevel('L1');
    setKandangVariant(null);
    setPicked([]);
  };

  const pickOpponent = (id: string) => {
    const needsSingle = kandangVariant === 'SERI' || (isTeam && kandangVariant === 'KALAH');
    const next = [...picked, id];
    if (needsSingle || next.length >= 3) {
      onFinal('KANDANG', { kandangVariant: kandangVariant!, kandangRecipients: needsSingle ? [id] : next });
      onClose();
      setLevel('L1');
      setKandangVariant(null);
      setPicked([]);
    } else {
      setPicked(next);
    }
  };

  const optCls =
    'w-full text-left px-4 py-3 rounded-xl border transition-all active:scale-[0.99] flex items-center justify-between font-mono';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border-t-2 sm:border-2 border-amber-600/70 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-3 font-mono animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            {level !== 'L1' && (
              <button onClick={backToL1} className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-sm font-black uppercase text-white tracking-wide">
              {level === 'L1' && `KEMENANGAN — ${winner?.name || 'Pemain'}`}
              {level === 'CEKI' && 'JENIS DOMI CEKI'}
              {level === 'KANDANG_TYPE' && 'JENIS KANDANG'}
              {level === 'KANDANG_PICK' &&
                `${kandangVariant === 'SERI' ? 'PILIH LAWAN SERI' : 'TAP LAWAN URUT (+3,+2,+1)'} ${picked.length ? `(${picked.length}/3)` : ''}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LEVEL 1 */}
        {level === 'L1' && (
          <div className="space-y-2">
            <button onClick={() => onFinal('MENANG_BIASA')} className={`${optCls} border-slate-700 bg-slate-950 hover:border-amber-600`}>
              <span className="text-white font-bold">👑 Domi Biasa</span>
              <span className="text-amber-300 font-black">+1</span>
            </button>
            <button onClick={() => onFinal('DOMI_BALAK')} className={`${optCls} border-slate-700 bg-slate-950 hover:border-amber-600`}>
              <span className="text-white font-bold">🀄 Domi Balak</span>
              <span className="text-amber-300 font-black">+2</span>
            </button>
            <button onClick={() => setLevel('CEKI')} className={`${optCls} border-cyan-800 bg-cyan-950/40 hover:border-cyan-500`}>
              <span className="text-white font-bold">✅ Domi Ceki</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
            <button onClick={() => setLevel('KANDANG_TYPE')} className={`${optCls} border-orange-800 bg-orange-950/30 hover:border-orange-500`}>
              <span className="text-white font-bold">🔒 Domi Kandang</span>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </button>
            <button
              onClick={() => {
                onFinal('TANGKAP');
                onClose();
              }}
              className={`${optCls} border-slate-700 bg-slate-950 hover:border-rose-600`}
            >
              <span className="text-white font-bold">🚔 Tangkap</span>
              <span className="text-rose-300 font-black">+3 / −3</span>
            </button>
          </div>
        )}

        {/* LEVEL 2A — Ceki */}
        {level === 'CEKI' && (
          <div className="space-y-2">
            {([
              ['CEKI_BIASA', 'Ceki Biasa', '+2'],
              ['CEKI_HABIS', 'Ceki Habis', '+3'],
              ['CEKI_BALAK', 'Ceki Balak', '+3'],
              ['CEKI_APOLLO', 'Ceki Apollo/Palang', '+4'],
            ] as const).map(([type, label, pts]) => (
              <button
                key={type}
                onClick={() => {
                  onFinal(type as ActionType);
                  onClose();
                  setLevel('L1');
                }}
                className={`${optCls} border-slate-700 bg-slate-950 hover:border-cyan-500`}
              >
                <span className="text-white font-bold">{label}</span>
                <span className="text-cyan-300 font-black">{pts}</span>
              </button>
            ))}
          </div>
        )}

        {/* LEVEL 2B — jenis Kandang */}
        {level === 'KANDANG_TYPE' && (
          <div className="space-y-2">
            <button
              onClick={() => {
                onFinal('KANDANG', { kandangVariant: 'MENANG', kandangRecipients: [] });
                onClose();
                setLevel('L1');
              }}
              className={`${optCls} border-emerald-800 bg-emerald-950/40 hover:border-emerald-500`}
            >
              <span className="text-white font-bold">🔒 Kandang Menang</span>
              <span className="text-emerald-300 font-black">{isTeam ? '+2 Pengunci' : '+3 Pengunci'}</span>
            </button>
            <button
              onClick={() => {
                setKandangVariant('SERI');
                setPicked([]);
                setLevel('KANDANG_PICK');
              }}
              className={`${optCls} border-amber-800 bg-amber-950/40 hover:border-amber-500`}
            >
              <span className="text-white font-bold">⚖️ Kandang Seri</span>
              <span className="text-amber-300 font-black">+1 / +1</span>
            </button>
            <button
              onClick={() => {
                setKandangVariant('KALAH');
                setPicked([]);
                setLevel('KANDANG_PICK');
              }}
              className={`${optCls} border-rose-800 bg-rose-950/40 hover:border-rose-500`}
            >
              <span className="text-white font-bold">💔 Kandang Kalah</span>
              <span className="text-rose-300 font-black">{isTeam ? '+3 Lawan' : 'Cascade 3·2·1'}</span>
            </button>
          </div>
        )}

        {/* LEVEL 2B-pick — lawan penerima poin */}
        {level === 'KANDANG_PICK' && (
          <div className="space-y-2">
            {opponents.map((p) => {
              const orderIdx = picked.indexOf(p.id);
              const reward = ['+3', '+2', '+1'][orderIdx];
              return (
                <button
                  key={p.id}
                  disabled={orderIdx >= 0}
                  onClick={() => pickOpponent(p.id)}
                  className={`${optCls} border-slate-700 bg-slate-950 hover:border-amber-500 disabled:opacity-60`}
                >
                  <span className="text-white font-bold truncate">{p.name}</span>
                  <span className={orderIdx >= 0 ? 'text-emerald-300 font-black' : 'text-slate-500 text-xs'}>
                    {orderIdx >= 0 ? reward : 'K#'+p.seatNumber}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
