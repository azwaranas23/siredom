# ARCHITECTURE - Arsitektur Sistem & Desain Modul SIREDOM

> **Dokumen Arsitektur Teknikal**  
> **Sistem:** SIREDOM (Sistem Rekapitulasi Domino) v2.0  
> **Status:** Active Target Architecture (PRD v2.0 Aligned)

---

## 1. Stack Teknologi Utama

SIREDOM dibangun menggunakan arsitektur web modern yang dioptimalkan untuk performa tinggi, isolasi peran (*role-isolated*), dan resiliensi data:

- **Frontend & App Framework:** Next.js 15 (App Router, Server Actions, React 19, TypeScript)
- **Styling & UI:** Tailwind CSS v3, Lucide React (Ikon), Inter / Plus Jakarta Sans Typography
- **State Management (Client UI & Staging):** Zustand 5 (dengan arsitektur *slices* untuk FSM modal wasit dan staging data)
- **Data Persistence & ORM:** Database PostgreSQL / MySQL yang dikelola melalui Prisma ORM 6
- **Real-Time Data Sync:** Supabase Realtime JS Client / WebSockets (Pub/Sub untuk papan telemetri penonton)
- **Visualisasi Telemetri:** Recharts / HTML5 Canvas (Grafik garis akumulasi poin bergaya balap F1)
- **Keamanan & Autentikasi:** `bcryptjs` (Hashing password akun admin & validasi PIN meja wasit)

---

## 2. Diagram Arsitektur Sistem (High-Level Architecture)

```mermaid
graph TD
    subgraph Clients["Client Layer (Isolated Interfaces)"]
        WasitApp["Wasit Scorer Pad (Tablet Landscape / Mobile)"]
        PublicBoard["Spectator TV & Leaderboard (16:9 Big Screen)"]
        AdminDashboard["Tenant Admin Portal (Desktop / Tablet)"]
        SuperAdminDashboard["Super Admin SaaS Portal (Desktop)"]
    end

    subgraph AppLayer["Next.js 15 Application Layer"]
        subgraph RouteGroups["Isolated Route Groups (RBAC Protected)"]
            WasitRoutes["/wasit/* (Setup, Live Scorer, Audit, History)"]
            AdminRoutes["/admin/* (Dashboard, Rules, Leaderboard-TV)"]
            SuperAdminRoutes["/superadmin/* (Tenants, System Health)"]
        end

        subgraph StateManager["Zustand Client Slices (Staging Only)"]
            AuthSlice["useAuthSlice (PIN & Session State)"]
            FSMSlice["useScorerFSMSlice (Modal State & Transient Inputs)"]
            MatchSlice["useMatchSlice (Active Match Metadata)"]
        end

        subgraph CoreEngine["Pure Calculation Engines (Decoupled)"]
            PORDI["PordiRulesetEngine (7 Rounds / 7 Pts + Denda)"]
            ORADO["OradoRulesetEngine (101 Pts + Dot Count + Apollo)"]
            CASUAL["CasualRulesetEngine (Custom Action Weights)"]
        end

        ServerActions["Server Actions (/features/scorer/actions.ts)"]
    end

    subgraph DataLayer["Database & Realtime Infrastructure"]
        PrismaClient["Prisma ORM Client"]
        Database[("PostgreSQL / MySQL Database")]
        RealtimeBus["Supabase Realtime Engine (Pub/Sub Broadcast)"]
    end

    WasitApp --> FSMSlice
    FSMSlice --> CoreEngine
    CoreEngine --> ServerActions
    ServerActions --> PrismaClient
    PrismaClient --> Database
    Database --> RealtimeBus
    RealtimeBus -. Broadcast Updates (<150ms) .-> PublicBoard
    AdminDashboard --> ServerActions
    SuperAdminDashboard --> ServerActions
```

---

## 3. Diagram Skema Database (ERD - Entity Relationship Diagram)

Berdasarkan skema pada `prisma/schema.prisma`:

```mermaid
erDiagram
    Tenant ||--o{ User : "memiliki"
    Tenant ||--o{ TableMaster : "mengelola"
    Tenant ||--o{ MatchSession : "memiliki"

    TableMaster ||--o{ MatchSession : "menampung"

    MatchSession ||--o{ Player : "berisi (4 pemain)"
    MatchSession ||--o{ Round : "mencatat"

    Player ||--o{ RoundScore : "menerima poin"
    Round ||--o{ RoundScore : "rincian poin per pemain"

    Tenant {
        string id PK
        string name
        string slug UK
        string code UK
        string subscriptionPlan
        string status
        int maxTables
    }

    User {
        string id PK
        string tenantId FK
        string email UK
        string name
        string password
        enum role
    }

    TableMaster {
        string id PK
        string tenantId FK
        int tableNumber
        string tableName
        string pinCode
        string status
        boolean isLocked
        string activeDeviceId
    }

    MatchSession {
        string id PK
        string tenantId FK
        string tableId FK
        enum rulesetMode
        enum matchCategory
        string targetType
        int targetValue
        int currentSet
        int teamASetWins
        int teamBSetWins
        string status
        json rulesConfig
    }

    Player {
        string id PK
        string matchId FK
        int seatNumber
        string name
        string colorCode
        enum teamIdentifier
        int currentScore
        int totalScore
    }

    Round {
        string id PK
        string matchId FK
        int setNumber
        int roundNumber
        string winnerPlayerId
        enum winnerTeam
        string actionType
        string victimPlayerId
        int rawPointsInput
        boolean isPenalty
    }

    RoundScore {
        string id PK
        string roundId FK
        string playerId FK
        string statusTag
        int pointsAwarded
        int scoreAfter
    }
```

