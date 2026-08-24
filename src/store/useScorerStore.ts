import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Player,
  Match,
  Round,
  ActionType,
  PlayerStatus,
  RoundStatusTag,
  PointsConfig,
  RulesetMode,
  MatchCategory,
  TeamIdentifier,
  OradoConfig,
  RulesConfig,
  FunAwards,
  Role,
  RoundHistoryIcon,
  TableMaster,
  TenantMaster,
} from '@/types/domino';
import { commitRoundAction, rollbackRoundAction, applyPenaltyAction, setupMatchAction } from '@/features/scorer/actions';
import { getRulesetEngine } from '@/features/scorer/engine/RulesetEngineFactory';

export type FSMState =
  | 'IDLE'                   // Waiting for winner selection
  | 'ACTION_SELECTED'       // Winner & Action selected in overlay
  | 'MODAL_MANUAL_STATUS'   // Scenario A: manual Berdiri/Duduk for 3 remaining players
  | 'MODAL_TANGKAP_VICTIM'  // Scenario B: selecting victim for Tangkap
  | 'CONFIRMATION';         // Review delta before saving

export type SyncStatus = 'SYNCED' | 'SYNCING' | 'OFFLINE_PENDING';

export interface PendingMutation {
  id: string;
  type: 'COMMIT_ROUND' | 'APPLY_PENALTY';
  payload: any;
  timestamp: number;
}

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

const DEFAULT_TENANTS: TenantMaster[] = [];
const DEFAULT_MASTER_TABLES: TableMaster[] = [];

const createEmptyTableMatch = (tableNum: number): Match => ({
  id: `match-table-${tableNum}`,
  tenantId: 'tenant-tab-slowbar',
  tableNumber: tableNum,
  rulesetMode: 'CASUAL',
  matchCategory: 'SINGLE_1V1V1V1',
  matchMode: 'rounds',
  targetType: 'FIXED_ROUNDS',
  targetValue: 10,
  currentSet: 1,
  teamASetWins: 0,
  teamBSetWins: 0,
  pointsConfig: DEFAULT_POINTS_CONFIG,
  rulesConfig: {
    pointsConfig: DEFAULT_POINTS_CONFIG,
    oradoConfig: { apolloRule: true, deadBalak0Penalty: true },
  },
  status: 'setup',
  players: [],
  rounds: [],
});

const INITIAL_MATCH_TABLE_1: Match = createEmptyTableMatch(1);

