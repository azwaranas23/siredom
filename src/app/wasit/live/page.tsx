'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Player } from '@/types/domino';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { MatchFinishedModal } from '@/components/wasit/MatchFinishedModal';
import {
  Crown,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Undo2,
  Settings,
  Lock,
  ChevronRight,
  Sparkles,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

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
    setMatchFromDb,
    selectWinnerPlayer,
    selectWinnerAndAction,
    setManualPlayerStatus,
    selectTangkapVictim,
    resetFSM,
    commitCurrentRound,
    rollbackLastRound,
    getRankedPlayers,
    getLast5RoundHistory,
    getWinstreak,
    updateTargetMidGame,
    updateSinglePlayerName,
  } = useScorerStore();

  const router = useRouter();
  const rankedPlayers = getRankedPlayers();
  const topWinnerId = rankedPlayers[0]?.id;

  const [isPending, startTransition] = useTransition();

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

  // Victory Animation Overlay State (using VictoryAnimationOverlay.tsx component)
  const [victoryOverlayData, setVictoryOverlayData] = useState<{
    actionType: ActionType;
    winnerName: string;
    victimName?: string;
  } | null>(null);

  // Match Champion Winner Celebration Overlay State
  const [celebrationWinner, setCelebrationWinner] = useState<Player | null>(null);
  const [isCelebrationDismissed, setIsCelebrationDismissed] = useState(false);

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
          // Preserve player scores & rounds from DB without resetting to 0
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

  // Trigger Winner Celebration on Match Completion safely without infinite re-render loop
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
    setToastMessage(`Ronde #${roundNum} Tersimpan`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    setToastTimer(timer);
  };

  // Helper for Auto-Committing to Zustand Store + Database API
  const handleAutoCommit = async () => {
    const roundNumBefore = match.rounds.length + 1;
    const winnerObj = match.players.find((p) => p.id === selectedWinnerId);
    const victimObj = match.players.find((p) => p.id === selectedVictimId);
    const winnerName = winnerObj?.name || 'Pemain';
    const victimName = victimObj?.name;

    const committedRound = commitCurrentRound();

    if (committedRound) {
      triggerUndoToast(roundNumBefore, winnerName);
      setVictoryOverlayData({
        actionType: committedRound.actionType,
        winnerName,
        victimName,
      });

      // Save round directly to Supabase PostgreSQL database
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
                roundNumber: committedRound.roundNumber,
                actionType: committedRound.actionType,
                winnerPlayerId: committedRound.winnerPlayerId,
                victimPlayerId: committedRound.victimPlayerId,
                playerScores: committedRound.scores,
              },
            }),
          });
        }
      } catch (err) {
        console.error('Failed to commit round to DB:', err);
      }
    }
  };

  // Undo Last Round Action
  const handleUndo = async () => {
    if (toastTimer) clearTimeout(toastTimer);
    setToastMessage(null);
    rollbackLastRound();

    try {
      const codeToUse = tenantCode || 'TAB-SLOWBAR';
      const getRes = await fetch(`/api/matches?tenantCode=${codeToUse}&tableNumber=${tableNumber}`);
      const getJson = await getRes.json();

      if (getJson.data?.id) {
        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ROLLBACK',
            matchId: getJson.data.id,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to rollback DB:', err);
    }
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

    // Save updated player names to database API
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

  // Order players STRICTLY by seatNumber (1, 2, 3, 4) so positions NEVER swap on score change!
  const seatOrderedPlayers = [...match.players].sort((a, b) => a.seatNumber - b.seatNumber);
  const displayPlayers: Player[] =
    seatOrderedPlayers.length === 4
      ? seatOrderedPlayers
      : [
          { id: `t${tableNumber}-p1`, seatNumber: 1, name: 'Pemain 1', currentScore: 0 },
          { id: `t${tableNumber}-p2`, seatNumber: 2, name: 'Pemain 2', currentScore: 0 },
          { id: `t${tableNumber}-p3`, seatNumber: 3, name: 'Pemain 3', currentScore: 0 },
          { id: `t${tableNumber}-p4`, seatNumber: 4, name: 'Pemain 4', currentScore: 0 },
        ];

  const nextRoundNumber = match.rounds.length + 1;

  // Check Overtime Tie-Breaker Condition
  const isRank1Tied =
    rankedPlayers.length >= 2 &&
    rankedPlayers[0].currentScore > 0 &&
    rankedPlayers[0].currentScore === rankedPlayers[1].currentScore;

  const isOvertime =
    match.matchMode === 'rounds'
      ? match.rounds.length >= match.targetValue && isRank1Tied
      : rankedPlayers.some((p) => p.currentScore >= match.targetValue) && isRank1Tied;

  // Selected Winner Player Object
  const selectedWinnerObj = displayPlayers.find((p) => p.id === selectedWinnerId);

  if (isLockedByOther) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-slate-900 border border-rose-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl font-mono">
        <Lock className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-black text-white uppercase">MEJA #{tableNumber} TERKUNCI</h2>
        <p className="text-xs text-slate-400">
          Meja ini sedang diakses oleh perangkat wasit lain (Perangkat ID: <span className="text-rose-400 font-bold">{lockedDeviceId?.slice(0, 8)}...</span>).
        </p>
        <p className="text-[11px] text-slate-500">
          Untuk mencegah tumpang tindih data, hanya 1 perangkat yang diperbolehkan menginput skor Meja ini secara bersamaan. Jika ini adalah sesi Anda, klik tombol di bawah untuk merebut akses.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
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
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase shadow-lg shadow-cyan-500/20"
          >
            AMBIL ALIH / REBUT AKSES MEJA ➔
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-57px)] overflow-hidden select-none bg-slate-950 text-white flex flex-col justify-between font-sans relative">
      {/* Top Header Controls Bar */}
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
            <span>MODE: <strong className="text-cyan-400 uppercase">{match.matchMode}</strong></span>
            <span>•</span>
            <span>TARGET: <strong className="text-amber-400">{match.targetValue} {match.matchMode === 'rounds' ? 'RONDE' : 'POIN'}</strong></span>
          </div>

          {/* Overtime Badge Indicator */}
          {isOvertime && (
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500 animate-pulse">
              ⚡ PERPANJANGAN RONDE (OVERTIME)
            </span>
          )}

          {/* Table Not Setup Warning Badge */}
          {(match.status === 'setup' || !match.players || match.players.length === 0) && (
            <button
              onClick={() => router.push('/wasit/setup')}
              className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500 animate-pulse flex items-center gap-1 hover:bg-amber-900 transition-colors"
              title="Meja belum di-setup! Klik untuk setup meja"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" /> MEJA BELUM DI-SETUP (SETUP SEKARANG)
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mid-Game Target Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center gap-1 text-[11px]"
            title="Ubah Target Match Mid-Game"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-bold">UBAH TARGET</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {match.status === 'setup' || !match.players || match.players.length === 0 ? (
        /* Clean Centered Setup Card when Table is Not Setup */
        <div className="flex-1 flex items-center justify-center p-6 font-mono relative">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 relative overflow-hidden">
            {/* Top Ambient Glow */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/60 mx-auto flex items-center justify-center text-3xl shadow-inner animate-bounce">
              ⚠️
            </div>

            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest px-3 py-1 rounded-full bg-amber-950 border border-amber-800">
                PEMBERITAHUAN WASIT MEJA
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-3 font-display tracking-tight">
                MEJA #{tableNumber} BELUM DI-SETUP!
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Pertandingan pada <strong className="text-cyan-400">{tenantCode || 'MEJA'} • MEJA #{tableNumber}</strong> belum dikonfigurasi. Silakan atur nama 4 pemain fisik dan target nilai pertandingan terlebih dahulu.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push('/wasit/setup')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" /> SETUP MEJA SEKARANG ➔
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2x2 Quadrant Player Grid (STRICTLY FIXED BY SEAT NUMBER 1..4) */
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

            return (
              <div
                key={player.id}
                onClick={() => {
                  if (fsmState === 'IDLE') {
                    selectWinnerPlayer(player.id);
                  }
                }}
                className={`rounded-2xl border ${seatObj.border} ${seatObj.bg} p-4 shadow-xl flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group`}
              >
                {/* Top Row: Seat & Rank Badge + Inline Edit Pencil Button + Winstreak */}
                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border ${rankObj.badgeBg}`}>
                      {rankObj.emoji} #{dynamicRank}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">KURSI #{player.seatNumber}</span>

                    {/* Inline Pencil Button to Edit Player Name */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlayer({ id: player.id, name: player.name });
                        setNewPlayerNameInput(player.name);
                      }}
                      className="p-1 rounded bg-slate-900/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
                      title="Ubah Nama Pemain Ini"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Winstreak Badge */}
                  {winstreak >= 3 && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border animate-pulse ${
                        winstreak >= 10
                          ? 'bg-amber-950 text-amber-300 border-amber-400'
                          : winstreak >= 5
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-400'
                          : 'bg-orange-950 text-orange-300 border-orange-500'
                      }`}
                    >
                      🔥 {winstreak}x STREAK
                    </span>
                  )}
                </div>

                {/* Center Row: Player Name & Giant Current Score */}
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
                        title={`Ronde: ${h.label}`}
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

      {/* Victory Animation Overlay with Duolingo-style Confetti Physics */}
      {victoryOverlayData && (
        <VictoryAnimationOverlay
          actionType={victoryOverlayData.actionType}
          winnerName={victoryOverlayData.winnerName}
          victimName={victoryOverlayData.victimName}
          onComplete={() => setVictoryOverlayData(null)}
        />
      )}

      {/* BOTTOM SHEET MODAL DRAWER (Anchored at bottom-0, matching Screenshot 5) */}
      {fsmState !== 'IDLE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-5xl bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 sm:p-6 shadow-2xl space-y-4 font-mono animate-in slide-in-from-bottom duration-200">
            {/* Header: Title & Close Button */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase flex items-center gap-2 font-display">
                PILIH KEMENANGAN <span className="text-cyan-400 font-extrabold">{selectedWinnerObj?.name || 'PEMAIN'}</span>
              </h3>
              <button
                onClick={resetFSM}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Step 1: 5 Action Selection Cards in 1 Row (Confirmaction Step) */}
            {selectedWinnerId && fsmState === 'CONFIRMATION' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { action: 'menang_biasa', label: 'MENANG BIASA', emoji: '👑', desc: 'Poin Standar' },
                  { action: 'kandang', label: 'KANDANG', emoji: '🔥', desc: 'Auto-Assign Berdiri' },
                  { action: 'ceki', label: 'CEKI', emoji: '✅', desc: 'Ceki Domino' },
                  { action: 'palang', label: 'PALANG', emoji: '🐐', desc: 'Palang Domino' },
                  { action: 'tangkap', label: 'TANGKAP', emoji: '🚓', desc: 'Pilih Korban' },
                ].map((item) => (
                  <button
                    key={item.action}
                    onClick={() => {
                      if (item.action === 'kandang') {
                        // Scenario C: Auto-commit immediately!
                        selectWinnerAndAction(selectedWinnerId, 'kandang');
                        handleAutoCommit();
                      } else if (item.action === 'tangkap') {
                        selectWinnerAndAction(selectedWinnerId, 'tangkap');
                      } else {
                        selectWinnerAndAction(selectedWinnerId, item.action as ActionType);
                      }
                    }}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500 flex flex-col items-center justify-center text-center transition-all hover:scale-105 active:scale-95 group"
                  >
                    <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">{item.emoji}</span>
                    <span className="text-xs font-black text-white uppercase block tracking-wider">{item.label}</span>
                  </button>
                ))}
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
                          // Scenario B: Auto-commit immediately after selecting victim!
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

            {/* Step 3: Secondary Player Status Selector (VERTICAL STACK TOP-TO-BOTTOM BY SEAT NUMBER) */}
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
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800 shadow-sm'
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
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-sm'
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

      {/* Inline Player Name Edit Modal (✏️) */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Pencil className="w-4 h-4 text-cyan-400" />
                UBAH NAMA PEMAIN
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-extrabold focus:outline-none focus:border-cyan-500 text-sm"
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

      {/* Mid-Game Target Settings Modal (⚙️) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase font-display">
                <Settings className="w-4 h-4 text-cyan-400" />
                UBAH TARGET MATCH MID-GAME
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
                <label className="block text-slate-400 font-bold mb-1 uppercase">TARGET NILAI BATAS</label>
                <input
                  type="number"
                  value={editTargetValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditTargetValue('');
                    } else {
                      setEditTargetValue(val.replace(/^0+(?=\d)/, ''));
                    }
                  }}
                  min={1}
                  max={200}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-extrabold focus:outline-none focus:border-cyan-500 text-sm"
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
                SIMPAN UBAHAN
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Winner Celebration Match Finished Modal Overlay */}
      <MatchFinishedModal
        isOpen={Boolean(match.status === 'completed' && !isCelebrationDismissed)}
        onClose={() => {
          setIsCelebrationDismissed(true);
          setCelebrationWinner(null);
        }}
      />
    </div>
  );
}

