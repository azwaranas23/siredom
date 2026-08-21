'use client';

import React from 'react';
import { Player, RulesetMode, MatchCategory } from '@/types/domino';
import { Shield, Trophy, Zap } from 'lucide-react';

interface TeamScoreHeaderProps {
  rulesetMode: RulesetMode;
  matchCategory: MatchCategory;
  teamAScore: number;
  teamBScore: number;
  targetValue: number;
  currentSet?: number;
  teamASetWins?: number;
  teamBSetWins?: number;
  players: Player[];
}

export const TeamScoreHeader: React.FC<TeamScoreHeaderProps> = ({
  rulesetMode,
  matchCategory,
  teamAScore,
  teamBScore,
  targetValue,
  currentSet = 1,
  teamASetWins = 0,
  teamBSetWins = 0,
  players,
}) => {
  if (matchCategory !== 'TEAM_2V2') return null;

  const teamAPlayers = players.filter((p) => p.seatNumber === 1 || p.seatNumber === 3);
  const teamBPlayers = players.filter((p) => p.seatNumber === 2 || p.seatNumber === 4);

  const teamAPercent = Math.min(100, Math.round((teamAScore / targetValue) * 100));
  const teamBPercent = Math.min(100, Math.round((teamBScore / targetValue) * 100));

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-3 font-mono shadow-lg">
      {/* Set Tracker for PB ORADO */}
      {rulesetMode === 'PB_ORADO' && (
        <div className="flex items-center justify-center gap-3 pb-2 border-b border-slate-800/80 mb-2">
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-cyan-400" /> SET {currentSet} DARI 3
          </span>
          <div className="flex items-center gap-2 text-xs font-black text-white">
            <span className="text-rose-400">TIM A ({teamASetWins})</span>
            <span className="text-slate-500">-</span>
            <span className="text-blue-400">TIM B ({teamBSetWins})</span>
          </div>
          {rulesetMode === 'PB_ORADO' && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
              RACE TO 101
            </span>
          )}
        </div>
      )}

      {/* Team Aggregate Score Display */}
      <div className="grid grid-cols-2 gap-3 items-center">
        {/* TIM A (Seats 1 & 3: Merah & Hijau) */}
        <div className="bg-gradient-to-r from-rose-950/60 to-emerald-950/60 border border-rose-800/50 rounded-xl p-2.5 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-black text-white tracking-wider">TIM A</span>
              <span className="text-[9px] text-slate-400 font-semibold">(K1 & K3)</span>
            </div>
            <div className="text-[10px] text-slate-300 truncate max-w-[140px] font-sans">
              {teamAPlayers.map((p) => p.name).join(' & ') || 'Pemain 1 & 3'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {teamAScore} <span className="text-[10px] text-slate-400 uppercase font-mono">POIN</span>
            </div>
            {rulesetMode !== 'PB_ORADO' && (
              <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-rose-900 mt-1">
                <div className="bg-rose-500 h-full transition-all" style={{ width: `${teamAPercent}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* TIM B (Seats 2 & 4: Biru & Kuning) */}
        <div className="bg-gradient-to-r from-blue-950/60 to-amber-950/60 border border-blue-800/50 rounded-xl p-2.5 flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-black text-white tracking-wider">TIM B</span>
              <span className="text-[9px] text-slate-400 font-semibold">(K2 & K4)</span>
            </div>
            <div className="text-[10px] text-slate-300 truncate max-w-[140px] font-sans">
              {teamBPlayers.map((p) => p.name).join(' & ') || 'Pemain 2 & 4'}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-blue-400 tracking-tight">
              {teamBScore} <span className="text-[10px] text-slate-400 uppercase font-mono">POIN</span>
            </div>
            {rulesetMode !== 'PB_ORADO' && (
              <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-blue-900 mt-1">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${teamBPercent}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