const DEFAULT_TABLE_SESSIONS: Record<number, Match> = {
  1: createEmptyTableMatch(1),
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

  // FSM Engine State (Transient UI Only)
  fsmState: FSMState;
  selectedWinnerId: string | null;
  selectedAction: ActionType | null;
  selectedVictimId: string | null; // For Tangkap
  manualStatuses: Record<string, RoundStatusTag | 'berdiri' | 'duduk' | string>; // playerID -> status

  // Background Sync & Offline Queue State
  syncStatus: SyncStatus;
  pendingSyncQueue: PendingMutation[];
  processSyncQueue: () => Promise<void>;

  // Realtime Sync Status
  isLiveStreaming: boolean;
  lastRoundDelta: Record<string, number>; // playerId -> last round delta
  masterTables: TableMaster[];
  tenants: TenantMaster[];

  // Auth & Master Actions
  setAuth: (authenticated: boolean, role: Role, tenantCode?: string, tableNum?: number) => void;
  logout: () => void;
  setMatchFromDb: (dbMatch: any) => void;
  updateMatchSetup: (
    players: { seatNumber: 1 | 2 | 3 | 4; name: string }[],
    matchMode: 'rounds' | 'points',
    targetValue: number,
    pointsConfig?: PointsConfig,
    rulesetMode?: RulesetMode,
    matchCategory?: MatchCategory,
    targetType?: 'FIXED_ROUNDS' | 'RACE_TO_POINTS' | 'SET_101',
    oradoConfig?: OradoConfig
  ) => Promise<void>;
  updateTargetMidGame: (matchMode: 'rounds' | 'points', targetValue: number) => void;
  updatePlayerNames: (playersInput: { seatNumber: 1 | 2 | 3 | 4; name: string }[]) => void;
  updateSinglePlayerName: (playerId: string, newName: string) => void;
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

  // FSM & Transient UI Handlers
  selectWinnerPlayer: (winnerId: string) => void;
  selectWinnerAndAction: (winnerId: string, action: ActionType) => void;
  setManualPlayerStatus: (playerId: string, status: RoundStatusTag | 'berdiri' | 'duduk' | string) => void;
  selectTangkapVictim: (victimId: string) => void;
  resetFSM: () => void;

  // Optimistic 0ms Touch Response Handlers
  applyFastPenalty: (offenderPlayerId: string, penaltyAmount: 1 | 4) => Promise<Round | null>;
  commitOradoRound: (
    winnerTeam: TeamIdentifier,
    winnerPlayerId: string,
    rawRemainingPoints: number,
    multipliers: { duaUjung: boolean; balakHabis: boolean; macetBeradu: boolean }
  ) => Promise<Round | null>;
  commitCurrentRound: () => Promise<Round | null>;
  rollbackLastRound: () => Promise<void>;
  updateRoundInline: (roundId: string, updatedRound: Partial<Round>) => void;
  resetMatch: () => void;
  startNextSet: () => void;

  // Helper Selectors
  getTeamAScore: (targetTableNum?: number) => number;
  getTeamBScore: (targetTableNum?: number) => number;
  getTableMatch: (tableNum?: number) => Match;
  getAllMatchHistory: () => Match[];
  getRankedPlayers: (targetTableNum?: number) => (Player & { rank: number })[];
  getWinstreak: (playerId: string, targetTableNum?: number) => number;
  getLast5RoundHistory: (playerId: string, targetTableNum?: number) => RoundHistoryIcon[];
  getFunAwards: (targetTableNum?: number) => FunAwards;
  getTelemetryData: (targetTableNum?: number) => { round: string;[playerName: string]: number | string }[];
}

