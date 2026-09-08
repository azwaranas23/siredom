'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { TeamIdentifier } from '@/types/domino';
import { OradoScoringModal } from '@/components/wasit/OradoScoringModal';
import { PenaltyModal } from '@/components/wasit/PenaltyModal';
import { RotateCcw, Trophy, ShieldAlert, Sparkles, Undo2, Settings } from 'lucide-react';

interface OradoScorerPadProps {
  tableId: string;
  matchSession?: any;
}

export default function OradoScorerPad({ tableId, matchSession }: OradoScorerPadProps) {
  const {
    match,
    commitOradoRound,
    rollbackLastRound,
    applyFastPenalty,
    getTeamAScore,
    getTeamBScore,
    updateTargetMidGame,
  } = useScorerStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const [isOradoModalOpen, setIsOradoModalOpen] = useState(false);
  const [oradoModalTeam, setOradoModalTeam] = useState<TeamIdentifier>('TEAM_A');

  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editTargetValue, setEditTargetValue] = useState<number | string>(match.targetValue || 101);

  const teamAScore = getTeamAScore();
  const teamBScore = getTeamBScore();

  const teamAPlayers = match.players.filter((p) => p.seatNumber === 1 || p.seatNumber === 3);
  const teamBPlayers = match.players.filter((p) => p.seatNumber === 2 || p.seatNumber === 4);

  const triggerUndoToast = (roundNum: number, winnerName: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(`Ronde #${roundNum} Orado Tersimpan (${winnerName})`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
    setToastTimer(timer);
  };

  const handleCommitOradoRound = async (
    winnerTeam: TeamIdentifier,
    winnerPlayerId: string,
    rawRemainingPoints: number,
    multipliers: { duaUjung: boolean; balakHabis: boolean; macetBeradu: boolean; balak0Mati?: boolean }
  ) => {
    const roundNumBefore = match.rounds.length + 1;
    const winnerObj = match.players.find((p) => p.id === winnerPlayerId);
    const winnerName = winnerObj?.name || (winnerTeam === 'TEAM_A' ? 'Tim A' : 'Tim B');

    const committedRound = await commitOradoRound(winnerTeam, winnerPlayerId, rawRemainingPoints, multipliers);

    if (committedRound) {
      triggerUndoToast(roundNumBefore, winnerName);
    }
  };

  const handleApplyPenalty = async (offenderPlayerId: string, amount: 1 | 3 | 4) => {
    const roundNumBefore = match.rounds.length + 1;
    const committedRound = await applyFastPenalty(offenderPlayerId, amount);

    if (committedRound) {
      triggerUndoToast(roundNumBefore, `Denda +${amount}`);
    }
  };

  const handleUndo = async () => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(null);
    await rollbackLastRound();
  };

  // Deteksi Apollo Condition (Set score 101 vs 0)
  const isApolloA = teamAScore >= 101 && teamBScore === 0;
  const isApolloB = teamBScore >= 101 && teamAScore === 0;

  const currentBalak = match.rounds.length % 7;

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden font-sans select-none relative justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 border-2 border-cyan-500/80 text-cyan-300 font-mono font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
            <span>✓ {toastMessage}</span>
            <button
              onClick={handleUndo}
              className="bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" /> UNDO
            </button>
          </div>
        </div>
      )}

      {/* Top Banner ORADO Ruleset Specific */}
      <div className="bg-cyan-950/40 border-b border-cyan-900/50 px-4 py-2 flex items-center justify-between font-mono text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 border border-cyan-300 font-black text-[10px] uppercase">
            PB ORADO STANDAR (2V2)
          </span>
          <span className="text-cyan-200 font-bold">
            SET {match.currentSet || 1}/3 • GILIRAN BALAK {currentBalak}
          </span>
          {(isApolloA || isApolloB) && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] uppercase animate-pulse">
              ⚡ APOLLO!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditTargetValue(match.targetValue || 101);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-extrabold text-[11px] transition-all shadow-md"
            title="Menu Wasit & Target"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" /> TARGET
          </button>
          <button
            onClick={() => setIsPenaltyModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-[11px] transition-all"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> DENDA
          </button>
          <button
            disabled={match.rounds.length === 0}
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 font-bold text-[11px] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> UNDO
          </button>
        </div>
      </div>

      {/* Set Wins & Current Set Indicator Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-3 font-mono flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">SET SAAT INI:</span>
            <span className="px-3 py-1 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 font-black text-sm">
              SET #{match.currentSet || 1}
            </span>
          </div>
          {(isApolloA || isApolloB) && (
            <div className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs animate-bounce flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> KONDISI APOLLO DETECTED (101 vs 0)
            </div>
          )}
        </div>

        {/* Set Wins tracker */}
        <div className="flex items-center gap-6 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-extrabold">TIM A SET:</span>
            <span className="text-lg font-black text-white">{match.teamASetWins || 0} / 2</span>
          </div>
          <span className="text-slate-600">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-extrabold">TIM B SET:</span>
            <span className="text-lg font-black text-white">{match.teamBSetWins || 0} / 2</span>
          </div>
        </div>
      </div>

      {/* Main 2-Team Split Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 min-h-0 font-mono">
        {/* TEAM A BOX */}
        <div className="bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-2 border-rose-800/80 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 font-black text-xs uppercase tracking-wider">
                TIM A (MERAH & HIJAU)
              </span>
              <span className="text-xs text-rose-400 font-bold">
                Kemenangan Set: {match.teamASetWins || 0}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Anggota: {teamAPlayers.map((p) => p.name).join(' & ') || 'Pemain 1 & 3'}
            </div>
          </div>

          <div className="text-center my-4">
            <div className="text-6xl sm:text-7xl short:text-5xl font-black text-rose-400 tracking-tight drop-shadow">
              {teamAScore}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
              TITIK KUMULATIF SET INI (TARGET {match.targetValue || 101})
            </div>
          </div>

          <button
            onClick={() => {
              setOradoModalTeam('TEAM_A');
              setIsOradoModalOpen(true);
            }}
            className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Trophy className="w-5 h-5" /> INPUT TITIK MENANG TIM A
          </button>
        </div>

        {/* TEAM B BOX */}
        <div className="bg-gradient-to-br from-blue-950/70 via-slate-900 to-slate-950 border-2 border-blue-800/80 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-black text-xs uppercase tracking-wider">
                TIM B (BIRU & KUNING)
              </span>
              <span className="text-xs text-blue-400 font-bold">
                Kemenangan Set: {match.teamBSetWins || 0}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Anggota: {teamBPlayers.map((p) => p.name).join(' & ') || 'Pemain 2 & 4'}
            </div>
          </div>

          <div className="text-center my-4">
            <div className="text-6xl sm:text-7xl short:text-5xl font-black text-blue-400 tracking-tight drop-shadow">
              {teamBScore}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">
              TITIK KUMULATIF SET INI (TARGET {match.targetValue || 101})
            </div>
          </div>

          <button
            onClick={() => {
              setOradoModalTeam('TEAM_B');
              setIsOradoModalOpen(true);
            }}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Trophy className="w-5 h-5" /> INPUT TITIK MENANG TIM B
          </button>
        </div>
      </div>

      {/* Orado Count Scoring Modal */}
      <OradoScoringModal
        isOpen={isOradoModalOpen}
        onClose={() => setIsOradoModalOpen(false)}
        players={match.players}
        defaultSelectedTeam={oradoModalTeam}
        onCommitOrado={handleCommitOradoRound}
      />

      {/* Penalty Modal */}
      <PenaltyModal
        isOpen={isPenaltyModalOpen}
        onClose={() => setIsPenaltyModalOpen(false)}
        players={match.players}
        matchCategory="TEAM_2V2"
        onApplyPenalty={handleApplyPenalty}
      />

      {/* Mid-Game Target Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Settings className="w-4 h-4 text-cyan-400" /> UBAH TARGET TITIK SET
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">NILAI TARGET POIN BARU (SET 101)</label>
                <input
                  type="number"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(e.target.value)}
                  min={10}
                  max={500}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-extrabold text-sm"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                BATAL
              </button>
              <button
                onClick={async () => {
                  const val = Number(editTargetValue) || 101;
                  updateTargetMidGame('points', val);
                  setIsSettingsOpen(false);
                  const matchId = match.id;
                  if (!matchId || matchId === 'empty') return;
                  try {
                    await fetch('/api/matches', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'UPDATE_TARGET',
                        matchId,
                        updateTargetData: { matchMode: 'points', targetValue: val },
                      }),
                    });
                  } catch (err) {
                    console.warn('Gagal menyimpan target ORADO ke database:', err);
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                SIMPAN TARGET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
