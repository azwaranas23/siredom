'use client';

import React from 'react';
import { useScorerStore } from '@/store/useScorerStore';
import { useRouter } from 'next/navigation';
import { WinnerActionModal } from '@/components/wasit/WinnerActionModal';
import { SecondaryStatusModal } from '@/components/wasit/SecondaryStatusModal';
import { TangkapModal } from '@/components/wasit/TangkapModal';
import { VictoryAnimationOverlay } from '@/components/wasit/VictoryAnimationOverlay';
import { MatchFinishedModal } from '@/components/wasit/MatchFinishedModal';
import { EditPlayerNamesModal } from '@/components/wasit/EditPlayerNamesModal';
import { ActionType, Round } from '@/types/domino';
import { UserCog, Settings, ArrowRight } from 'lucide-react';

const SEAT_THEMES = [
  {
    border: 'border-rose-500/40 hover:border-rose-500',
    bg: 'bg-slate-900/90',
    badge: 'bg-rose-950 text-rose-300 border-rose-800/60',
    accent: 'text-rose-400',
    tag: 'KURSI 1 (MERAH)',
  },
  {
    border: 'border-cyan-500/40 hover:border-cyan-500',
    bg: 'bg-slate-900/90',
    badge: 'bg-cyan-950 text-cyan-300 border-cyan-800/60',
    accent: 'text-cyan-400',
    tag: 'KURSI 2 (BIRU)',
  },
  {
    border: 'border-emerald-500/40 hover:border-emerald-500',
    bg: 'bg-slate-900/90',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-800/60',
    accent: 'text-emerald-400',
    tag: 'KURSI 3 (HIJAU)',
  },
  {
    border: 'border-amber-500/40 hover:border-amber-500',
    bg: 'bg-slate-900/90',
    badge: 'bg-amber-950 text-amber-300 border-amber-800/60',
    accent: 'text-amber-400',
    tag: 'KURSI 4 (KUNING)',
  },
];

