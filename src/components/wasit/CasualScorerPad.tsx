'use client';

import React, { useState, useEffect } from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Player } from '@/types/domino';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { WinnerActionModal } from '@/components/wasit/WinnerActionModal';
import { TangkapModal } from '@/components/wasit/TangkapModal';
import { SecondaryStatusModal } from '@/components/wasit/SecondaryStatusModal';
import TeamQuadGrid from '@/components/wasit/TeamQuadGrid';
import PipMotif from '@/components/wasit/PipMotif';
import { RotateCcw, Undo2, Pencil, Settings, Flame, Trophy } from 'lucide-react';

interface CasualScorerPadProps {
  tableId: string;
  matchSession?: any;
}

const getSeatInfo = (seatNumber: number) => {
  switch (seatNumber) {
    case 1:
      return { border: 'border-rose-800/80 hover:border-rose-500', bg: 'bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-950', scoreColor: 'text-amber-400' };
    case 2:
      return { border: 'border-blue-800/80 hover:border-blue-500', bg: 'bg-gradient-to-br from-blue-950/80 via-slate-900 to-slate-950', scoreColor: 'text-cyan-400' };
    case 3:
      return { border: 'border-emerald-800/80 hover:border-emerald-500', bg: 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950', scoreColor: 'text-emerald-400' };
    case 4:
    default:
      return { border: 'border-amber-800/80 hover:border-amber-500', bg: 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950', scoreColor: 'text-amber-400' };
  }
};

const getRankInfo = (rank: number) => {
  switch (rank) {
    case 1:
      return { emoji: '👑', badgeBg: 'bg-amber-950 text-amber-300 border-amber-500' };
    case 2:
      return { emoji: '🥈', badgeBg: 'bg-slate-800 text-slate-300 border-slate-600' };
    case 3:
      return { emoji: '🥉', badgeBg: 'bg-amber-900/60 text-amber-400 border-amber-800' };
    default:
      return { emoji: '👤', badgeBg: 'bg-slate-900 text-slate-400 border-slate-800' };
  }
};

export default function CasualScorerPad({ tableId, matchSession }: CasualScorerPadProps) {
  const {
    match,
    fsmState,
    selectedWinnerId,
    selectedAction,
    selectedVictimId,
    tenantCode,
    tableNumber,
    selectWinnerPlayer,
    resetFSM,
    commitCurrentRound,
    rollbackLastRound,
    getRankedPlayers,
    getLast5RoundHistory,
    getWinstreak,
    updateTargetMidGame,
    updateSinglePlayerName,
    setMatchFromDb,
  } = useScorerStore();

  // Sync DB session on load
  useEffect(() => {
    if (matchSession && matchSession.playersData) {
      setMatchFromDb(matchSession);
    }
  }, [matchSession, setMatchFromDb]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  // Mid-Game Target Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState<'rounds' | 'points'>(match.matchMode || 'rounds');
  const [editTargetValue, setEditTargetValue] = useState<number | string>(match.targetValue || 10);

  // Inline Player Name Editor Modal State
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerNameInput, setNewPlayerNameInput] = useState('');

  const [victoryOverlayData, setVictoryOverlayData] = useState<{
    actionType: ActionType;
    winnerName: string;
    victimName?: string;
  } | null>(null);

  const rankedPlayers = getRankedPlayers();

  const triggerUndoToast = (roundNum: number, winnerName: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(`Ronde #${roundNum} Tersimpan (${winnerName})`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 6000);
    setToastTimer(timer);
  };

  const handleAutoCommit = async () => {
    const roundNumBefore = match.rounds.length + 1;
    const winnerObj = match.players.find((p) => p.id === selectedWinnerId);
    const victimObj = match.players.find((p) => p.id === selectedVictimId);
    const winnerName = winnerObj?.name || 'Pemain';
    const victimName = victimObj?.name;

    const committedRound = await commitCurrentRound();

    if (committedRound) {
      triggerUndoToast(roundNumBefore, winnerName);
      setVictoryOverlayData({
        actionType: committedRound.actionType,
        winnerName,
        victimName,
      });
    }
  };

  const handleUndo = async () => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(null);
    await rollbackLastRound();
  };

  // KANDANG Zero-Redundancy Auto-Commit: langsung commit + animasi tanpa modal status
  React.useEffect(() => {
    if (fsmState === 'CONFIRMATION' && selectedAction === 'KANDANG' && selectedWinnerId) {
      handleAutoCommit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsmState]);

  // Mid-Game Target Update Handler — Ticket GH#8: persistensi terjamin & gagal terlihat
  const handleSaveTargetMidGame = async () => {
    const val = Number(editTargetValue) || (editMode === 'rounds' ? 10 : 50);
    updateTargetMidGame(editMode, val);
    setIsSettingsOpen(false);

    // Optimistic sudah diterapkan; persist ke sesi YANG BENAR via match.id
    // (GET ulang dulu = sumber bug "target kembali ke nilai lama").
    const matchId = match.id;
    if (!matchId || matchId === 'empty') {
      window.alert('Sesi belum tersimpan di database — target hanya berlaku lokal.');
      return;
    }

    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TARGET',
          matchId,
          updateTargetData: { matchMode: editMode, targetValue: val },
        }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        window.alert(`Gagal menyimpan target baru: ${json.message || 'unknown'}`);
      }
    } catch (err) {
      console.error('Failed to update target in DB:', err);
      window.alert('Gagal menyimpan target baru ke database. Periksa koneksi lalu ubah ulang.');
    }
  };

  // Inline Player Name Save Handler
  const handleSavePlayerName = async () => {
    if (!editingPlayer || !newPlayerNameInput.trim()) return;
    const cleanName = newPlayerNameInput.trim();
    updateSinglePlayerName(editingPlayer.id, cleanName);
    setEditingPlayer(null);
  };

  // Order players strictly by seatNumber 1..4
  const seatOrderedPlayers = [...match.players].sort((a, b) => a.seatNumber - b.seatNumber);
  const displayPlayers: Player[] =
    seatOrderedPlayers.length === 4
      ? seatOrderedPlayers
      : [
          { id: `p-1`, seatNumber: 1, name: 'Pemain 1', currentScore: 0, teamIdentifier: 'NONE' },
          { id: `p-2`, seatNumber: 2, name: 'Pemain 2', currentScore: 0, teamIdentifier: 'NONE' },
          { id: `p-3`, seatNumber: 3, name: 'Pemain 3', currentScore: 0, teamIdentifier: 'NONE' },
          { id: `p-4`, seatNumber: 4, name: 'Pemain 4', currentScore: 0, teamIdentifier: 'NONE' },
        ];

  const currentRoundNum = match.rounds.length + 1;

  return (
    <div className="h-full flex-1 flex flex-col min-h-0 overflow-hidden font-sans select-none relative justify-between bg-slate-950">
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
          <div className="bg-slate-900/95 border-2 border-emerald-500/80 text-emerald-300 font-mono font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
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

      {/* Sub-Header Bar matching Image 2 */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 short:py-1.5 py-2.5 flex items-center justify-between font-mono text-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 font-black text-xs">
            MEJA #{match.tableNumber || tableId}
          </span>
          <span className="text-white font-extrabold text-xs">
            RONDE #{currentRoundNum}
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden md:flex items-center gap-1.5">
            MODE: <strong className="text-cyan-400 uppercase">{match.matchMode}</strong>
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <PipMotif
            count={Math.min(match.rounds.length, 7)}
            accent="casual"
            size="sm"
          />
          <span className="text-amber-400 font-bold">
            TARGET: {match.targetValue} {match.matchMode === 'rounds' ? 'RONDE' : 'POIN'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Ubah Target Button */}
          <button
            onClick={() => {
              setEditMode(match.matchMode || 'rounds');
              setEditTargetValue(match.targetValue || 10);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs transition-all shadow-md"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" /> UBAH TARGET
          </button>

          {/* Undo Button */}
          <button
            disabled={match.rounds.length === 0}
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-amber-300 font-bold text-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> UNDO
          </button>
        </div>
      </div>

      {match.matchCategory === 'TEAM_2V2' ? (
        /* Layout 2 kuadran tim untuk Ganda — paritas ORADO */
        <TeamQuadGrid
          players={match.players}
          matchCategory={match.matchCategory}
          onSelectMember={(playerId) => selectWinnerPlayer(playerId)}
        />
      ) : (
      /* 4 Quadrants Player Grid for Tunggal */
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3.5 p-3 min-h-0">
        {displayPlayers.map((player) => {
          const dynamicRank = rankedPlayers.findIndex((rp) => rp.id === player.id) + 1 || player.seatNumber;
          const seatInfo = getSeatInfo(player.seatNumber);
          const rankInfo = getRankInfo(dynamicRank);
          const historyList = getLast5RoundHistory(player.id);
          const winstreak = getWinstreak(player.id);

          return (
            <div
              key={player.id}
              onClick={() => selectWinnerPlayer(player.id)}
              className={`rounded-3xl border-2 p-5 md:p-6 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.995] shadow-2xl relative overflow-hidden group ${seatInfo.bg} ${seatInfo.border}`}
            >
              {/* Top Row: Rank, Seat & Pencil + Streak */}
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${rankInfo.badgeBg}`}>
                    {rankInfo.emoji} #{dynamicRank}
                  </span>
                  <span className="text-xs font-bold text-slate-400">KURSI #{player.seatNumber}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlayer({ id: player.id, name: player.name });
                      setNewPlayerNameInput(player.name);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors"
                    title="Ubah Nama Pemain"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {winstreak >= 2 && (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-700/80 font-black text-xs flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> {winstreak}x STREAK
                  </span>
                )}
              </div>

              {/* Center Player Name & Large Centered Score Display */}
              <div className="my-auto py-2 short:py-0.5 flex flex-col items-center justify-center">
                <div className="text-xl md:text-2xl font-black text-white font-display mb-1 tracking-wide">
                  {player.name}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-6xl sm:text-7xl md:text-8xl short:text-5xl font-black font-mono tracking-tight ${seatInfo.scoreColor}`}>
                    {player.currentScore}
                  </span>
                  <span className="text-sm font-black font-mono text-slate-400 uppercase">POIN</span>
                </div>
              </div>

              {/* Bottom Row: 5 Ronde History List matching Image 2 */}
              <div className="border-t border-slate-800/80 pt-2.5 short:pt-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">5 RONDE:</span>
                {historyList.length === 0 ? (
                  <span className="text-[10px] text-slate-600 italic">Belum ada ronde</span>
                ) : (
                  historyList.map((h, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${h.statusClass}`}
                    >
                      {h.icon} R{h.roundNumber || i + 1}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Bottom Sheet Winner Action Selection Modal (Step 1) */}
      <WinnerActionModal
        isOpen={fsmState === 'ACTION_SELECTED'}
        onClose={resetFSM}
        winnerPlayerId={selectedWinnerId}
      />

      {/* Tangkap Victim Selection Modal */}
      <TangkapModal
        isOpen={fsmState === 'MODAL_TANGKAP_VICTIM'}
        onClose={resetFSM}
        onSuccess={(round, actionType, winnerName) => {
          triggerUndoToast(round.roundNumber ?? 1, winnerName);
          setVictoryOverlayData({
            actionType,
            winnerName,
          });
        }}
      />

      {/* Manual Secondary Status Modal (Step 2 Bottom Sheet matching Image 3) */}
      <SecondaryStatusModal
        isOpen={fsmState === 'MODAL_MANUAL_STATUS'}
        onClose={resetFSM}
        onSuccess={(round, actionType, winnerName) => {
          // devlog/0006: roundNumber dari ronde yang baru di-commit (closure match = stale)
          triggerUndoToast(round.roundNumber ?? 1, winnerName);
          setVictoryOverlayData({
            actionType,
            winnerName,
          });
        }}
      />

      {/* Inline Player Name Edit Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Pencil className="w-4 h-4 text-cyan-400" /> UBAH NAMA PEMAIN
              </h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">NAMA PEMAIN BARU</label>
                <input
                  type="text"
                  value={newPlayerNameInput}
                  onChange={(e) => setNewPlayerNameInput(e.target.value)}
                  placeholder="Masukkan nama pemain..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-extrabold focus:outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                BATAL
              </button>
              <button
                onClick={handleSavePlayerName}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase"
              >
                SIMPAN NAMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mid-Game Target Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Settings className="w-4 h-4 text-cyan-400" /> UBAH TARGET MATCH
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
                <label className="block text-slate-400 font-bold mb-1 uppercase">TIPE TARGET MATCH</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('rounds');
                      setEditTargetValue(10);
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-xs ${
                      editMode === 'rounds'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    FIXED ROUNDS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('points');
                      setEditTargetValue(50);
                    }}
                    className={`p-2.5 rounded-xl border font-bold text-xs ${
                      editMode === 'points'
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    RACE TO POINTS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase">NILAI TARGET BARU</label>
                <input
                  type="number"
                  value={editTargetValue}
                  onChange={(e) => setEditTargetValue(e.target.value)}
                  min={1}
                  max={200}
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
                onClick={handleSaveTargetMidGame}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase"
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