---

## 4. Wasit Finite State Machine (Zero-Redundancy Auto-Commit)

Proses penginputan skor pada meja wasit mengeliminasi tombol simpan manual di dasbor. Mutasi ke database dieksekusi seketika pada langkah penutup masing-masing skenario:

```mermaid
stateDiagram-v2
    [*] --> IDLE : Wasit Ketuk Kuadran Pemain/Tim
    IDLE --> ACTION_SELECTED : Buka Bottom Sheet Aksi

    state "Branching Skenario" as SCENARIOS {
        ACTION_SELECTED --> SCENARIO_C : Aksi == KANDANG (🔥)
        ACTION_SELECTED --> SCENARIO_B : Aksi == TANGKAP (🚓)
        ACTION_SELECTED --> SCENARIO_A : Aksi == MENANG_BIASA / CEKI / PALANG
        ACTION_SELECTED --> SCENARIO_ORADO : Ruleset == PB_ORADO
    }

    SCENARIO_C --> AUTO_COMMIT : Auto-Assign 3 Pemain = 😭 Berdiri
    SCENARIO_B --> MODAL_VICTIM : Buka Modal "Siapa yang Ditangkap?"
    MODAL_VICTIM --> AUTO_COMMIT : Pilih 1 Korban (💀) & Auto-Assign 2 = 🪑 Duduk
    SCENARIO_A --> MODAL_MANUAL_STATUS : Buka Modal Status 3 Pemain
    MODAL_MANUAL_STATUS --> AUTO_COMMIT : Wasit Klik "Konfirmasi & Lanjut ➔"
    SCENARIO_ORADO --> AUTO_COMMIT : Input Sisa Titik via Numpad + Checkbox

    AUTO_COMMIT --> SERVER_ACTION : Panggil commitRoundAction()
    SERVER_ACTION --> PRISMA_PERSIST : Simpan Round & Update Player di Database
    PRISMA_PERSIST --> REALTIME_SYNC : Broadcast Supabase Realtime ke TV
    REALTIME_SYNC --> [*] : Ronde N+1 Siap & Tampilkan Floating Undo Toast (4s)
```

---

## 5. Desain Ruleset Calculation Engine (Decoupled Interface)

Untuk memastikan bahwa aturan kalkulasi skor domino dapat diuji secara independen (*unit testing*) tanpa tergantung pada React atau Prisma, dibuat interface terisolasi `IRulesetEngine`:

```typescript
export interface CalculationInput {
  rulesetMode: 'CASUAL' | 'PB_PORDI' | 'PB_ORADO';
  matchCategory: 'SINGLE_1V1V1V1' | 'TEAM_2V2';
  rulesConfig: Record<string, any>;
  winnerPlayerId: string | null;
  winnerTeam: 'NONE' | 'TEAM_A' | 'TEAM_B';
  actionType: string;
  victimPlayerId?: string | null;
  manualStatuses?: Record<string, 'berdiri' | 'duduk'>;
  rawPointsInput?: number;
  isPenalty?: boolean;
  players: {
    id: string;
    seatNumber: number;
    teamIdentifier: 'NONE' | 'TEAM_A' | 'TEAM_B';
    currentScore: number;
  }[];
}

export interface CalculationResult {
  roundScores: {
    playerId: string;
    statusTag: string;
    pointsAwarded: number;
    scoreAfter: number;
  }[];
  winType: string;
  isPenalty: boolean;
}

export interface IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult;
}
```

### Implementasi Engine:
1. **`PordiRulesetEngine`:** Menerapkan regulasi resmi PB PORDI (Target Tunggal: 7 Ronde, Ganda: 7 Poin, bobot aksi tetap, dan kalkulasi penalti denda cepat +1/+4).
2. **`OradoRulesetEngine`:** Menerapkan regulasi PB ORADO (Target Set 101 Poin, akumulasi sisa titik balak lawan, pengali Dua Ujung Cocok $\times 2$, bonus Balak Habis +50, penalti Balak 0 Mati 13 titik, dan evaluasi kemenangan mutlak Apollo).
3. **`CasualRulesetEngine`:** Menerapkan aturan santai warkop dengan bobot kustom dinamis untuk kategori Tunggal maupun Tim 2v2.

---

## 6. Sinkronisasi Real-Time & TV Telemetry

Untuk menampilkan papan skor langsung di Smart TV/Proyektor (`/admin/leaderboard-tv`) tanpa jeda dan tanpa perlu me-refresh halaman:
1. Saat wasit menyelesaikan ronde, Server Action melakukan transaksi data ke database via Prisma.
2. Handler `supabaseRealtimeBroadcast` memancarkan payload event `ROUND_COMMITTED` ke topik channel: `match:${matchId}`.
3. Komponen `LeaderboardTV` pada layar proyektor menangkap payload tersebut dan memperbarui klasemen peringkat (#1 Gold 👑, #2 Silver 🥈, #3 Bronze 🥉, #4 Brick 🧱) serta titik koordinat grafik garis telemetri secara instan (<150ms).