// Fixed Seat Styling Helper (Strictly Locked by Seat Number 1..4)
function getSeatInfo(seatNumber: number) {
  switch (seatNumber) {
    case 1:
      return {
        border: 'border-rose-500/80',
        bg: 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950',
        scoreColor: 'text-rose-300',
      };
    case 2:
      return {
        border: 'border-blue-500/80',
        bg: 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950',
        scoreColor: 'text-blue-300',
      };
    case 3:
      return {
        border: 'border-emerald-500/80',
        bg: 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950',
        scoreColor: 'text-emerald-300',
      };
    case 4:
    default:
      return {
        border: 'border-amber-500/80',
        bg: 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950',
        scoreColor: 'text-amber-300',
      };
  }
}

// Dynamic Rank Badge Helper (Changes based on player's current score rank)
function getRankInfo(rank: number) {
  switch (rank) {
    case 1:
      return {
        emoji: '👑',
        badgeBg: 'bg-amber-950 text-amber-300 border-amber-500',
      };
    case 2:
      return {
        emoji: '🥈',
        badgeBg: 'bg-slate-800 text-slate-200 border-slate-600',
      };
    case 3:
      return {
        emoji: '🥉',
        badgeBg: 'bg-amber-950/60 text-amber-500 border-amber-800',
      };
    default:
      return {
        emoji: '🧱',
        badgeBg: 'bg-rose-950/60 text-rose-400 border-rose-900',
      };
  }
}
