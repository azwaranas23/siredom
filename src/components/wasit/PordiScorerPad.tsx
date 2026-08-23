'use client';

import React, { useState } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType } from '@/types/domino';
import { TeamScoreHeader } from '@/components/wasit/TeamScoreHeader';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { WinnerActionModal } from '@/components/wasit/WinnerActionModal';
import { TangkapModal } from '@/components/wasit/TangkapModal';
import { SecondaryStatusModal } from '@/components/wasit/SecondaryStatusModal';
import { PenaltyModal } from '@/components/wasit/PenaltyModal';
import { RotateCcw, AlertOctagon, Undo2 } from 'lucide-react';

interface PordiScorerPadProps {
  tableId: string;
  matchSession?: any;
}

const getSeatInfo = (seatNumber: number) => {
  switch (seatNumber) {
    case 1:
      return { border: 'border-rose-800/80 hover:border-rose-500', bg: 'bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-950', scoreColor: 'text-rose-400' };
    case 2:
      return { border: 'border-blue-800/80 hover:border-blue-500', bg: 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-950', scoreColor: 'text-blue-400' };
    case 3:
      return { border: 'border-emerald-800/80 hover:border-emerald-500', bg: 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950', scoreColor: 'text-emerald-400' };
    case 4:
    default:
      return { border: 'border-amber-800/80 hover:border-amber-500', bg: 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950', scoreColor: 'text-amber-400' };
  }
};

export default function PordiScorerPad({ tableId, matchSession }: PordiScorerPadProps) {
  const {
    match,
    fsmState,
    selectedWinnerId,
    selectWinnerPlayer,
    resetFSM,
    rollbackLastRound,
    applyFastPenalty,
    getTeamAScore,
    getTeamBScore,
    getRankedPlayers,
  } = useScorerStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [quickPenaltyPlayerId, setQuickPenaltyPlayerId] = useState<string | null>(null);

  const [victoryOverlayData, setVictoryOverlayData] = useState<{
    actionType: ActionType;
    winnerName: string;
    victimName?: string;
  } | null>(null);

  const rankedPlayers = getRankedPlayers();
  const teamAScore = getTeamAScore();
  const teamBScore = getTeamBScore();

  const isTeamMatch = match.matchCategory === 'TEAM_2V2';
  const targetLabel = isTeamMatch ? 'Race to 7 Poin (Ganda)' : 'Fixed 7 Ronde (Tunggal)';

  const triggerUndoToast = (roundNum: number, winnerName: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(`Ronde #${roundNum} Tersimpan (${winnerName})`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    setToastTimer(timer);
  };

  const handleApplyPenalty = async (offenderPlayerId: string, amount: 1 | 4) => {
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

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden font-sans select-none relative justify-between">
      {/* Victory Animation Overlay */}
      {victoryOverlayData && (
        <VictoryAnimationOverlay
          actionType={victoryOverlayData.actionType}
          winnerName={victoryOverlayData.winnerName}
          victimName={victoryOverlayData.victimName}
          onComplete={() => setVictoryOverlayData(null)}
        />
      )}

      {/* Floating Undo Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 border-2 border-amber-500/80 text-amber-300 font-mono font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
            <span>✓ {toastMessage}</span>
            <button
              onClick={handleUndo}
              className="bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-black px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1 transition-all"
            >
              <Undo2 className="w-3.5 h-3.5" /> UNDO
            </button>
          </div>
        </div>
      )}

      {/* Top Banner PORDI Ruleset Specific */}
      <div className="bg-amber-950/40 border-b border-amber-900/50 px-4 py-2 flex items-center justify-between font-mono text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 border border-amber-400 font-black text-[10px] uppercase">
            PB PORDI STANDAR
          </span>
          <span className="text-amber-200 font-bold">
            🏆 {targetLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPenaltyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-extrabold text-[11px] transition-all shadow-md"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> PANEL DENDA WASIT
          </button>
          <button
            disabled={match.rounds.length === 0}
            onClick={handleUndo}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-300 font-bold text-[11px] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> UNDO
          </button>
        </div>
      </div>

      {/* Team Header if TEAM_2V2 */}
      {isTeamMatch && (
        <div className="p-3 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <TeamScoreHeader
            rulesetMode={match.rulesetMode}
            matchCategory={match.matchCategory}
            teamAScore={teamAScore}
            teamBScore={teamBScore}
            targetValue={7}
            players={match.players}
          />
        </div>
      )}

      {/* Main Quadrant Display with PORDI Quick Penalty Floating Action */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3.5 p-3 min-h-0">
        {match.players.map((player) => {
          const seatInfo = getSeatInfo(player.seatNumber);
          const isSelected = selectedWinnerId === player.id;
          const isQuickPenaltyTarget = quickPenaltyPlayerId === player.id;

          return (
            <div
              key={player.id}
              onClick={() => selectWinnerPlayer(player.id)}
              className={`rounded-3xl border-2 p-5 md:p-6 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.995] shadow-2xl relative overflow-hidden group ${seatInfo.bg} ${
                isSelected
                  ? 'border-amber-400 ring-4 ring-amber-500/30'
                  : seatInfo.border
              }`}
            >
              {/* Player Header */}
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
                    K#{player.seatNumber}
                  </span>
                  <span className="font-black text-base md:text-lg text-white truncate max-w-[160px]">
                    {player.name}
                  </span>
                </div>

                {/* PORDI Quick Penalty Trigger per Seat */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickPenaltyPlayerId(isQuickPenaltyTarget ? null : player.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold border transition-colors ${
                    isQuickPenaltyTarget
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-rose-950/60 text-rose-300 border-rose-900 hover:bg-rose-900'
                  }`}
                >
                  ⚠ DENDA
                </button>
              </div>

              {/* Quick Penalty Floating Buttons panel when toggled */}
              {isQuickPenaltyTarget ? (
                <div
                  className="my-auto bg-slate-950/90 border border-rose-800/80 rounded-2xl p-3 space-y-2 animate-in zoom-in-95"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-xs font-extrabold text-rose-400 uppercase font-mono text-center">
                    PENALTY DENDA CEPAT WASIT
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <button
                      onClick={() => {
                        handleApplyPenalty(player.id, 1);
                        setQuickPenaltyPlayerId(null);
                      }}
                      className="p-2.5 bg-amber-950 hover:bg-amber-900 border border-amber-700 rounded-xl text-amber-300 font-extrabold text-xs"
                    >
                      +1 Denda Ringan
                    </button>
                    <button
                      onClick={() => {
                        handleApplyPenalty(player.id, 4);
                        setQuickPenaltyPlayerId(null);
                      }}
                      className="p-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-700 rounded-xl text-rose-300 font-extrabold text-xs"
                    >
                      +4 Passed Palsu
                    </button>
                  </div>
                </div>
              ) : (
                /* Score Display */
                <div className="text-center my-auto py-2">
                  <div className={`text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tight drop-shadow-md ${seatInfo.scoreColor}`}>
                    {player.currentScore}
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono uppercase tracking-widest mt-2 font-extrabold">
                    POIN PORDI
                  </div>
                </div>
              )}

              {/* Bottom Cue Text */}
              <div className="text-center text-xs text-slate-500 font-mono py-1 border-t border-slate-800/60 font-bold group-hover:text-amber-300 transition-colors">
                Tekan untuk memilih pemenang ronde
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet Winner Action Selection Modal (Step 1) */}
      <WinnerActionModal
        isOpen={fsmState === 'ACTION_SELECTED'}
        onClose={resetFSM}
        winnerPlayerId={selectedWinnerId}
      />

      {/* Tangkap Modal */}
      {fsmState === 'MODAL_TANGKAP_VICTIM' && (
        <TangkapModal
          isOpen={true}
          onClose={resetFSM}
          onSuccess={(round, actionType, winnerName) => {
            triggerUndoToast(match.rounds.length, winnerName);
            setVictoryOverlayData({
              actionType,
              winnerName,
            });
          }}
        />
      )}

      {/* Secondary Status Modal (Step 2 Bottom Sheet) */}
      {fsmState === 'MODAL_MANUAL_STATUS' && (
        <SecondaryStatusModal
          isOpen={true}
          onClose={resetFSM}
          onSuccess={(round, actionType, winnerName) => {
            triggerUndoToast(match.rounds.length, winnerName);
            setVictoryOverlayData({
              actionType,
              winnerName,
            });
          }}
        />
      )}

      {/* Full Penalty Modal */}
      <PenaltyModal
        isOpen={isPenaltyModalOpen}
        onClose={() => setIsPenaltyModalOpen(false)}
        players={match.players}
        matchCategory={match.matchCategory}
        onApplyPenalty={handleApplyPenalty}
      />
    </div>
  );
}
