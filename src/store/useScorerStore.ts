import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player, Match, Round, ActionType, PlayerStatus, PointsConfig, FunAwards, Role, RoundHistoryIcon, TableMaster, TenantMaster } from '@/types/domino';

export type FSMState = 
  | 'IDLE'                   // Waiting for winner selection
  | 'ACTION_SELECTED'       // Winner & Action selected in overlay
  | 'MODAL_MANUAL_STATUS'   // Scenario A: manual Berdiri/Duduk for 3 remaining players
  | 'MODAL_TANGKAP_VICTIM'  // Scenario B: selecting victim for Tangkap
  | 'CONFIRMATION';         // Review delta before saving

const DEFAULT_POINTS_CONFIG: PointsConfig = {
  menang_biasa: 1,
  kandang: 2,
  ceki: 3,
  palang: 4,
  tangkap: 3,
  ditangkap: -3,
  berdiri: 0,
  duduk: 0,
};

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', seatNumber: 1, name: 'Maman', currentScore: 0 },
  { id: 'p2', seatNumber: 2, name: 'Topati', currentScore: 0 },
  { id: 'p3', seatNumber: 3, name: 'Fatir', currentScore: 0 },
  { id: 'p4', seatNumber: 4, name: 'Udin', currentScore: 0 },
];

const DEFAULT_TENANTS: TenantMaster[] = [
  { id: 't-0', name: 'Tab Slowbar Coffee', code: 'TAB-SLOWBAR', subscriptionPlan: 'pro', status: 'active', maxTables: 10, activeMatches: 0, adminEmail: 'admin@tabslowbar.com', adminPassword: 'password123' },
];

const DEFAULT_MASTER_TABLES: TableMaster[] = [];




const INITIAL_MATCH_TABLE_1: Match = {
  id: 'match-table-1',
  tenantId: 'tenant-warkop-a',
  tableNumber: 1,
  matchMode: 'rounds',
  targetValue: 10,
  pointsConfig: DEFAULT_POINTS_CONFIG,
  status: 'in_progress',
  players: DEFAULT_PLAYERS,
  rounds: [],
};

const createEmptyTableMatch = (tableNum: number): Match => ({
  id: `match-table-${tableNum}`,
  tenantId: 'tenant-warkop-a',
  tableNumber: tableNum,
  matchMode: 'rounds',
  targetValue: 10,
  pointsConfig: DEFAULT_POINTS_CONFIG,
  status: 'setup',
  players: [
    { id: `t${tableNum}-p1`, seatNumber: 1, name: `Kursi 1 (Merah)`, currentScore: 0 },
    { id: `t${tableNum}-p2`, seatNumber: 2, name: `Kursi 2 (Biru)`, currentScore: 0 },
    { id: `t${tableNum}-p3`, seatNumber: 3, name: `Kursi 3 (Hijau)`, currentScore: 0 },
    { id: `t${tableNum}-p4`, seatNumber: 4, name: `Kursi 4 (Kuning)`, currentScore: 0 },
  ],
  rounds: [],
});

const DEFAULT_TABLE_SESSIONS: Record<number, Match> = {
  1: INITIAL_MATCH_TABLE_1,
  2: createEmptyTableMatch(2),
  3: createEmptyTableMatch(3),
  4: createEmptyTableMatch(4),
};

interface ScorerStore {
  // Match & Session State
  match: Match;
  tableSessions: Record<number, Match>;
  tenantCode: string;
  tableNumber: number;
  isAuthenticated: boolean;
  userRole: Role;

  // FSM Engine State
  fsmState: FSMState;
  selectedWinnerId: string | null;
  selectedAction: ActionType | null;
  selectedVictimId: string | null; // For Tangkap
  manualStatuses: Record<string, 'berdiri' | 'duduk'>; // playerID -> status for Scenario A

  // Realtime Sync Status
  isLiveStreaming: boolean;
  lastRoundDelta: Record<string, number>; // playerId -> last round delta
  masterTables: TableMaster[];
  tenants: TenantMaster[];

