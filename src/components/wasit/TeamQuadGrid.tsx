'use client';

import React from 'react';
import { Player, TeamIdentifier, MatchCategory, RoundStatusTag } from '@/types/domino';

interface TeamQuadGridProps {
  players: Player[];
  matchCategory: MatchCategory;
  onSelectMember: (playerId: string) => void;
  /** Skor tim ditampilkan; jika tidak diberikan, hitung dari players */
  teamAScore?: number;
  teamBScore?: number;
}

interface TeamData {
  id: string;
  label: string;
  color: string;
  borderColor: string;
  textColor: string;
  bgGradient: string;
  score: number;
  members: Player[];
}

/**
 * Layout 2 kuadran tim — paritas visual dengan ORADO.
 * Digunakan oleh CasualScorerPad & PordiScorerPad saat kategori Ganda.
 * Tap kartu tim → pemilih anggota inline → onSelectMember(memberId).
 */
export default function TeamQuadGrid({
  players,
  matchCategory,
  onSelectMember,
  teamAScore: teamAScoreProp,
  teamBScore: teamBScoreProp,
}: TeamQuadGridProps) {
  const teamAPlayers = players.filter((p) => p.seatNumber % 2 === 1); // 1 & 3
  const teamBPlayers = players.filter((p) => p.seatNumber % 2 === 0); // 2 & 4

  const teamAScore = teamAScoreProp ?? teamAPlayers.reduce((s, p) => s + (p.currentScore || 0), 0);
  const teamBScore = teamBScoreProp ?? teamBPlayers.reduce((s, p) => s + (p.currentScore || 0), 0);

  const teams: TeamData[] = [
    {
      id: 'TEAM_A',
      label: 'TIM A',
      color: 'bg-rose-950/70 border-rose-800/80 text-rose-400',
      borderColor: 'border-rose-800/80',
      textColor: 'text-rose-400',
      bgGradient: 'from-rose-950/70 via-slate-900 to-slate-950',
      score: teamAScore,
      members: teamAPlayers,
    },
    {
      id: 'TEAM_B',
      label: 'TIM B',
      color: 'bg-blue-950/70 border-blue-800/80 text-blue-400',
      borderColor: 'border-blue-800/80',
      textColor: 'text-blue-400',
      bgGradient: 'from-blue-950/70 via-slate-900 to-slate-950',
      score: teamBScore,
      members: teamBPlayers,
    },
  ];

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 min-h-0 font-mono">
      {teams.map((team) => (
        <div
          key={team.id}
          className={`bg-gradient-to-br ${team.bgGradient} border-2 ${team.borderColor} rounded-3xl p-5 md:p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group`}
        >
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-xl ${team.color} border ${team.borderColor} font-black text-xs uppercase tracking-wider`}>
                {team.label} ({team.members.map((m) => m.name).join(' & ')})
              </span>
            </div>
          </div>

          {/* Skor agregat */}
          <div className="text-center my-5">
            <div className={`text-6xl sm:text-7xl font-black ${team.textColor} tracking-tight drop-shadow`}>
              {team.score}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
              POIN TIM
            </div>
          </div>

          {/* Pemilih anggota inline */}
          <div className="space-y-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold text-center mb-1">Pilih Pemenang:</div>
            <div className="grid grid-cols-2 gap-2">
              {team.members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onSelectMember(member.id)}
                  className={`p-3 rounded-2xl border ${team.borderColor} hover:border-current transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${team.color} text-white`}
                >
                  <span className="font-black text-sm">{member.name}</span>
                  <span className={`text-2xl font-black ${team.textColor}`}>{member.currentScore}</span>
                  <span className="text-[10px] text-slate-400 uppercase">POIN</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
