'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScorerStore } from '@/store/useScorerStore';
import { ActionType, Player } from '@/types/domino';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { WinnerActionModal } from '@/components/wasit/WinnerActionModal';
import { TangkapModal } from '@/components/wasit/TangkapModal';
import { SecondaryStatusModal } from '@/components/wasit/SecondaryStatusModal';
import TeamQuadGrid from '@/components/wasit/TeamQuadGrid';
import { RotateCcw, Pencil, Settings, Menu } from 'lucide-react';

interface CasualScorerPadProps {
  tableId: string;
  matchSession?: any;
}

export default function CasualScorerPad({ tableId, matchSession }: CasualScorerPadProps) {
  const router = useRouter();

  const {
    match,
    fsmState,
    selectedWinnerId,
    selectedAction,
    selectedVictimId,
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
  const [isCornerMenuOpen, setIsCornerMenuOpen] = useState(false);

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
    setToastMessage(`Ronde #${roundNum} Disimpan (${winnerName})`);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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

  // Close corner menu on document click
  useEffect(() => {
    const handleDocClick = () => setIsCornerMenuOpen(false);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // KANDANG Zero-Redundancy Auto-Commit: langsung commit + animasi tanpa modal status
  React.useEffect(() => {
    if (fsmState === 'CONFIRMATION' && selectedAction === 'KANDANG' && selectedWinnerId) {
      handleAutoCommit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsmState]);

  // Mid-Game Target Update Handler
  const handleSaveTargetMidGame = async () => {
    const val = Number(editTargetValue) || (editMode === 'rounds' ? 10 : 50);
    updateTargetMidGame(editMode, val);
    setIsSettingsOpen(false);

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
    <div className="h-dvh w-full flex flex-col p-2 bg-[#0D0F12] relative overflow-hidden select-none font-sans text-white">
      {/* Victory Animation Overlay */}
      {victoryOverlayData && (
        <VictoryAnimationOverlay
          actionType={victoryOverlayData.actionType}
          winnerName={victoryOverlayData.winnerName}
          victimName={victoryOverlayData.victimName}
          onComplete={() => setVictoryOverlayData(null)}
        />
      )}

      {/* 1. Minimal Top-Center Floating HUD Pill: Info Ronde Saja */}
      <div className="hud-round-center">
        <span className="dot" />
        RONDE <span id="currentRoundDisplay">#{currentRoundNum}</span>
      </div>

      {/* 2. Top-Right Floating Shortcut Menu: Semi-Transparan saat Idle */}
      <div className={`hud-top-right ${isCornerMenuOpen ? 'menu-active' : ''}`}>
        <button
          className="btn-floating-menu"
          onClick={(e) => {
            e.stopPropagation();
            setIsCornerMenuOpen(!isCornerMenuOpen);
          }}
          aria-label="Menu Pintas"
          title="Menu Wasit"
        >
          <Menu className="w-4 h-4" />
        </button>
        {/* Dropdown Menu Corner */}
        <div
          id="cornerMenu"
          className={`drawer-menu-corner ${isCornerMenuOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="drawer-item item-undo"
            onClick={() => {
              setIsCornerMenuOpen(false);
              handleUndo();
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo Ronde Terakhir
          </button>
          <button
            className="drawer-item"
            onClick={() => {
              setIsCornerMenuOpen(false);
              window.open(`/play/live/${tableId}/tv`, '_blank');
            }}
          >
            📺 Buka Layar TV
          </button>
          <button
            className="drawer-item"
            onClick={() => {
              setIsCornerMenuOpen(false);
              router.push(`/play/live/${tableId}/setup`);
            }}
          >
            ⚙️ Setup Meja & Ganti Nama
          </button>
          <button
            className="drawer-item"
            onClick={() => {
              setIsCornerMenuOpen(false);
              setEditMode(match.matchMode || 'rounds');
              setEditTargetValue(match.targetValue || 10);
              setIsSettingsOpen(true);
            }}
          >
            ⚖️ Aturan Bobot Poin & Target
          </button>
          <button
            className="drawer-item text-rose-500 hover:bg-rose-950/30"
            onClick={() => {
              setIsCornerMenuOpen(false);
              router.push('/play');
            }}
          >
            🚪 Keluar Sesi
          </button>
        </div>
      </div>

      {/* 3. Bottom Floating Toast Undo (Muncul saat ronde selesai) */}
      <aside
        id="floatingUndoToast"
        className={`toast-undo-floating ${toastMessage ? 'active' : ''}`}
      >
        <span id="toastInfoText">✔️ {toastMessage}</span>
        <button className="btn-toast-undo" onClick={handleUndo}>
          <RotateCcw className="w-3 h-3" /> UNDO
        </button>
      </aside>

      {/* 4. Main Quadrant Display Grid */}
      {match.matchCategory === 'TEAM_2V2' ? (
        /* Layout 2 kuadran tim untuk Ganda */
        <TeamQuadGrid
          players={match.players}
          matchCategory={match.matchCategory}
          onSelectMember={(playerId) => selectWinnerPlayer(playerId)}
        />
      ) : (
        /* 4-Player Quadrant Grid for Tunggal (1v1v1v1) */
        <main className="player-grid">
          {displayPlayers.map((player) => {
            const dynamicRank =
              rankedPlayers.findIndex((rp) => rp.id === player.id) + 1 || player.seatNumber;
            const historyList = getLast5RoundHistory(player.id);
            const winstreak = getWinstreak(player.id);
            const themeClass = `theme-p${player.seatNumber}`;
            const pillClass = `pill-p${player.seatNumber}`;
            const showRank = match.rounds.length > 0 || player.currentScore > 0;

            return (
              <article
                key={player.id}
                className={`player-card ${themeClass}`}
                onClick={() => selectWinnerPlayer(player.id)}
              >
                <div className="card-top-bar">
                  <div className={`rank-pill ${pillClass}`}>
                    {showRank ? `#${dynamicRank}` : `K#${player.seatNumber}`}
                  </div>
                  {winstreak >= 2 && (
                    <div className="winstreak-pill">🔥 {winstreak} Winstreak</div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlayer({ id: player.id, name: player.name });
                      setNewPlayerNameInput(player.name);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-500 hover:text-cyan-400 rounded-lg transition-colors ml-auto opacity-60 hover:opacity-100"
                    title="Ubah Nama Pemain"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="player-center">
                  <h2 className="player-name">{player.name}</h2>
                  <div className="player-score" id={`scoreP${player.seatNumber}`}>
                    {player.currentScore} <span className="score-unit">pts</span>
                  </div>
                </div>

                <div className="rounds-row" id={`historyP${player.seatNumber}`}>
                  {historyList.length === 0 ? (
                    <span className="text-[10px] text-slate-600 italic">Belum ada ronde</span>
                  ) : (
                    historyList.map((h, i) => (
                      <div key={i} className="round-item" title={h.label}>
                        <div className="emoji-box">{h.icon}</div>
                        <span className="round-tag">R{h.roundNumber || i + 1}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </main>
      )}

      {/* Bottom Sheet Winner Action Selection Modal (Step 1) */}
      <WinnerActionModal
        isOpen={fsmState === 'ACTION_SELECTED'}
        onClose={resetFSM}
        winnerPlayerId={selectedWinnerId}
      />

      {/* Tangkap Victim Selection Modal (Step 3) */}
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

      {/* Manual Secondary Status Modal (Step 2) */}
      <SecondaryStatusModal
        isOpen={fsmState === 'MODAL_MANUAL_STATUS'}
        onClose={resetFSM}
        onSuccess={(round, actionType, winnerName) => {
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