  // Actions
  setAuth: (authenticated: boolean, role: Role, tenantCode?: string, tableNum?: number) => void;
  updateMatchSetup: (players: { seatNumber: 1 | 2 | 3 | 4; name: string }[], matchMode: 'rounds' | 'points', targetValue: number, pointsConfig?: PointsConfig) => void;
  updatePlayerNames: (playersInput: { seatNumber: 1 | 2 | 3 | 4; name: string }[]) => void;
  updateTablePin: (tableId: string, newPin: string) => void;
  updateTableName: (tableId: string, newTableName: string) => void;
  setMasterTables: (tables: TableMaster[]) => void;
  addMasterTable: () => void;
  deleteMasterTable: (tableId: string) => void;

  // Tenant Governance Actions
  addTenant: (tenantInput: Omit<TenantMaster, 'id' | 'activeMatches'>) => void;
  updateTenant: (tenantId: string, updatedPartial: Partial<TenantMaster>) => void;
  deleteTenant: (tenantId: string) => void;
  toggleTenantStatus: (tenantId: string) => void;


  
  // FSM Step Handlers
  selectWinnerAndAction: (winnerId: string, action: ActionType) => void;
  setManualPlayerStatus: (playerId: string, status: 'berdiri' | 'duduk') => void;
  selectTangkapVictim: (victimId: string) => void;
  resetFSM: () => void;
  
  // Save & Audit Handlers
  commitCurrentRound: () => Round | null;
  rollbackLastRound: () => void;
  updateRoundInline: (roundId: string, updatedRound: Partial<Round>) => void;
  resetMatch: () => void;
  
  // Helper Selectors
  getTableMatch: (tableNum?: number) => Match;
  getAllMatchHistory: () => Match[];
  getRankedPlayers: (targetTableNum?: number) => (Player & { rank: number })[];

  getLast5RoundHistory: (playerId: string, targetTableNum?: number) => RoundHistoryIcon[];
  getFunAwards: (targetTableNum?: number) => FunAwards;
  getTelemetryData: (targetTableNum?: number) => { round: string; [playerName: string]: number | string }[];
}

