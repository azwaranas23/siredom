'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Player, TeamIdentifier } from '@/types/domino';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { TeamScoreHeader } from '@/components/wasit/TeamScoreHeader';
import { PenaltyModal } from '@/components/wasit/PenaltyModal';
import { OradoScoringModal } from '@/components/wasit/OradoScoringModal';
import { MatchFinishedModal } from '@/components/wasit/MatchFinishedModal';
import {
  RotateCcw,
  SlidersHorizontal,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Undo2,
  Settings,
  Lock,
  Pencil,
  AlertTriangle,
  AlertOctagon,
  Trophy,
  Calculator,
  Zap,
  Sparkles,
  WifiOff,
} from 'lucide-react';

const getSeatInfo = (seatNumber: number) => {
  switch (seatNumber) {
    case 1:
      return { border: 'border-rose-800/80 hover:border-rose-500', bg: 'bg-gradient-to-br from-rose-950/80 to-slate-900', scoreColor: 'text-rose-400' };
    case 2:
      return { border: 'border-blue-800/80 hover:border-blue-500', bg: 'bg-gradient-to-br from-blue-950/80 to-slate-900', scoreColor: 'text-blue-400' };
    case 3:
      return { border: 'border-emerald-800/80 hover:border-emerald-500', bg: 'bg-gradient-to-br from-emerald-950/80 to-slate-900', scoreColor: 'text-emerald-400' };
    case 4:
    default:
      return { border: 'border-amber-800/80 hover:border-amber-500', bg: 'bg-gradient-to-br from-amber-950/80 to-slate-900', scoreColor: 'text-amber-400' };
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

export default function WasitLivePage() {
  const {
    match,
    fsmState,
    selectedWinnerId,
    selectedAction,
    selectedVictimId,
    manualStatuses,
    tenantCode,
    tableNumber,
    syncStatus,
    setMatchFromDb,
    selectWinnerPlayer,
    selectWinnerAndAction,
    setManualPlayerStatus,
    selectTangkapVictim,
    resetFSM,
    commitCurrentRound,
    rollbackLastRound,
    applyFastPenalty,
    commitOradoRound,
    getTeamAScore,
    getTeamBScore,
    getRankedPlayers,
    getLast5RoundHistory,
    getWinstreak,
    updateTargetMidGame,
    updateSinglePlayerName,
    startNextSet,
    resetMatch,
  } = useScorerStore();

  const router = useRouter();
  const rankedPlayers = getRankedPlayers();
  const topWinnerId = rankedPlayers[0]?.id;

  // Floating Undo Toast State (4-second timer)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  // Single-Device Lock State
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockedDeviceId, setLockedDeviceId] = useState<string | null>(null);

  // Mid-Game Target Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState<'rounds' | 'points'>(match.matchMode || 'rounds');
  const [editTargetValue, setEditTargetValue] = useState<number | string>(match.targetValue || 10);

  // Inline Player Name Editor Modal State
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string } | null>(null);
  const [newPlayerNameInput, setNewPlayerNameInput] = useState('');

  // Modals for Penalty, ORADO Count & Finished Match
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isOradoModalOpen, setIsOradoModalOpen] = useState(false);
  const [oradoModalTeam, setOradoModalTeam] = useState<TeamIdentifier>('TEAM_A');
  const [isMatchFinishedModalOpen, setIsMatchFinishedModalOpen] = useState(false);

  // Victory Animation Overlay State
  const [victoryOverlayData, setVictoryOverlayData] = useState<{
    actionType: ActionType;
    winnerName: string;
    victimName?: string;
  } | null>(null);

  // Match Champion Winner Celebration Overlay State
  const [celebrationWinner, setCelebrationWinner] = useState<Player | null>(null);
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);

  // Calculate Team Scores
  const teamAScore = getTeamAScore();
  const teamBScore = getTeamBScore();

  // Single-Device Lock Check & Initial Match Load from DB
  useEffect(() => {
    let deviceId = localStorage.getItem('siredom_device_id');
    if (!deviceId) {
      deviceId = `dev-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('siredom_device_id', deviceId);
    }

    const acquireLockAndFetchMatch = async () => {
      try {
        const codeToUse = tenantCode || 'TAB-SLOWBAR';
        const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
        const getJson = await getRes.json();

        if (getJson.data && getJson.data.players) {
          setMatchFromDb(getJson.data);
        }

        if (getJson.tableInfo) {
          const { id: tableId, isLocked, activeDeviceId } = getJson.tableInfo;

          if (isLocked && activeDeviceId && activeDeviceId !== deviceId) {
            setIsLockedByOther(true);
            setLockedDeviceId(activeDeviceId);
            return;
          }

          // Lock table for this device
          await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'LOCK_TABLE',
              tableId,
              deviceId,
            }),
          });
        }
      } catch (err) {
        console.error('Failed to acquire session lock & fetch match:', err);
      }
    };

    acquireLockAndFetchMatch();
  }, [tenantCode, tableNumber, setMatchFromDb]);

  // Trigger Winner Celebration on Match Completion safely
  useEffect(() => {
    if (match.status === 'completed' && topWinnerId) {
      if (!celebrationWinner && !isCelebrationDismissed) {
        setCelebrationWinner(rankedPlayers[0]);
      }
    } else if (match.status !== 'completed') {
      setIsCelebrationDismissed(false);
      setCelebrationWinner(null);
    }
  }, [match.status, topWinnerId, isCelebrationDismissed]);

  // Handle Toast Trigger
  const triggerUndoToast = (roundNum: number, winnerName: string) => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(`Ronde #${roundNum} Tersimpan (${winnerName})`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    setToastTimer(timer);
  };

  // Helper for Auto-Committing Action-Based FSM Round
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

  // Handle Fast Penalty (PB PORDI)
  const handleApplyPenalty = async (offenderPlayerId: string, amount: 1 | 4) => {
    const roundNumBefore = match.rounds.length + 1;
    const committedRound = await applyFastPenalty(offenderPlayerId, amount);

    if (committedRound) {
      triggerUndoToast(roundNumBefore, `Denda +${amount}`);
    }
  };

  // Handle ORADO Count Round Commit
  const handleCommitOradoRound = async (
    winnerTeam: TeamIdentifier,
    winnerPlayerId: string,
    rawRemainingPoints: number,
    multipliers: { duaUjung: boolean; balakHabis: boolean; macetBeradu: boolean }
  ) => {
    const roundNumBefore = match.rounds.length + 1;
    const winnerObj = match.players.find((p) => p.id === winnerPlayerId);
    const winnerName = winnerObj?.name || (winnerTeam === 'TEAM_A' ? 'Tim A' : 'Tim B');

    const committedRound = await commitOradoRound(winnerTeam, winnerPlayerId, rawRemainingPoints, multipliers);

    if (committedRound) {
      triggerUndoToast(roundNumBefore, winnerName);
    }
  };

  // Undo Last Round Action
  const handleUndo = async () => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(null);
    await rollbackLastRound();
  };

  // Mid-Game Target Update Handler
  const handleSaveTargetMidGame = async () => {
    const val = Number(editTargetValue) || (editMode === 'rounds' ? 10 : 50);
    updateTargetMidGame(editMode, val);
    setIsSettingsOpen(false);

    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
      const getJson = await getRes.json();

      if (getJson.data?.id) {
        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_TARGET',
            matchId: getJson.data.id,
            updateTargetData: {
              matchMode: editMode,
              targetValue: val,
            },
          }),
        });
      }
    } catch (err) {
      console.error('Failed to update target in DB:', err);
    }
  };

  // Inline Player Name Save Handler
  const handleSavePlayerName = async () => {
    if (!editingPlayer || !newPlayerNameInput.trim()) return;
    const cleanName = newPlayerNameInput.trim();
    updateSinglePlayerName(editingPlayer.id, cleanName);
    setEditingPlayer(null);

    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
      const getJson = await getRes.json();

      if (getJson.data?.id) {
        const updatedPlayersList = match.players.map((p) =>
          p.id === editingPlayer.id ? { seatNumber: p.seatNumber, name: cleanName } : { seatNumber: p.seatNumber, name: p.name }
        );

        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SETUP_MATCH',
            matchId: getJson.data.id,
            setupData: {
              rulesetMode: match.rulesetMode,
              matchCategory: match.matchCategory,
              matchMode: match.matchMode,
              targetValue: match.targetValue,
              pointsConfig: match.pointsConfig,
              players: updatedPlayersList,
            },
          }),
        });
      }
    } catch (err) {
      console.error('Failed to update player name in DB:', err);
    }
  };

  // Order players strictly by seatNumber 1..4
  const seatOrderedPlayers = [...match.players].sort((a, b) => a.seatNumber - b.seatNumber);
  const displayPlayers: Player[] =
    seatOrderedPlayers.length === 4
      ? seatOrderedPlayers
      : [
          { id: `t${tableNumber}-p1`, seatNumber: 1, name: 'Pemain 1', currentScore: 0, teamIdentifier: 'TEAM_A' },
          { id: `t${tableNumber}-p2`, seatNumber: 2, name: 'Pemain 2', currentScore: 0, teamIdentifier: 'TEAM_B' },
          { id: `t${tableNumber}-p3`, seatNumber: 3, name: 'Pemain 3', currentScore: 0, teamIdentifier: 'TEAM_A' },
          { id: `t${tableNumber}-p4`, seatNumber: 4, name: 'Pemain 4', currentScore: 0, teamIdentifier: 'TEAM_B' },
        ];

  const nextRoundNumber = match.rounds.length + 1;

  // PB ORADO Round Opener helper
  const getOradoOpenerText = (roundNum: number) => {
    if (roundNum === 1) return 'Balak 0';
    const seq = [1, 2, 3, 4, 5, 6, 0];
    const idx = (roundNum - 2) % 7;
    return `Balak ${seq[idx]}`;
  };

  // Check Overtime Tie-Breaker Condition
  const isRank1Tied =
    rankedPlayers.length >= 2 &&
    rankedPlayers[0].currentScore > 0 &&
    rankedPlayers[0].currentScore === rankedPlayers[1].currentScore;

  const isOvertime =
    match.matchMode === 'rounds'
      ? match.rounds.length >= match.targetValue && isRank1Tied
      : rankedPlayers.some((p) => p.currentScore >= match.targetValue) && isRank1Tied;

  const selectedWinnerObj = displayPlayers.find((p) => p.id === selectedWinnerId);

  if (isLockedByOther) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-slate-900 border border-rose-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl font-mono">
        <Lock className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-black text-white uppercase">MEJA #{tableNumber} TERKUNCI</h2>
        <p className="text-xs text-slate-400">
          Meja ini sedang diakses oleh perangkat wasit lain (ID: <span className="text-rose-400 font-bold">{lockedDeviceId?.slice(0, 8)}...</span>).
        </p>
        <div className="pt-2">
          <button
            onClick={async () => {
              let deviceId = localStorage.getItem('siredom_device_id');
              if (!deviceId) {
                deviceId = `dev-${Math.random().toString(36).substring(2, 9)}`;
                localStorage.setItem('siredom_device_id', deviceId);
              }
              try {
                const codeToUse = tenantCode || 'TAB-SLOWBAR';
                const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
                const getJson = await getRes.json();
                if (getJson.tableInfo?.id) {
                  await fetch('/api/matches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'LOCK_TABLE',
                      tableId: getJson.tableInfo.id,
                      deviceId,
                    }),
                  });
                }
              } catch (err) {
                console.error('Failed to override lock:', err);
              }
              setIsLockedByOther(false);
            }}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-lg"
          >
            AMBIL ALIH MEJA ➔
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-57px)] overflow-hidden select-none bg-slate-950 text-white flex flex-col justify-between font-sans relative">
      {/* Offline Pending Sync Banner */}
      {syncStatus === 'OFFLINE_PENDING' && (
        <div className="bg-amber-950/90 border-b border-amber-800 text-amber-300 px-4 py-1 text-center text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Koneksi lambat - Menyimpan di perangkat...</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between font-mono text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
              MEJA #{tableNumber}
            </span>
            <span className="font-extrabold text-white text-xs">
              RONDE #{nextRoundNumber}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span>RULESET: <strong className="text-cyan-400 uppercase">{match.rulesetMode || 'CASUAL'}</strong></span>
            <span>•</span>
            <span>KATEGORI: <strong className="text-emerald-400 uppercase">{match.matchCategory === 'TEAM_2V2' ? 'GANDA (2v2)' : 'TUNGGAL'}</strong></span>
          </div>

          {/* PB ORADO Opener Badge */}
          {match.rulesetMode === 'PB_ORADO' && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-400" /> BUKA: <strong>{getOradoOpenerText(nextRoundNumber)}</strong>
            </span>
          )}

          {/* Overtime Badge Indicator */}
          {isOvertime && (
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500 animate-pulse">
              ⚡ OVERTIME
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* PB PORDI Rapid Penalty Buttons */}
          {match.rulesetMode === 'PB_PORDI' && (
            <button
              onClick={() => setIsPenaltyModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors flex items-center gap-1 text-[11px] font-bold"
              title="Panel Denda Wasit"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>+1/+4 DENDA</span>
            </button>
          )}

          {/* PB ORADO Count Button */}
          {match.rulesetMode === 'PB_ORADO' && (
            <button
              onClick={() => setIsOradoModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[11px] uppercase flex items-center gap-1 shadow-md"
            >
              <Calculator className="w-3.5 h-3.5 text-purple-200" />
              <span>INPUT HITUNGAN</span>
            </button>
          )}

          {/* Target Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px]"
            title="Ubah Target Match"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Team 2v2 Aggregate Header Bar */}
      {match.matchCategory === 'TEAM_2V2' && (
        <TeamScoreHeader
          rulesetMode={match.rulesetMode || 'CASUAL'}
          matchCategory={match.matchCategory}
          teamAScore={teamAScore}
          teamBScore={teamBScore}
          targetValue={match.targetValue}
          currentSet={match.currentSet || 1}
          teamASetWins={match.teamASetWins || 0}
          teamBSetWins={match.teamBSetWins || 0}
          players={displayPlayers}
        />
      )}

      {/* MAIN CONTENT AREA */}
      {match.status === 'setup' || !match.players || match.players.length === 0 ? (
        /* Setup Warning Card */
        <div className="flex-1 flex items-center justify-center p-6 font-mono relative">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-lg w-full p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/60 mx-auto flex items-center justify-center text-3xl animate-bounce">
              ⚠️
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display">MEJA #{tableNumber} BELUM DI-SETUP!</h2>
              <p className="text-xs text-slate-300 mt-2">
                Silakan atur nama 4 pemain dan aturan pertandingan terlebih dahulu.
              </p>
            </div>
            <button
              onClick={() => router.push('/wasit/setup')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase shadow-lg flex items-center justify-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" /> SETUP MEJA SEKARANG ➔
            </button>
          </div>
        </div>
      ) : match.matchCategory === 'TEAM_2V2' ? (
        /* 2 KUADRAN TIM (TIM MERAH VS TIM BIRU) */
        <div
          className={`flex-1 p-3 grid grid-cols-1 md:grid-cols-2 gap-4 relative font-mono ${
            celebrationWinner || victoryOverlayData ? 'pointer-events-none' : ''
          }`}
        >
          {/* KUADRAN TIM A (MERAH & HIJAU) */}
          <div
            onClick={() => {
              if (fsmState === 'IDLE' && match.rulesetMode !== 'PB_ORADO') {
                const p1 = displayPlayers.find((p) => p.seatNumber === 1);
                if (p1) selectWinnerPlayer(p1.id);
              } else if (match.rulesetMode === 'PB_ORADO') {
                setIsOradoModalOpen(true);
              }
            }}
            className="rounded-3xl border-2 border-rose-800/90 hover:border-rose-500 bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 p-6 shadow-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-700 shadow-md">
                🔴 TIM A (MERAH & HIJAU)
              </span>
              <span className="text-xs font-bold text-slate-400">
                SET WINS: <strong className="text-rose-400 font-mono text-sm">{match.teamASetWins || 0}</strong>
              </span>
            </div>

            <div className="my-auto py-4 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-rose-400">
                  {teamAScore}
                </span>
                <span className="text-sm font-black font-mono text-slate-400 uppercase">POIN AGREGAT</span>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-bold border-t border-rose-900/40">
                {displayPlayers.filter((p) => p.seatNumber === 1 || p.seatNumber === 3).map((p) => (
                  <div key={p.id} className="bg-slate-950/80 border border-rose-900/60 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-white truncate font-display">{p.name} (K#{p.seatNumber})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer({ id: p.id, name: p.name });
                        setNewPlayerNameInput(p.name);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-rose-900/50 pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">HISTORY TIM A:</span>
              {getLast5RoundHistory(displayPlayers.find((p) => p.seatNumber === 1)?.id || '').map((h, i) => (
                <span key={i} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 ${h.statusClass}`}>
                  {h.icon} R{h.roundNumber}
                </span>
              ))}
            </div>
          </div>

          {/* KUADRAN TIM B (BIRU & KUNING) */}
          <div
            onClick={() => {
              if (fsmState === 'IDLE' && match.rulesetMode !== 'PB_ORADO') {
                const p2 = displayPlayers.find((p) => p.seatNumber === 2);
                if (p2) selectWinnerPlayer(p2.id);
              } else if (match.rulesetMode === 'PB_ORADO') {
                setIsOradoModalOpen(true);
              }
            }}
            className="rounded-3xl border-2 border-blue-800/90 hover:border-blue-500 bg-gradient-to-br from-blue-950/90 via-slate-900 to-slate-950 p-6 shadow-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-blue-950 text-blue-300 border border-blue-700 shadow-md">
                🔵 TIM B (BIRU & KUNING)
              </span>
              <span className="text-xs font-bold text-slate-400">
                SET WINS: <strong className="text-blue-400 font-mono text-sm">{match.teamBSetWins || 0}</strong>
              </span>
            </div>

            <div className="my-auto py-4 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-blue-400">
                  {teamBScore}
                </span>
                <span className="text-sm font-black font-mono text-slate-400 uppercase">POIN AGREGAT</span>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-bold border-t border-blue-900/40">
                {displayPlayers.filter((p) => p.seatNumber === 2 || p.seatNumber === 4).map((p) => (
                  <div key={p.id} className="bg-slate-950/80 border border-blue-900/60 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="text-white truncate font-display">{p.name} (K#{p.seatNumber})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer({ id: p.id, name: p.name });
                        setNewPlayerNameInput(p.name);
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-blue-900/50 pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">HISTORY TIM B:</span>
              {getLast5RoundHistory(displayPlayers.find((p) => p.seatNumber === 2)?.id || '').map((h, i) => (
                <span key={i} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 ${h.statusClass}`}>
                  {h.icon} R{h.roundNumber}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 4 KUADRAN INDIVIDU (1V1V1V1) */
        <div
          className={`flex-1 p-3 grid grid-cols-2 grid-rows-2 gap-3 relative ${
            celebrationWinner || victoryOverlayData ? 'pointer-events-none' : ''
          }`}
        >
          {displayPlayers.map((player) => {
            const dynamicRank = rankedPlayers.find((rp) => rp.id === player.id)?.rank || player.seatNumber;
            const seatObj = getSeatInfo(player.seatNumber);
            const rankObj = getRankInfo(dynamicRank);
            const historyList = getLast5RoundHistory(player.id);
            const winstreak = getWinstreak(player.id);

            const isTeam = match.matchCategory === 'TEAM_2V2';
            const teamLabel = isTeam ? (player.seatNumber % 2 === 1 ? 'TIM A' : 'TIM B') : null;

            return (
              <div
                key={player.id}
                onClick={() => {
                  if (fsmState === 'IDLE' && match.rulesetMode !== 'PB_ORADO') {
                    selectWinnerPlayer(player.id);
                  } else if (match.rulesetMode === 'PB_ORADO') {
                    setIsOradoModalOpen(true);
                  }
                }}
                className={`rounded-2xl border ${seatObj.border} ${seatObj.bg} p-4 shadow-xl flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group`}
              >
                {/* Top Row: Seat, Rank & Team Badge + Pencil Edit */}
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${rankObj.badgeBg}`}>
                      {rankObj.emoji} #{dynamicRank}
                    </span>

                    {teamLabel && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                        teamLabel === 'TIM A' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {teamLabel}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-bold">K#{player.seatNumber}</span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer({ id: player.id, name: player.name });
                        setNewPlayerNameInput(player.name);
                      }}
                      className="p-1 rounded bg-slate-900/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
                      title="Ubah Nama Pemain"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Winstreak Badge */}
                  {winstreak >= 3 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-950 text-amber-300 border-amber-400 animate-pulse">
                      🔥 {winstreak}x STREAK
                    </span>
                  )}
                </div>

                {/* Center Row: Player Name & Score */}
                <div className="my-auto py-2">
                  <h2 className="text-lg sm:text-2xl font-black text-white truncate font-display tracking-tight flex items-center justify-between">
                    <span>{player.name}</span>
                  </h2>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-3xl sm:text-5xl font-black font-mono tracking-tight ${seatObj.scoreColor}`}>
                      {player.currentScore}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-500 uppercase">POIN</span>
                  </div>
                </div>

                {/* Bottom Row: 5-Round History Strip */}
                <div className="border-t border-slate-800/80 pt-2 flex items-center gap-1.5 overflow-x-auto font-mono scrollbar-none">
                  <span className="text-[9px] text-slate-500 uppercase font-bold shrink-0">5 RONDE:</span>
                  {historyList.length === 0 ? (
                    <span className="text-[10px] text-slate-600 font-semibold italic">Belum ada ronde</span>
                  ) : (
                    historyList.map((h, i) => (
                      <span
                        key={i}
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 ${h.statusClass}`}
                      >
                        {h.icon} R{h.roundNumber}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SET VICTORY / WINNER ACTION MODAL (KHUSUS KATEGORI GANDA 2V2 PADA 101 POIN ATAU COMPLETE) */}
      {match.matchCategory === 'TEAM_2V2' && (teamAScore >= 101 || teamBScore >= 101 || match.status === 'completed') && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 font-mono text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/80 mx-auto flex items-center justify-center text-4xl animate-bounce shadow-xl">
              👑
            </div>

            <div>
              <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">
                {match.status === 'completed'
                  ? `JUARA MATCH: ${teamAScore > teamBScore ? 'TIM A (MERAH & HIJAU)' : 'TIM B (BIRU & KUNING)'}`
                  : `PEMENANG SET #${match.currentSet || 1}: ${teamAScore >= 101 ? 'TIM A (MERAH & HIJAU)' : 'TIM B (BIRU & KUNING)'}`}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                SKOR SET: <span className="text-rose-400 font-extrabold">{teamAScore} POIN</span> (TIM A) vs{' '}
                <span className="text-blue-400 font-extrabold">{teamBScore} POIN</span> (TIM B)
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-around text-xs">
              <div>
                <span className="text-slate-500 font-bold block uppercase">KEMENANGAN SET TIM A</span>
                <span className="text-lg font-black text-rose-400">{match.teamASetWins || 0} SET</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-slate-500 font-bold block uppercase">KEMENANGAN SET TIM B</span>
                <span className="text-lg font-black text-blue-400">{match.teamBSetWins || 0} SET</span>
              </div>
            </div>

            <div className="pt-2 font-mono">
              {match.status === 'completed' ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* Button 1: LIHAT HASIL */}
                  <button
                    type="button"
                    onClick={() => setIsMatchFinishedModalOpen(true)}
                    className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" /> LIHAT HASIL
                  </button>

                  {/* Button 2: ULANGI MATCH */}
                  <button
                    type="button"
                    onClick={async () => {
                      resetMatch();
                      try {
                        const codeToUse = tenantCode || 'TAB-SLOWBAR';
                        const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
                        const getJson = await getRes.json();

                        if (getJson.data?.id) {
                          const formattedPlayers = displayPlayers.map((p) => ({
                            seatNumber: p.seatNumber,
                            name: p.name,
                          }));

                          await fetch('/api/matches', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'SETUP_MATCH',
                              matchId: getJson.data.id,
                              tenantCode: codeToUse,
                              tableNumber,
                              setupData: {
                                rulesetMode: match.rulesetMode,
                                matchCategory: match.matchCategory,
                                matchMode: match.matchMode,
                                targetType: match.targetType,
                                targetValue: match.targetValue,
                                pointsConfig: match.pointsConfig,
                                rulesConfig: match.rulesConfig,
                                players: formattedPlayers,
                              },
                            }),
                          });
                        }
                      } catch (err) {
                        console.error('Failed to reset match in DB:', err);
                      }
                    }}
                    className="py-3.5 px-4 rounded-2xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-300 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> ULANGI MATCH
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    startNextSet();
                    try {
                      const codeToUse = tenantCode || 'TAB-SLOWBAR';
                      const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
                      const getJson = await getRes.json();

                      if (getJson.data?.id) {
                        await fetch('/api/matches', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'COMMIT_ROUND',
                            matchId: getJson.data.id,
                            roundData: {
                              roundNumber: match.rounds.length + 1,
                              setNumber: (match.currentSet || 1) + 1,
                              actionType: 'start_next_set',
                              currentSet: (match.currentSet || 1) + 1,
                              teamASetWins: match.teamASetWins,
                              teamBSetWins: match.teamBSetWins,
                              matchStatus: 'in_progress',
                            },
                          }),
                        });
                      }
                    } catch (err) {
                      console.error('Failed to sync next set to DB:', err);
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:from-purple-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" /> LANJUT KE SET BERIKUTNYA (SET #{(match.currentSet || 1) + 1}) ➔
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Undo Toast (4-Second Timer) */}
      {toastMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-cyan-500/80 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 font-mono text-xs animate-in slide-in-from-bottom duration-200">
          <span className="flex items-center gap-2 font-bold text-cyan-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </span>
          <button
            onClick={handleUndo}
            className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1 transition-all active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5" /> URUNGKAN
          </button>
        </div>
      )}

      {/* Victory Animation Overlay */}
      {victoryOverlayData && (
        <VictoryAnimationOverlay
          actionType={victoryOverlayData.actionType}
          winnerName={victoryOverlayData.winnerName}
          victimName={victoryOverlayData.victimName}
          onComplete={() => setVictoryOverlayData(null)}
        />
      )}

      {/* Penalty Modal for PB PORDI */}
      <PenaltyModal
        isOpen={isPenaltyModalOpen}
        onClose={() => setIsPenaltyModalOpen(false)}
        players={displayPlayers}
        matchCategory={match.matchCategory}
        onApplyPenalty={handleApplyPenalty}
      />

      {/* ORADO Scoring Modal */}
      <OradoScoringModal
        isOpen={isOradoModalOpen}
        onClose={() => setIsOradoModalOpen(false)}
        players={displayPlayers}
        defaultSelectedTeam={oradoModalTeam}
        onCommitOrado={handleCommitOradoRound}
      />

      {/* Match Finished Summary Modal */}
      <MatchFinishedModal
        isOpen={isMatchFinishedModalOpen || (match.matchCategory === 'SINGLE_1V1V1V1' && match.status === 'completed')}
        onClose={() => setIsMatchFinishedModalOpen(false)}
      />

      {/* BOTTOM SHEET MODAL DRAWER for Action-based FSM */}
      {fsmState !== 'IDLE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-5xl bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 sm:p-6 shadow-2xl space-y-4 font-mono animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2 font-display">
                PILIH KEMENANGAN <span className="text-cyan-400 font-extrabold">{selectedWinnerObj?.name || 'PEMAIN'}</span>
              </h3>
              <button
                onClick={resetFSM}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Dynamic Action Cards by Ruleset Mode */}
            {selectedWinnerId && fsmState === 'CONFIRMATION' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(match.rulesetMode === 'PB_PORDI'
                    ? [
                        { action: 'MENANG_BIASA', label: 'DOMI BIASA (+1)', emoji: '👑' },
                        { action: 'KANDANG', label: 'DOMI BALAK (+2)', emoji: '🀄' },
                        { action: 'CEKI', label: 'CEKI BIASA (+2)', emoji: '✅' },
                        { action: 'CEKI_BALAK', label: 'CEKI HABIS (+3)', emoji: '🌟' },
                        { action: 'PALANG', label: 'APOLLO (+4)', emoji: '🐐' },
                      ]
                    : [
                        { action: 'MENANG_BIASA', label: 'MENANG BIASA (+1)', emoji: '👑' },
                        { action: 'KANDANG', label: 'KANDANG (+2)', emoji: '🔥' },
                        { action: 'CEKI', label: 'CEKI (+3)', emoji: '✅' },
                        { action: 'PALANG', label: 'PALANG (+4)', emoji: '🐐' },
                        { action: 'TANGKAP', label: 'TANGKAP (+3)', emoji: '🚓' },
                      ]
                  ).map((item) => (
                    <button
                      key={item.action}
                      onClick={() => {
                        if (item.action === 'KANDANG') {
                          selectWinnerAndAction(selectedWinnerId, 'KANDANG');
                          handleAutoCommit();
                        } else if (item.action === 'TANGKAP') {
                          selectWinnerAndAction(selectedWinnerId, 'TANGKAP');
                        } else {
                          selectWinnerAndAction(selectedWinnerId, item.action as ActionType);
                        }
                      }}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500 flex flex-col items-center justify-center text-center transition-all hover:scale-105 active:scale-95 group cursor-pointer"
                    >
                      <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">{item.emoji}</span>
                      <span className="text-xs font-black text-white uppercase block tracking-wider">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Penalty Row for PB_PORDI */}
                {match.rulesetMode === 'PB_PORDI' && (
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-3 font-mono">
                    <span className="text-xs text-slate-400 font-bold uppercase">WASIT QUICK DENDA:</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetFSM();
                        handleApplyPenalty(selectedWinnerId, 1);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-black uppercase cursor-pointer"
                    >
                      +1 DENDA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFSM();
                        handleApplyPenalty(selectedWinnerId, 4);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-black uppercase cursor-pointer"
                    >
                      +4 DENDA PASSED
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Tangkap Victim Selector */}
            {fsmState === 'MODAL_TANGKAP_VICTIM' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Pilih pemain yang menjadi korban Tangkap (💀 Ditangkap):</p>
                <div className="grid grid-cols-3 gap-3">
                  {displayPlayers
                    .filter((p) => p.id !== selectedWinnerId)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          selectTangkapVictim(p.id);
                          handleAutoCommit();
                        }}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-rose-900 hover:border-rose-500 text-left transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <span className="text-xs font-black text-rose-400 block truncate">💀 {p.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Kursi #{p.seatNumber}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Step 3: Secondary Status Selector */}
            {fsmState === 'MODAL_MANUAL_STATUS' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Atur status 3 pemain lainnya:</p>
                <div className="flex flex-col gap-2.5">
                  {displayPlayers
                    .filter((p) => p.id !== selectedWinnerId)
                    .map((p) => {
                      const st = manualStatuses[p.id] || 'duduk';
                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                              KURSI #{p.seatNumber}
                            </span>
                            <span className="text-xs font-bold text-white truncate font-mono">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setManualPlayerStatus(p.id, 'duduk')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono transition-all ${
                                st === 'duduk'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : 'bg-slate-900 text-slate-500 hover:text-white'
                              }`}
                            >
                              🪑 DUDUK
                            </button>
                            <button
                              type="button"
                              onClick={() => setManualPlayerStatus(p.id, 'berdiri')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono transition-all ${
                                st === 'berdiri'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-slate-900 text-slate-500 hover:text-white'
                              }`}
                            >
                              😭 BERDIRI
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleAutoCommit()}
                    className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                  >
                    KONFIRMASI & SIMPAN RONDE ➔
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