export const useScorerStore = create<ScorerStore>()(
  persist(
    (set, get) => ({
      match: INITIAL_MATCH_TABLE_1,
      tableSessions: DEFAULT_TABLE_SESSIONS,
      tenantCode: 'TAB-SLOWBAR',
      tableNumber: 1,
      isAuthenticated: true,
      userRole: 'wasit',

      fsmState: 'IDLE',
      selectedWinnerId: null,
      selectedAction: null,
      selectedVictimId: null,
      manualStatuses: {},

      syncStatus: 'SYNCED',
      pendingSyncQueue: [],

      isLiveStreaming: true,
      lastRoundDelta: {},
      masterTables: DEFAULT_MASTER_TABLES,
      tenants: DEFAULT_TENANTS,

      setAuth: (authenticated, role, tenantCode = 'TAB-SLOWBAR', tableNum = 1) => {
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

      logout: () => {
        set({
          isAuthenticated: false,
          userRole: 'wasit',
        });
      },

      setMatchFromDb: (dbMatch: any) => {
        if (!dbMatch) return;
        const currentMatch = get().match;
        const curTableNum = dbMatch.tableNumber || get().tableNumber;

        const category: MatchCategory = (dbMatch.matchCategory?.toUpperCase() as MatchCategory) || currentMatch.matchCategory || 'SINGLE_1V1V1V1';
        const rulesetMode: RulesetMode = (dbMatch.rulesetMode?.toUpperCase() as RulesetMode) || currentMatch.rulesetMode || 'CASUAL';

        let rawPlayers: any[] = [];
        if (Array.isArray(dbMatch.players)) {
          rawPlayers = dbMatch.players;
        } else if (Array.isArray(dbMatch.playersData)) {
          rawPlayers = dbMatch.playersData;
        } else if (typeof dbMatch.playersData === 'string') {
          try { rawPlayers = JSON.parse(dbMatch.playersData); } catch { rawPlayers = []; }
        }

        let rawRounds: any[] = [];
        if (Array.isArray(dbMatch.rounds)) {
          rawRounds = dbMatch.rounds;
        } else if (Array.isArray(dbMatch.roundsHistory)) {
          rawRounds = dbMatch.roundsHistory;
        } else if (typeof dbMatch.roundsHistory === 'string') {
          try { rawRounds = JSON.parse(dbMatch.roundsHistory); } catch { rawRounds = []; }
        }

        const formattedPlayers = rawPlayers.map((p: any) => ({
          id: p.id || `p-${p.seatNumber}`,
          seatNumber: p.seatNumber,
          name: p.name || `Pemain ${p.seatNumber}`,
          teamIdentifier: p.teamIdentifier || (category === 'TEAM_2V2' ? (p.seatNumber % 2 === 1 ? 'TEAM_A' : 'TEAM_B') : 'NONE'),
          currentScore: p.currentScore ?? 0,
          totalScore: p.totalScore ?? 0,
        }));

        const formattedRounds = rawRounds.map((r: any) => ({
          id: r.id,
          setNumber: r.setNumber || 1,
          roundNumber: r.roundNumber,
          actionType: (r.actionType?.toUpperCase() as ActionType) || 'MENANG_BIASA',
          winnerPlayerId: r.winnerPlayerId,
          winnerTeam: r.winnerTeam || 'NONE',
          victimPlayerId: r.victimPlayerId,
          winType: r.winType || 'MENANG_BIASA',
          rawPointsInput: r.rawPointsInput || 0,
          isPenalty: r.isPenalty || false,
          timestamp: r.timestamp || new Date().toISOString(),
          scores: (r.scores || []).map((s: any) => ({
            id: s.id,
            roundId: s.roundId,
            playerId: s.playerId,
            seatNumber: s.seatNumber,
            status: (s.statusTag?.toUpperCase() as RoundStatusTag) || 'DUDUK',
            statusTag: (s.statusTag?.toUpperCase() as RoundStatusTag) || 'DUDUK',
            pointsAwarded: s.pointsAwarded ?? 0,
            scoreAfter: s.scoreAfter ?? 0,
          })),
        }));

        const rawStatus = dbMatch.status ? String(dbMatch.status).toLowerCase() : currentMatch.status;
        const normStatus = rawStatus === 'in_progress' || rawStatus === 'completed' || rawStatus === 'setup' ? rawStatus : 'in_progress';

        const newMatchState: Match = {
          ...currentMatch,
          id: dbMatch.id || currentMatch.id,
          tableNumber: curTableNum,
          rulesetMode,
          matchCategory: category,
          matchMode: (dbMatch.matchMode?.toLowerCase() as any) || currentMatch.matchMode,
          targetType: dbMatch.targetType || currentMatch.targetType || 'FIXED_ROUNDS',
          targetValue: dbMatch.targetValue || currentMatch.targetValue,
          currentSet: dbMatch.currentSet || currentMatch.currentSet || 1,
          teamASetWins: dbMatch.teamASetWins || currentMatch.teamASetWins || 0,
          teamBSetWins: dbMatch.teamBSetWins || currentMatch.teamBSetWins || 0,
          pointsConfig: dbMatch.pointsConfig || currentMatch.pointsConfig,
          rulesConfig: dbMatch.rulesConfig || currentMatch.rulesConfig,
          status: normStatus as any,
          players: formattedPlayers.length > 0 ? formattedPlayers : currentMatch.players,
          rounds: formattedRounds,
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

      processSyncQueue: async () => {
        const queue = get().pendingSyncQueue || [];
        if (queue.length === 0) {
          set({ syncStatus: 'SYNCED' });
          return;
        }

        set({ syncStatus: 'SYNCING' });

        let updatedQueue = [...queue];
        let hasError = false;

        for (const item of queue) {
          try {
            let res: any;
            if (item.type === 'COMMIT_ROUND') {
              res = await commitRoundAction(item.payload);
            } else if (item.type === 'APPLY_PENALTY') {
              res = await applyPenaltyAction(item.payload);
            }

            if (res && res.status === 'success' && res.data) {
              updatedQueue = updatedQueue.filter((q) => q.id !== item.id);
              get().setMatchFromDb(res.data);
            } else {
              hasError = true;
              break;
            }
          } catch (err) {
            console.warn('Background round sync queued item failed:', err);
            hasError = true;
            break;
          }
        }

        set({
          pendingSyncQueue: updatedQueue,
          syncStatus: hasError || updatedQueue.length > 0 ? 'OFFLINE_PENDING' : 'SYNCED',
        });
      },

      updateTargetMidGame: (matchMode, targetValue) => {
        const currentMatch = get().match;
        const curTableNum = currentMatch.tableNumber || get().tableNumber;

        const newMatchState: Match = {
          ...currentMatch,
          matchMode,
          targetValue,
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

      updateSinglePlayerName: (playerId: string, newName: string) => {
        const currentMatch = get().match;
        const curTableNum = currentMatch.tableNumber || get().tableNumber;

        const updatedPlayers = currentMatch.players.map((p) =>
          p.id === playerId ? { ...p, name: newName } : p
        );

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

      selectWinnerPlayer: (winnerId: string) => {
        set({
          selectedWinnerId: winnerId,
          selectedAction: null,
          selectedVictimId: null,
          manualStatuses: {},
          fsmState: 'ACTION_SELECTED',
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
                tenantId: 'tenant-tab-slowbar',
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

      updateMatchSetup: async (
        playersInput,
        matchMode,
        targetValue,
        pointsConfig = DEFAULT_POINTS_CONFIG,
        rulesetMode = 'CASUAL',
        matchCategory = 'SINGLE_1V1V1V1',
        targetType = 'FIXED_ROUNDS',
        oradoConfig = { apolloRule: true, deadBalak0Penalty: true }
      ) => {
        const tenantCode = get().tenantCode || 'TAB-SLOWBAR';
        const tableNumber = get().tableNumber || 1;
        const currentMatchId = get().match.id;

        const res = await setupMatchAction({
          matchId: currentMatchId,
          tenantCode,
          tableNumber,
          rulesetMode,
          matchCategory,
          matchMode,
          targetType,
          targetValue,
          pointsConfig,
          rulesConfig: { pointsConfig, oradoConfig },
          oradoConfig,
          players: playersInput,
        });

        if (res.status === 'success' && res.data) {
          get().setMatchFromDb(res.data);
          get().resetFSM();
        }
      },

      // 0ms Optimistic Referee Rapid Penalty
      applyFastPenalty: async (offenderPlayerId, penaltyAmount) => {
        const { match } = get();
        const curTableNum = match.tableNumber || get().tableNumber;

        // 1. Run IRulesetEngine calculation synchronously (0ms)
        const engine = getRulesetEngine(match.rulesetMode);
        const calcResult = engine.calculateRound({
          rulesetMode: match.rulesetMode,
          matchCategory: match.matchCategory,
          rulesConfig: match.rulesConfig || {},
          pointsConfig: match.pointsConfig,
          actionType: 'DENDA_POIN',
          victimPlayerId: offenderPlayerId,
          isPenalty: true,
          penaltyAmount,
          players: match.players,
          currentRoundsCount: match.rounds.length,
          currentSet: match.currentSet || 1,
          targetValue: match.targetValue,
          matchMode: match.matchMode,
          targetType: match.targetType,
          teamASetWins: match.teamASetWins,
          teamBSetWins: match.teamBSetWins,
        });

        const deltas: Record<string, number> = {};
        const optimisticScores = calcResult.roundScores.map((scoreItem) => {
          deltas[scoreItem.playerId] = scoreItem.pointsAwarded;
          return {
            playerId: scoreItem.playerId,
            seatNumber: scoreItem.seatNumber,
            status: scoreItem.statusTag,
            statusTag: scoreItem.statusTag,
            pointsAwarded: scoreItem.pointsAwarded,
            scoreAfter: scoreItem.scoreAfter,
          };
        });

        const optimisticRound: Round = {
          id: `opt-penalty-${Date.now()}`,
          setNumber: calcResult.currentSet || match.currentSet || 1,
          roundNumber: match.rounds.length + 1,
          actionType: 'DENDA_POIN',
          victimPlayerId: offenderPlayerId,
          winType: 'DENDA_POIN',
          isPenalty: true,
          timestamp: new Date().toISOString(),
          scores: optimisticScores,
        };

        const updatedPlayers = match.players.map((p) => {
          const sc = calcResult.roundScores.find((s) => s.playerId === p.id);
          return {
            ...p,
            currentScore: sc ? sc.scoreAfter : p.currentScore,
          };
        });

        const nextStatus = calcResult.isMatchComplete ? 'completed' : 'in_progress';
        const optimisticMatch: Match = {
          ...match,
          targetValue: calcResult.newTargetValue || match.targetValue,
          currentSet: calcResult.currentSet || match.currentSet || 1,
          teamASetWins: calcResult.teamASetWins ?? match.teamASetWins,
          teamBSetWins: calcResult.teamBSetWins ?? match.teamBSetWins,
          status: nextStatus as any,
          players: updatedPlayers,
          rounds: [...match.rounds, optimisticRound],
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: optimisticMatch,
        };

        const pendingItem: PendingMutation = {
          id: `mut-pen-${Date.now()}`,
          type: 'APPLY_PENALTY',
          payload: { matchId: match.id, offenderPlayerId, penaltyAmount },
          timestamp: Date.now(),
        };

        set({
          match: optimisticMatch,
          tableSessions: updatedSessions,
          lastRoundDelta: deltas,
          pendingSyncQueue: [...(get().pendingSyncQueue || []), pendingItem],
          syncStatus: 'SYNCING',
        });

        get().processSyncQueue();
        return optimisticRound;
      },

      // 0ms Optimistic PB ORADO Count Commit
      commitOradoRound: async (winnerTeam, winnerPlayerId, rawRemainingPoints, multipliers) => {
        const { match } = get();
        const curTableNum = match.tableNumber || get().tableNumber;

        const engine = getRulesetEngine(match.rulesetMode);
        const calcResult = engine.calculateRound({
          rulesetMode: match.rulesetMode,
          matchCategory: match.matchCategory,
          rulesConfig: match.rulesConfig || {},
          pointsConfig: match.pointsConfig,
          winnerTeam,
          winnerPlayerId,
          actionType: 'ORADO_COUNT',
          rawPointsInput: rawRemainingPoints,
          oradoMultipliers: multipliers,
          players: match.players,
          currentRoundsCount: match.rounds.length,
          currentSet: match.currentSet || 1,
          targetValue: match.targetValue,
          matchMode: match.matchMode,
          targetType: match.targetType,
          teamASetWins: match.teamASetWins,
          teamBSetWins: match.teamBSetWins,
        });

        const deltas: Record<string, number> = {};
        const optimisticScores = calcResult.roundScores.map((scoreItem) => {
          deltas[scoreItem.playerId] = scoreItem.pointsAwarded;
          return {
            playerId: scoreItem.playerId,
            seatNumber: scoreItem.seatNumber,
            status: scoreItem.statusTag,
            statusTag: scoreItem.statusTag,
            pointsAwarded: scoreItem.pointsAwarded,
            scoreAfter: scoreItem.scoreAfter,
          };
        });

        const optimisticRound: Round = {
          id: `opt-orado-${Date.now()}`,
          setNumber: calcResult.currentSet || match.currentSet || 1,
          roundNumber: match.rounds.length + 1,
          actionType: 'ORADO_COUNT',
          winnerTeam,
          winnerPlayerId,
          winType: calcResult.winType,
          rawPointsInput: rawRemainingPoints,
          timestamp: new Date().toISOString(),
          scores: optimisticScores,
        };

        const updatedPlayers = match.players.map((p) => {
          const sc = calcResult.roundScores.find((s) => s.playerId === p.id);
          return {
            ...p,
            currentScore: sc ? sc.scoreAfter : p.currentScore,
          };
        });

        const nextStatus = calcResult.isMatchComplete ? 'completed' : 'in_progress';
        const optimisticMatch: Match = {
          ...match,
          targetValue: calcResult.newTargetValue || match.targetValue,
          currentSet: calcResult.currentSet || match.currentSet || 1,
          teamASetWins: calcResult.teamASetWins ?? match.teamASetWins,
          teamBSetWins: calcResult.teamBSetWins ?? match.teamBSetWins,
          status: nextStatus as any,
          players: updatedPlayers,
          rounds: [...match.rounds, optimisticRound],
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: optimisticMatch,
        };

        const pendingItem: PendingMutation = {
          id: `mut-orado-${Date.now()}`,
          type: 'COMMIT_ROUND',
          payload: {
            matchId: match.id,
            winnerTeam,
            winnerPlayerId,
            actionType: 'ORADO_COUNT',
            rawPointsInput: rawRemainingPoints,
            oradoMultipliers: multipliers,
          },
          timestamp: Date.now(),
        };

        set({
          match: optimisticMatch,
          tableSessions: updatedSessions,
          lastRoundDelta: deltas,
          pendingSyncQueue: [...(get().pendingSyncQueue || []), pendingItem],
          syncStatus: 'SYNCING',
        });

        get().processSyncQueue();
        return optimisticRound;
      },

      selectWinnerAndAction: (winnerId, action) => {
        const { match } = get();
        const otherPlayers = match.players.filter((p) => p.id !== winnerId && p.seatNumber !== Number(winnerId));

        const normalizedAction = (String(action).toUpperCase() as ActionType) || 'MENANG_BIASA';

        const initialManual: Record<string, RoundStatusTag> = {};
        otherPlayers.forEach((p) => {
          initialManual[p.id] = normalizedAction === 'KANDANG' ? 'BERDIRI' : 'DUDUK';
        });

        if (normalizedAction === 'TANGKAP') {
          set({
            selectedWinnerId: winnerId,
            selectedAction: normalizedAction,
            selectedVictimId: null,
            manualStatuses: {},
            fsmState: 'MODAL_TANGKAP_VICTIM',
          });
        } else if (normalizedAction === 'KANDANG') {
          // Zero-Redundancy Auto-Commit: 3 pemain lain otomatis BERDIRI,
          // langsung ke CONFIRMATION tanpa modal status manual.
          // Scorer pad mendeteksi state ini & memicu commit + animasi kemenangan.
          set({
            selectedWinnerId: winnerId,
            selectedAction: normalizedAction,
            selectedVictimId: null,
            manualStatuses: initialManual,
            fsmState: 'CONFIRMATION',
          });
        } else {
          set({
            selectedWinnerId: winnerId,
            selectedAction: normalizedAction,
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
            [playerId]: (String(status).toUpperCase() as RoundStatusTag) || 'DUDUK',
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

      // 0ms Optimistic Standard Round Commit
      commitCurrentRound: async () => {
        const { match, selectedWinnerId, selectedAction, selectedVictimId, manualStatuses } = get();
        if (!selectedWinnerId || !selectedAction) return null;

        const curTableNum = match.tableNumber || get().tableNumber;

        // 1. Run isolated IRulesetEngine calculation synchronously (0ms)
        const engine = getRulesetEngine(match.rulesetMode);
        const calcResult = engine.calculateRound({
          rulesetMode: match.rulesetMode,
          matchCategory: match.matchCategory,
          rulesConfig: match.rulesConfig || {},
          pointsConfig: match.pointsConfig,
          winnerPlayerId: selectedWinnerId,
          winnerTeam: 'NONE',
          actionType: selectedAction,
          victimPlayerId: selectedVictimId,
          manualStatuses,
          players: match.players,
          currentRoundsCount: match.rounds.length,
          currentSet: match.currentSet || 1,
          targetValue: match.targetValue,
          matchMode: match.matchMode,
          targetType: match.targetType,
          teamASetWins: match.teamASetWins,
          teamBSetWins: match.teamBSetWins,
        });

        // 2. Build optimistic Round & RoundScore records
        const deltas: Record<string, number> = {};
        const optimisticScores = calcResult.roundScores.map((scoreItem) => {
          deltas[scoreItem.playerId] = scoreItem.pointsAwarded;
          return {
            playerId: scoreItem.playerId,
            seatNumber: scoreItem.seatNumber,
            status: scoreItem.statusTag,
            statusTag: scoreItem.statusTag,
            pointsAwarded: scoreItem.pointsAwarded,
            scoreAfter: scoreItem.scoreAfter,
          };
        });

        const optimisticRound: Round = {
          id: `opt-rnd-${Date.now()}`,
          setNumber: calcResult.currentSet || match.currentSet || 1,
          roundNumber: match.rounds.length + 1,
          actionType: selectedAction,
          winnerPlayerId: selectedWinnerId,
          victimPlayerId: selectedVictimId || undefined,
          winType: calcResult.winType,
          isPenalty: calcResult.isPenalty,
          timestamp: new Date().toISOString(),
          scores: optimisticScores,
        };

        // 3. Update local Zustand state synchronously at 0ms
        const updatedPlayers = match.players.map((p) => {
          const sc = calcResult.roundScores.find((s) => s.playerId === p.id);
          return {
            ...p,
            currentScore: sc ? sc.scoreAfter : p.currentScore,
          };
        });

        const nextStatus = calcResult.isMatchComplete ? 'completed' : 'in_progress';
        const optimisticMatch: Match = {
          ...match,
          targetValue: calcResult.newTargetValue || match.targetValue,
          currentSet: calcResult.currentSet || match.currentSet || 1,
          teamASetWins: calcResult.teamASetWins ?? match.teamASetWins,
          teamBSetWins: calcResult.teamBSetWins ?? match.teamBSetWins,
          status: nextStatus as any,
          players: updatedPlayers,
          rounds: [...match.rounds, optimisticRound],
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: optimisticMatch,
        };

        // 4. Enqueue pending mutation for background sync
        const pendingItem: PendingMutation = {
          id: `mut-cur-${Date.now()}`,
          type: 'COMMIT_ROUND',
          payload: {
            matchId: match.id,
            winnerPlayerId: selectedWinnerId,
            actionType: selectedAction,
            victimPlayerId: selectedVictimId,
            manualStatuses,
          },
          timestamp: Date.now(),
        };

        set({
          match: optimisticMatch,
          tableSessions: updatedSessions,
          lastRoundDelta: deltas,
          pendingSyncQueue: [...(get().pendingSyncQueue || []), pendingItem],
          syncStatus: 'SYNCING',
        });

        // Instantly reset FSM state
        get().resetFSM();

        // Launch background queue worker (non-blocking)
        get().processSyncQueue();

        return optimisticRound;
      },

      rollbackLastRound: async () => {
        const matchId = get().match.id;
        const res = await rollbackRoundAction(matchId);
        if (res.status === 'success' && res.data) {
          get().setMatchFromDb(res.data);
        }
      },

      updateRoundInline: (roundId, updatedRoundPartial) => {
        const { match } = get();
        const curTableNum = match.tableNumber || get().tableNumber;
        const roundIndex = match.rounds.findIndex((r) => r.id === roundId);
        if (roundIndex === -1) return;

        const updatedRounds = [...match.rounds];
        updatedRounds[roundIndex] = { ...updatedRounds[roundIndex], ...updatedRoundPartial };

        const newMatchState: Match = {
          ...match,
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
        const resetPlayers = match.players.map((p) => ({ ...p, currentScore: 0, totalScore: 0 }));

        const newMatchState: Match = {
          ...match,
          currentSet: 1,
          teamASetWins: 0,
          teamBSetWins: 0,
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

      startNextSet: () => {
        const { match, tableNumber } = get();
        const curTableNum = match.tableNumber || tableNumber;

        const nextSetNum = (match.currentSet || 1) + 1;
        const resetPlayers = match.players.map((p) => ({
          ...p,
          totalScore: (p.totalScore || 0) + p.currentScore,
          currentScore: 0,
        }));

        const updatedMatch: Match = {
          ...match,
          currentSet: nextSetNum,
          players: resetPlayers,
          status: 'in_progress',
        };

        const updatedSessions = {
          ...(get().tableSessions || DEFAULT_TABLE_SESSIONS),
          [curTableNum]: updatedMatch,
        };

        set({
          match: updatedMatch,
          tableSessions: updatedSessions,
        });
      },

      getTeamAScore: (targetTableNum) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        return match.players
          .filter((p) => p.seatNumber === 1 || p.seatNumber === 3)
          .reduce((sum, p) => sum + p.currentScore, 0);
      },

      getTeamBScore: (targetTableNum) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        return match.players
          .filter((p) => p.seatNumber === 2 || p.seatNumber === 4)
          .reduce((sum, p) => sum + p.currentScore, 0);
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

      getWinstreak: (playerId: string, targetTableNum?: number) => {
        const match = targetTableNum ? get().getTableMatch(targetTableNum) : get().match;
        let streak = 0;
        for (let i = match.rounds.length - 1; i >= 0; i--) {
          if (match.rounds[i].winnerPlayerId === playerId) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
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

          const normAction = String(round.actionType).toUpperCase();
          const normStatus = String(playerScore?.status || playerScore?.statusTag || '').toUpperCase();

          if (isWinner) {
            switch (normAction) {
              case 'MENANG_BIASA':
                icon = '👑';
                label = 'Win';
                statusClass = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
                break;
              case 'KANDANG':
                icon = '🔥';
                label = 'Kandang';
                statusClass = 'bg-orange-950/80 text-orange-300 border-orange-800/60';
                break;
              case 'CEKI':
                icon = '✅';
                label = 'Ceki';
                statusClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
                break;
              case 'PALANG':
                icon = '🐐';
                label = 'Palang';
                statusClass = 'bg-purple-950/80 text-purple-300 border-purple-800/60';
                break;
              case 'TANGKAP':
                icon = '🚓';
                label = 'Tangkap';
                statusClass = 'bg-blue-950/80 text-blue-300 border-blue-800/60';
                break;
            }
          } else if (isVictim || normStatus === 'DITANGKAP') {
            icon = '💀';
            label = 'Ditangkap';
            statusClass = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
          } else if (normStatus === 'BERDIRI') {
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
          const normAct = String(r.actionType).toUpperCase();
          if (normAct === 'KANDANG' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].kandang += 1;
          }
          if (normAct === 'PALANG' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].palang += 1;
          }
          if (normAct === 'CEKI' && r.winnerPlayerId && counts[r.winnerPlayerId]) {
            counts[r.winnerPlayerId].ceki += 1;
          }
          if (normAct === 'TANGKAP' && r.victimPlayerId && counts[r.victimPlayerId]) {
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
        const telemetry: { round: string;[key: string]: number | string }[] = [];

        const round0: { round: string;[key: string]: number | string } = { round: 'R0' };
        match.players.forEach((p) => {
          round0[p.name] = 0;
        });
        telemetry.push(round0);

        const runningScores: Record<string, number> = {};
        match.players.forEach((p) => {
          runningScores[p.id] = 0;
        });

        match.rounds.forEach((round) => {
          const entry: { round: string;[key: string]: number | string } = {
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
        pendingSyncQueue: state.pendingSyncQueue,
      }),
    }
  )
);

// Register global online event listener to auto-flush pending sync queue on network reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useScorerStore.getState().processSyncQueue();
  });
}
