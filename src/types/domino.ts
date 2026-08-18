export type Role = 'superadmin' | 'admin' | 'wasit';

export type ActionType = 
  | "menang_biasa" // 👑 Menang Biasa (+1)
  | "kandang"      // 🔥 Kandang (+2)
  | "ceki"         // ✅ Ceki (+3)
  | "palang"       // 🐐 Palang (+4)
  | "tangkap";     // 🚓 Tangkap (+3 for capturer, -3 for captured)

export type PlayerStatus = 
  | "menang"    // Winner
  | "ditangkap" // 💀 Victim of Tangkap (-3)
  | "berdiri"   // 😭 Loser (0)
  | "duduk";     // 🪑 Safe (0)

export interface Player {
  id: string;
  seatNumber: 1 | 2 | 3 | 4; // 1: Red, 2: Blue, 3: Green, 4: Yellow
  name: string;
  currentScore: number;
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

export interface RoundPlayerScore {
  playerId: string;
  status: PlayerStatus;
  pointsAwarded: number;
  scoreAfter: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  actionType: ActionType;
  winnerPlayerId: string;
  victimPlayerId?: string; // only present for 'tangkap'
  timestamp: string;
  scores: RoundPlayerScore[];
}

export interface Match {
  id: string;
  tenantId: string;
  tableNumber: number;
  matchMode: "rounds" | "points";
  targetValue: number; // e.g. 10 rounds or 50 points
  pointsConfig: PointsConfig;
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
}
