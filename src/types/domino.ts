export type Role = 'superadmin' | 'admin' | 'wasit';

export type RulesetMode = 'CASUAL' | 'PB_PORDI' | 'PB_ORADO';
export type MatchCategory = 'SINGLE_1V1V1V1' | 'TEAM_2V2';
export type TeamIdentifier = 'NONE' | 'TEAM_A' | 'TEAM_B';

export type ActionType = 
  | "MENANG_BIASA" // 👑 Menang Biasa (+1)
  | "KANDANG"      // 🔒 Kandang — poin via kandangVariant (devlog/0010)
  | "CEKI"         // ✅ Ceki (legacy alias → Ceki Biasa)
  | "PALANG"       // 🐐 Palang/Apollo (legacy alias)
  | "TANGKAP"      // 🚔 Tangkap
  | "ORADO_COUNT"  // 🎲 Count-based score input for PB ORADO
  | "DENDA_POIN"   // 🚨 Referee penalty points (+1/+3/+4)
  // --- PORDI granular (devlog/0010, Ticket GH#7) ---
  | "DOMI_BALAK"   // 🀄 Domi Balak (+2)
  | "CEKI_BIASA"   // ✅ Ceki Biasa (+2)
  | "CEKI_HABIS"   // ✨ Ceki Habis (+3)
  | "CEKI_BALAK"   // 🀄✅ Ceki Balak (+3)
  | "CEKI_APOLLO"; // 🐐 Ceki Apollo/Palang (+4)

/** Sub-jenis Kandang PORDI dipilih wasit di Level-2 modal (Ticket GH#7). */
export type KandangVariant = 'MENANG' | 'SERI' | 'KALAH';

export type RoundStatusTag = 
  | "MENANG"    // Winner
  | "DITANGKAP" // 💀 Victim of Tangkap (-3)
  | "BERDIRI"   // 😭 Loser (0)
  | "DUDUK"     // 🪑 Safe (0)
  | "DENDA";    // 🚨 Penalty receiver

export type PlayerStatus = RoundStatusTag;

export interface Player {
  id: string;
  seatNumber: 1 | 2 | 3 | 4; // 1: Red, 2: Blue, 3: Green, 4: Yellow
  name: string;
  teamIdentifier?: TeamIdentifier; // TEAM_A (Seats 1 & 3) | TEAM_B (Seats 2 & 4)
  currentScore: number;
  totalScore?: number;
}

export interface PointsConfig {
  menang_biasa: number; // default +1
  kandang: number;      // default +2
  ceki: number;         // default +3
  palang: number;       // default +4
  tangkap: number;      // default +3
  ditangkap: number;    // default -3
  berdiri: number;      // default 0
  duduk: number;        // default 0
}

export interface EnabledActionsConfig {
  menang_biasa?: boolean;
  kandang?: boolean;
  ceki?: boolean;
  palang?: boolean;
  tangkap?: boolean;
  ditangkap?: boolean;
  berdiri?: boolean;
  duduk?: boolean;
}

export interface OradoConfig {
  apolloRule: boolean;       // Instant win if 101 vs 0
  deadBalak0Penalty: boolean; // Balak 0 dead = 13 points penalty
}

export interface RulesConfig {
  pointsConfig: PointsConfig;
  enabledActions?: EnabledActionsConfig;
  oradoConfig: OradoConfig;
}



export interface RoundPlayerScore {
  id?: string;
  roundId?: string;
  playerId: string;
  seatNumber?: number;
  status?: PlayerStatus;
  statusTag: RoundStatusTag;
  pointsAwarded: number;
  scoreAfter: number;
}

export interface Round {
  id: string;
  matchId?: string;
  setNumber?: number;
  roundNumber: number;
  actionType: ActionType;
  winnerPlayerId?: string | null;
  winnerTeam?: TeamIdentifier;
  victimPlayerId?: string | null; // only present for 'tangkap' or penalty offender
  winType?: string;        // "MENANG_BIASA", "KANDANG", "ORADO_COUNT", "DENDA_POIN", etc.
  rawPointsInput?: number; // Raw remaining domino dots for ORADO
  isPenalty?: boolean;     // Indicator for referee penalty round
  timestamp: string | Date;
  scores: RoundPlayerScore[];
}

export interface Match {
  id: string;
  tenantId: string;
  tableNumber: number;
  rulesetMode: RulesetMode;
  matchCategory: MatchCategory;
  matchMode: "rounds" | "points";
  targetType: "FIXED_ROUNDS" | "RACE_TO_POINTS" | "SET_101";
  targetValue: number; // e.g. 7 rounds, 7 points, or 101 points
  currentSet: number;
  teamASetWins: number;
  teamBSetWins: number;
  pointsConfig: PointsConfig;
  rulesConfig?: RulesConfig;
  status: "setup" | "in_progress" | "completed";
  players: Player[];
  rounds: Round[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  code: string;
  subscriptionPlan: "basic" | "pro" | "enterprise";
  status: "active" | "suspended" | "expired";
  maxTables: number;
  createdAt?: string;
}

export interface TenantMaster {
  id: string;
  name: string;
  code: string;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
  maxTables: number;
  activeMatches: number;
  adminEmail: string;
  adminPassword: string;
}

export interface TableMaster {
  id: string;
  tenantId: string;
  tableNumber: number;
  tableName: string;
  pinCode: string;
  status: "idle" | "active" | "maintenance";
}

export interface TableSession {
  tableNumber: number;
  tenantCode: string;
  tenantName: string;
  isAuthenticated: boolean;
  role: Role;
}

export interface RoundHistoryIcon {
  roundNumber: number;
  icon: string;
  label: string;
  statusClass: string;
}

export interface FunAwards {
  rajaKandang: { player: Player; count: number } | null;
  terbanyakPalang: { player: Player; count: number } | null;
  palingSeringDitangkap: { player: Player; count: number } | null;
  cekiMaster: { player: Player; count: number } | null;
  tangkapTerbanyak: { player: Player; count: number } | null;
}

// ============================================================
// JSON Document-Relational Model (lihat docs/adr/0001)
// Pemilik tipe tunggal untuk dokumen MatchSession.playersData
// dan MatchSession.roundsHistory. Invarian: skor akhir setiap
// pemain HARUS dapat direkonstruksi dari roundsHistory.
// ============================================================

/** Item dokumen MatchSession.playersData (array, 4 item). */
export type PlayerDocument = Player & {
  teamIdentifier: TeamIdentifier;
  totalScore: number;
};

/** Array dokumen playersData. */
export type PlayersDataDocument = PlayerDocument[];

/** Item scores di dalam RoundHistoryDocument. */
export type RoundScoreDocument = Omit<RoundPlayerScore, 'id' | 'roundId'> & {
  id?: string;
  playerId: string;
  seatNumber?: number;
  statusTag: RoundStatusTag;
  pointsAwarded: number;
  scoreAfter: number;
};

/** Item dokumen MatchSession.roundsHistory (append-only). */
export type RoundHistoryDocument = Omit<Round, 'matchId' | 'scores'> & {
  matchId?: string;
  timestamp: string;
  scores: RoundScoreDocument[];
};

/** Array dokumen roundsHistory. */
export type RoundsHistoryDocument = RoundHistoryDocument[];

/** Info meja aman untuk dikirim ke klien publik (TANPA pinCode). */
export interface PublicTableInfo {
  id: string;
  tableNumber: number;
  tableName: string;
  status: string;
  isLocked: boolean;
  activeDeviceId: string | null;
}