export const useScorerStore = create<ScorerStore>()(
  persist(
    (set, get) => ({
      match: INITIAL_MATCH_TABLE_1,
      tableSessions: DEFAULT_TABLE_SESSIONS,
      tenantCode: 'WARKOP-A',
      tableNumber: 1,
      isAuthenticated: true,
      userRole: 'wasit',

      fsmState: 'IDLE',
      selectedWinnerId: null,
      selectedAction: null,
      selectedVictimId: null,
      manualStatuses: {},

      isLiveStreaming: true,
      lastRoundDelta: {},
      masterTables: DEFAULT_MASTER_TABLES,
      tenants: DEFAULT_TENANTS,


      setAuth: (authenticated, role, tenantCode = 'WARKOP-A', tableNum = 1) => {
        const sessions = get().tableSessions || DEFAULT_TABLE_SESSIONS;
        let targetMatch = sessions[tableNum];
        let updatedSessions = { ...sessions };

        if (!targetMatch) {
          targetMatch = createEmptyTableMatch(tableNum);
          updatedSessions[tableNum] = targetMatch;
        }

        set({
          isAuthenticated: authenticated,
          userRole: role,
          tenantCode,
          tableNumber: tableNum,
          match: targetMatch,
          tableSessions: updatedSessions,
        });
      },

      updatePlayerNames: (playersInput) => {
        const currentMatch = get().match;
        const curTableNum = currentMatch.tableNumber || get().tableNumber;

        const updatedPlayers = currentMatch.players.map((p) => {
          const matchedInput = playersInput.find((pi) => pi.seatNumber === p.seatNumber);
          return {
            ...p,
            name: matchedInput?.name || p.name,
          };
        });

        const newMatchState: Match = {
          ...currentMatch,
          players: updatedPlayers,
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
        });
      },

      updateTablePin: (tableId, newPin) => {
        set((state) => ({
          masterTables: state.masterTables.map((t) =>
            t.id === tableId ? { ...t, pinCode: newPin } : t
          ),
        }));
      },

      updateTableName: (tableId, newTableName) => {
        set((state) => ({
          masterTables: state.masterTables.map((t) =>
            t.id === tableId ? { ...t, tableName: newTableName } : t
          ),
        }));
      },

      setMasterTables: (tables) => set({ masterTables: tables }),


      addMasterTable: () => {
        set((state) => {
          const maxTableNum = state.masterTables.reduce((max, t) => Math.max(max, t.tableNumber), 0);
          const nextTableNum = maxTableNum + 1;
          const newPin = Math.floor(1000 + Math.random() * 9000).toString();

          const emptyMatch = createEmptyTableMatch(nextTableNum);
          const updatedSessions = {
            ...(state.tableSessions || DEFAULT_TABLE_SESSIONS),
            [nextTableNum]: emptyMatch,
          };

          return {
            masterTables: [
              ...state.masterTables,
              {
                id: `tbl-${Date.now()}`,
                tenantId: 'tenant-warkop-a',
                tableNumber: nextTableNum,
                tableName: `Meja Reguler 0${nextTableNum}`,
                pinCode: newPin,
                status: 'idle',
              },
            ],
            tableSessions: updatedSessions,
          };
        });
      },

      deleteMasterTable: (tableId) => {
        set((state) => {
          const targetTable = state.masterTables.find((t) => t.id === tableId);
          if (!targetTable) return state;

          const filteredTables = state.masterTables.filter((t) => t.id !== tableId);
          const updatedSessions = { ...state.tableSessions };
          delete updatedSessions[targetTable.tableNumber];

          return {
            masterTables: filteredTables,
            tableSessions: updatedSessions,
          };
        });
      },

      addTenant: (tenantInput) => {
        set((state) => ({
          tenants: [
            ...(state.tenants || DEFAULT_TENANTS),
            {
              id: `t-${Date.now()}`,
              name: tenantInput.name,
              code: tenantInput.code.toUpperCase(),
              subscriptionPlan: tenantInput.subscriptionPlan,
              status: tenantInput.status || 'active',
              maxTables: tenantInput.maxTables || 10,
              activeMatches: 0,
              adminEmail: tenantInput.adminEmail || `admin@${tenantInput.code.toLowerCase().trim()}.com`,
              adminPassword: tenantInput.adminPassword || 'password123',
            },
          ],
        }));
      },


      updateTenant: (tenantId, updatedPartial) => {
        set((state) => ({
          tenants: (state.tenants || DEFAULT_TENANTS).map((t) =>
            t.id === tenantId ? { ...t, ...updatedPartial } : t
          ),
        }));
      },

      deleteTenant: (tenantId) => {
        set((state) => ({
          tenants: (state.tenants || DEFAULT_TENANTS).filter((t) => t.id !== tenantId),
        }));
      },

      toggleTenantStatus: (tenantId) => {
        set((state) => ({
          tenants: (state.tenants || DEFAULT_TENANTS).map((t) =>
            t.id === tenantId ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t
          ),
        }));
      },



      updateMatchSetup: (playersInput, matchMode, targetValue, pointsConfig = DEFAULT_POINTS_CONFIG) => {
        const currentMatch = get().match;
        const curTableNum = currentMatch.tableNumber || get().tableNumber;

        const newPlayers: Player[] = playersInput.map((p) => {
          const existing = currentMatch.players.find((ep) => ep.seatNumber === p.seatNumber);
          return {
            id: existing ? existing.id : `t${curTableNum}-p${p.seatNumber}`,
            seatNumber: p.seatNumber,
            name: p.name || `Pemain ${p.seatNumber}`,
            currentScore: 0,
          };
        });

        const newMatchState: Match = {
          ...currentMatch,
          tableNumber: curTableNum,
          matchMode,
          targetValue,
          pointsConfig,
          players: newPlayers,
          rounds: [],
          status: 'in_progress',
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        // Update master table status to active
        const updatedMasterTables = get().masterTables.map((t) =>
          t.tableNumber === curTableNum ? { ...t, status: 'active' as const } : t
        );

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
          masterTables: updatedMasterTables,
          lastRoundDelta: {},
        });
        get().resetFSM();
      },

      selectWinnerAndAction: (winnerId, action) => {
        const { match } = get();
        const otherPlayers = match.players.filter((p) => p.id !== winnerId);

        const initialManual: Record<string, 'berdiri' | 'duduk'> = {};
        otherPlayers.forEach((p) => {
          initialManual[p.id] = 'duduk';
        });

        if (action === 'kandang') {
          set({
            selectedWinnerId: winnerId,
            selectedAction: action,
            selectedVictimId: null,
            manualStatuses: {},
            fsmState: 'CONFIRMATION',
          });
        } else if (action === 'tangkap') {
          set({
            selectedWinnerId: winnerId,
            selectedAction: action,
            selectedVictimId: null,
            manualStatuses: {},
            fsmState: 'MODAL_TANGKAP_VICTIM',
          });
        } else {
          set({
            selectedWinnerId: winnerId,
            selectedAction: action,
            selectedVictimId: null,
            manualStatuses: initialManual,
            fsmState: 'MODAL_MANUAL_STATUS',
          });
        }
      },

      setManualPlayerStatus: (playerId, status) => {
        set((state) => ({
          manualStatuses: {
            ...state.manualStatuses,
            [playerId]: status,
          },
        }));
      },

      selectTangkapVictim: (victimId) => {
        set({
          selectedVictimId: victimId,
          fsmState: 'CONFIRMATION',
        });
      },

      resetFSM: () => {
        set({
          fsmState: 'IDLE',
          selectedWinnerId: null,
          selectedAction: null,
          selectedVictimId: null,
          manualStatuses: {},
        });
      },

      commitCurrentRound: () => {
        const { match, selectedWinnerId, selectedAction, selectedVictimId, manualStatuses } = get();
        if (!selectedWinnerId || !selectedAction) return null;

        const curTableNum = match.tableNumber || get().tableNumber;
        const roundNumber = match.rounds.length + 1;
        const config = match.pointsConfig;
        const roundScores: { playerId: string; status: PlayerStatus; pointsAwarded: number; scoreAfter: number }[] = [];
        const deltas: Record<string, number> = {};

        match.players.forEach((player) => {
          let status: PlayerStatus = 'duduk';
          let pointsAwarded = 0;

          if (player.id === selectedWinnerId) {
            status = 'menang';
            pointsAwarded = config[selectedAction];
          } else if (selectedAction === 'kandang') {
            status = 'berdiri';
            pointsAwarded = config.berdiri;
          } else if (selectedAction === 'tangkap') {
            if (player.id === selectedVictimId) {
              status = 'ditangkap';
              pointsAwarded = config.ditangkap;
            } else {
              status = 'duduk';
              pointsAwarded = config.duduk;
            }
          } else {
            const userChoice = manualStatuses[player.id] || 'duduk';
            status = userChoice;
            pointsAwarded = userChoice === 'berdiri' ? config.berdiri : config.duduk;
          }

          const scoreAfter = player.currentScore + pointsAwarded;
          roundScores.push({
            playerId: player.id,
            status,
            pointsAwarded,
            scoreAfter,
          });

          deltas[player.id] = pointsAwarded;
        });

        const newRound: Round = {
          id: `round-t${curTableNum}-${Date.now()}`,
          roundNumber,
          actionType: selectedAction,
          winnerPlayerId: selectedWinnerId,
          victimPlayerId: selectedVictimId || undefined,
          timestamp: new Date().toISOString(),
          scores: roundScores,
        };

        const updatedPlayers = match.players.map((player) => {
          const rs = roundScores.find((s) => s.playerId === player.id);
          return {
            ...player,
            currentScore: rs ? rs.scoreAfter : player.currentScore,
          };
        });

        const newRounds = [...match.rounds, newRound];
        const isMatchComplete = 
          match.matchMode === 'rounds' 
            ? newRounds.length >= match.targetValue 
            : updatedPlayers.some((p) => p.currentScore >= match.targetValue);

        const newMatchState: Match = {
          ...match,
          players: updatedPlayers,
          rounds: newRounds,
          status: isMatchComplete ? 'completed' : 'in_progress',
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
          lastRoundDelta: deltas,
        });

        get().resetFSM();
        return newRound;
      },

      rollbackLastRound: () => {
        const { match } = get();
        if (match.rounds.length === 0) return;

        const curTableNum = match.tableNumber || get().tableNumber;
        const newRounds = match.rounds.slice(0, -1);
        const updatedPlayers = match.players.map((p) => ({ ...p, currentScore: 0 }));

        newRounds.forEach((round) => {
          round.scores.forEach((s) => {
            const playerIndex = updatedPlayers.findIndex((p) => p.id === s.playerId);
            if (playerIndex !== -1) {
              updatedPlayers[playerIndex].currentScore += s.pointsAwarded;
            }
          });
        });

        const newMatchState: Match = {
          ...match,
          players: updatedPlayers,
          rounds: newRounds,
          status: 'in_progress',
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
          lastRoundDelta: {},
        });
      },

      updateRoundInline: (roundId, updatedRoundPartial) => {
        const { match } = get();
        const curTableNum = match.tableNumber || get().tableNumber;
        const roundIndex = match.rounds.findIndex((r) => r.id === roundId);
        if (roundIndex === -1) return;

        const updatedRounds = [...match.rounds];
        updatedRounds[roundIndex] = { ...updatedRounds[roundIndex], ...updatedRoundPartial };

        const recomputedPlayers = match.players.map((p) => ({ ...p, currentScore: 0 }));
        updatedRounds.forEach((round) => {
          round.scores.forEach((s) => {
            const playerIndex = recomputedPlayers.findIndex((p) => p.id === s.playerId);
            if (playerIndex !== -1) {
              recomputedPlayers[playerIndex].currentScore += s.pointsAwarded;
            }
          });
        });

        const newMatchState: Match = {
          ...match,
          players: recomputedPlayers,
          rounds: updatedRounds,
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
        });
      },

      resetMatch: () => {
        const { match } = get();
        const curTableNum = match.tableNumber || get().tableNumber;
        const resetPlayers = match.players.map((p) => ({ ...p, currentScore: 0 }));

        const newMatchState: Match = {
          ...match,
          players: resetPlayers,
          rounds: [],
          status: 'in_progress',
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: newMatchState,
        };

        set({
          match: newMatchState,
          tableSessions: updatedSessions,
          lastRoundDelta: {},
        });
        get().resetFSM();
      },

      getTableMatch: (tableNum) => {
        const tNum = tableNum || get().tableNumber;
        const sessions = get().tableSessions || DEFAULT_TABLE_SESSIONS;
        return sessions[tNum] || createEmptyTableMatch(tNum);
      },

      getAllMatchHistory: () => {
        const sessions = get().tableSessions || DEFAULT_TABLE_SESSIONS;
        return Object.values(sessions);
      },


      getRankedPlayers: (targetTableNum) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        const sorted = [...match.players].sort((a, b) => b.currentScore - a.currentScore);
        
        let currentRank = 1;
        return sorted.map((player, index) => {
          if (index > 0 && player.currentScore < sorted[index - 1].currentScore) {
            currentRank = index + 1;
          }
          return {
            ...player,
            rank: currentRank,
          };
        });
      },

      getLast5RoundHistory: (playerId: string, targetTableNum?: number) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        const last5Rounds = match.rounds.slice(-5);
        
        return last5Rounds.map((round) => {
          const playerScore = round.scores.find((s) => s.playerId === playerId);
          const isWinner = round.winnerPlayerId === playerId;
          const isVictim = round.victimPlayerId === playerId;

          let icon = '🪑';
          let label = 'Duduk';
          let statusClass = 'bg-slate-800 text-slate-400 border-slate-700';

          if (isWinner) {
            switch (round.actionType) {
              case 'menang_biasa':
                icon = '👑';
                label = 'Win';
                statusClass = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
                break;
              case 'kandang':
                icon = '🔥';
                label = 'Kandang';
                statusClass = 'bg-orange-950/80 text-orange-300 border-orange-800/60';
                break;
              case 'ceki':
                icon = '✅';
                label = 'Ceki';
                statusClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
                break;
              case 'palang':
                icon = '🐐';
                label = 'Palang';
                statusClass = 'bg-purple-950/80 text-purple-300 border-purple-800/60';
                break;
              case 'tangkap':
                icon = '🚓';
                label = 'Tangkap';
                statusClass = 'bg-blue-950/80 text-blue-300 border-blue-800/60';
                break;
            }
          } else if (isVictim) {
            icon = '💀';
            label = 'Ditangkap';
            statusClass = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
          } else if (playerScore?.status === 'berdiri') {
            icon = '😭';
            label = 'Berdiri';
            statusClass = 'bg-red-950/80 text-red-300 border-red-800/60';
          } else {
            icon = '🪑';
            label = 'Duduk';
            statusClass = 'bg-slate-800/60 text-slate-400 border-slate-700/60';
          }

          return {
            roundNumber: round.roundNumber,
            icon,
            label,
            statusClass,
          };
        });
      },

      getFunAwards: (targetTableNum?: number) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        const counts: Record<string, { kandang: number; palang: number; ditangkap: number; ceki: number }> = {};
        
        match.players.forEach((p) => {
          counts[p.id] = { kandang: 0, palang: 0, ditangkap: 0, ceki: 0 };
        });

        match.rounds.forEach((r) => {
          if (r.actionType === 'kandang' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].kandang += 1;
          }
          if (r.actionType === 'palang' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].palang += 1;
          }
          if (r.actionType === 'ceki' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].ceki += 1;
          }
          if (r.actionType === 'tangkap' && r.victimPlayerId && counts[r.victimPlayerId]) {
            counts[r.victimPlayerId].ditangkap += 1;
          }
        });

        let rajaKandang: { player: Player; count: number } | null = null;
        let terbanyakPalang: { player: Player; count: number } | null = null;
        let palingSeringDitangkap: { player: Player; count: number } | null = null;
        let cekiMaster: { player: Player; count: number } | null = null;

        match.players.forEach((player) => {
          const c = counts[player.id];
          if (c.kandang > 0 && (!rajaKandang || c.kandang > rajaKandang.count)) {
            rajaKandang = { player, count: c.kandang };
          }
          if (c.palang > 0 && (!terbanyakPalang || c.palang > terbanyakPalang.count)) {
            terbanyakPalang = { player, count: c.palang };
          }
          if (c.ditangkap > 0 && (!palingSeringDitangkap || c.ditangkap > palingSeringDitangkap.count)) {
            palingSeringDitangkap = { player, count: c.ditangkap };
          }
          if (c.ceki > 0 && (!cekiMaster || c.ceki > cekiMaster.count)) {
            cekiMaster = { player, count: c.ceki };
          }
        });

        return { rajaKandang, terbanyakPalang, palingSeringDitangkap, cekiMaster };
      },

      getTelemetryData: (targetTableNum?: number) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        const telemetry: { round: string; [key: string]: number | string }[] = [];

        const round0: { round: string; [key: string]: number | string } = { round: 'R0' };
        match.players.forEach((p) => {
          round0[p.name] = 0;
        });
        telemetry.push(round0);

        const runningScores: Record<string, number> = {};
        match.players.forEach((p) => {
          runningScores[p.id] = 0;
        });

        match.rounds.forEach((round) => {
          const entry: { round: string; [key: string]: number | string } = {
            round: `R${round.roundNumber}`,
          };
          
          round.scores.forEach((s) => {
            runningScores[s.playerId] = (runningScores[s.playerId] || 0) + s.pointsAwarded;
          });

          match.players.forEach((p) => {
            entry[p.name] = runningScores[p.id] || 0;
          });

          telemetry.push(entry);
        });

        return telemetry;
      },
    }),
    {
      name: 'siredom-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        tenantCode: state.tenantCode,
        tableNumber: state.tableNumber,
      }),
    }
  )
);