export default function WasitLivePage() {
  const router = useRouter();
  const {
    match,
    fsmState,
    selectedAction,
    selectedWinnerId: storeWinnerId,
    getRankedPlayers,
    getLast5RoundHistory,
    commitCurrentRound,
    resetFSM,
    lastRoundDelta,
  } = useScorerStore();

  const [selectedWinnerId, setSelectedWinnerId] = React.useState<string | null>(null);
  const [activeAnimationAction, setActiveAnimationAction] = React.useState<ActionType | null>(null);
  const [activeWinnerName, setActiveWinnerName] = React.useState<string>('');
  const [activeVictimName, setActiveVictimName] = React.useState<string>('');
  const [isEditNamesOpen, setIsEditNamesOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const rankedPlayers = isMounted ? getRankedPlayers() : [];
  const activeRoundNumber = isMounted ? match.rounds.length + 1 : 1;
  const hasAnyPoints = isMounted && (match.rounds.length > 0 || match.players.some((p) => p.currentScore > 0));

  const handleCardClick = (playerId: string) => {
    setSelectedWinnerId(playerId);
  };

  const handleRoundCommitted = (round: Round, actionType: ActionType, winnerName: string) => {
    const victim = match.players.find((p) => p.id === round.victimPlayerId);
    setActiveAnimationAction(actionType);
    setActiveWinnerName(winnerName);
    setActiveVictimName(victim?.name || '');
    setSelectedWinnerId(null);
  };


  // If Scenario C (🔥 Kandang auto-resolve) triggered CONFIRMATION state directly
  React.useEffect(() => {
    if (fsmState === 'CONFIRMATION') {
      const winnerPlayer = match.players.find((p) => p.id === (storeWinnerId || selectedWinnerId));
      const currentAction = selectedAction;
      const winnerName = winnerPlayer?.name || '';
      const committed = commitCurrentRound();

      if (committed && currentAction) {
        handleRoundCommitted(committed, currentAction, winnerName);
      }
    }
  }, [fsmState]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Empty State Banner when Table has not been setup yet */}
      {isMounted && match.status === 'setup' && (
        <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner">
            📋
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            MEJA #{match.tableNumber} BELUM PUNYA DATA PERTANDINGAN
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-mono max-w-lg mx-auto leading-relaxed">
            Meja #{match.tableNumber} baru saja ditambahkan atau belum disetup. Silakan lakukan setup 4 nama pemain & aturan pertandingan terlebih dahulu.
          </p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/wasit/setup')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Settings className="w-4 h-4" /> SETUP MEJA #{match.tableNumber} SEKARANG <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Scoring View (when setup is complete) */}
      {isMounted && match.status !== 'setup' && (
        <>
          {/* Top Session Status Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-400">
                RONDE {activeRoundNumber}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                  Kuadran Wasit Meja #{match.tableNumber}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {match.matchMode === 'rounds'
                    ? `Target Match: ${match.targetValue} Ronde Total`
                    : `Target Match: Race to ${match.targetValue} Poin`}
                  {' • '}
                  <span className="text-cyan-400 font-bold">Pilih Kartu Pemain Untuk Input Pemenang Ronde</span>
                </p>
              </div>
            </div>

            {/* Edit Player Names Button */}
            <button
              onClick={() => setIsEditNamesOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow-md"
            >
              <UserCog className="w-4 h-4 text-cyan-400" />
              Edit Nama Pemain
            </button>
          </div>

          {/* 2x2 Quadrant Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {match.players.map((player) => {
              const theme = SEAT_THEMES[player.seatNumber - 1] || SEAT_THEMES[0];
              const ranked = isMounted ? rankedPlayers.find((rp) => rp.id === player.id) : null;
              const history5 = isMounted ? getLast5RoundHistory(player.id) : [];
              const delta = isMounted ? lastRoundDelta[player.id] : undefined;
              const currentScore = isMounted ? player.currentScore : 0;

              return (
                <div
                  key={player.id}
                  onClick={() => handleCardClick(player.id)}
                  className={`rounded-2xl border ${theme.border} ${theme.bg} p-6 flex flex-col justify-between shadow-xl transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden`}
                >
                  {/* Card Header: Seat Tag & Rank Badge (Only shown when points exist) */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-lg border ${theme.badge}`}>
                      {theme.tag}
                    </span>

                    {hasAnyPoints && (
                      <div className="flex items-center gap-2">
                        {isMounted && ranked?.rank === 1 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                            👑 LEADER
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          PERINGKAT #{isMounted && ranked?.rank ? ranked.rank : '-'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Player Name & Score */}
                  <div className="my-2">
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center justify-between group-hover:text-cyan-300 transition-colors">
                      <span>{player.name}</span>
                      {isMounted && delta !== undefined && delta !== 0 && (
                        <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${delta > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                    </h3>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-5xl md:text-6xl font-black font-mono tracking-tight text-white">
                        {currentScore}
                      </span>
                      <span className="text-xs font-bold uppercase text-slate-500 font-mono">
                        TOTAL POIN
                      </span>
                    </div>
                  </div>

                  {/* Horizontal 5-Round Status Log */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                      <span>Riwayat 5 Ronde Terakhir:</span>
                      <span className="text-slate-500 font-mono text-[9px]">
                        Ronde {isMounted ? Math.max(1, match.rounds.length - 4) : 1} - {isMounted ? match.rounds.length : 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {!isMounted || history5.length === 0 ? (
                        <span className="text-xs text-slate-600 italic">Belum ada ronde dimainkan</span>
                      ) : (
                        history5.map((h, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono font-bold ${h.statusClass}`}
                            title={`Ronde ${h.roundNumber}: ${h.label}`}
                          >
                            <span>{h.icon}</span>
                            <span>R{h.roundNumber}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner Selection Bottom Drawer Modal */}
          <WinnerActionModal
            isOpen={Boolean(selectedWinnerId) && fsmState === 'IDLE'}
            onClose={() => setSelectedWinnerId(null)}
            winnerPlayerId={selectedWinnerId}
          />

          {/* Secondary Player Status Modal */}
          <SecondaryStatusModal
            isOpen={fsmState === 'MODAL_MANUAL_STATUS'}
            onClose={() => resetFSM()}
            onSuccess={handleRoundCommitted}
          />

          {/* Tangkap Victim Modal */}
          <TangkapModal
            isOpen={fsmState === 'MODAL_TANGKAP_VICTIM'}
            onClose={() => resetFSM()}
            onSuccess={handleRoundCommitted}
          />

          {/* Victory Celebration Animation Overlay */}
          <VictoryAnimationOverlay
            actionType={activeAnimationAction}
            winnerName={activeWinnerName}
            victimName={activeVictimName}
            onComplete={() => setActiveAnimationAction(null)}
          />


          {/* Race to Points / Match Finished Modal */}
          <MatchFinishedModal
            isOpen={match.status === 'completed'}
          />

          {/* Quick Edit Player Names Modal */}
          <EditPlayerNamesModal
            isOpen={isEditNamesOpen}
            onClose={() => setIsEditNamesOpen(false)}
          />
        </>
      )}
    </div>
  );
}
