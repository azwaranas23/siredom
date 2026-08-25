# ARCHITECTURE — Arsitektur Sistem & Desain Modul SIREDOM

> **Dokumen Arsitektur Teknikal**
> **Sistem:** SIREDOM (Sistem Rekapitulasi Domino) v2.0
> **Status:** Active Target Architecture — selaras dengan [`PRD.md`](./PRD.md) dan kode terpasang.
> **Model Data:** JSON Document-Relational ([ADR-0001](./adr/0001-json-document-relational-model.md))

---

## 1. Stack Teknologi Terpasang

- **Frontend & App Framework:** Next.js 15 (App Router, Server Actions, React 19, TypeScript 5)
- **Styling & UI:** Tailwind CSS v3, Lucide React (ikon), Framer Motion (animasi), canvas-confetti (perayaan kemenangan)
- **State Management (Client UI & Staging):** Zustand 5 (`src/store/useScorerStore.ts`)
- **Data Persistence & ORM:** PostgreSQL (Supabase Cloud) via Prisma ORM 6
- **Real-Time Sync:** Supabase Realtime JS Client (`@supabase/supabase-js`) + fallback polling di Leaderboard TV
- **Visualisasi Telemetri:** Recharts (grafik garis akumulasi poin bergaya balap F1)
- **Keamanan & Autentikasi:** `bcryptjs` (hashing password admin & verifikasi PIN meja wasit)

---

## 2. Diagram Arsitektur Sistem (High-Level)

```mermaid
graph TD
    subgraph Clients["Client Layer (Isolated Interfaces)"]
        WasitApp["Wasit Scorer Pad (/play/live/[tableId])<br/>Tablet Landscape / Mobile"]
        PublicBoard["Leaderboard TV (/admin/leaderboard-tv)<br/>16:9 Big Screen"]
        AdminDashboard["Admin Portal (/admin/*)<br/>Desktop / Tablet"]
        SuperAdminDashboard["Super Admin Portal (/superadmin/*)"]
    end

    subgraph AppLayer["Next.js 15 Application Layer"]
        subgraph RouteGroups["Isolated Route Groups"]
            WasitRoutes["(wasit)/play/*<br/>Portal, Setup, Live, Audit, History"]
            AdminRoutes["admin/*: Dashboard, Rules,<br/>Leaderboard-TV, History, Logs"]
            SuperAdminRoutes["superadmin/*: Tenants, System"]
        end

        subgraph StateManager["Zustand Client Store (Staging Only)"]
            Store["useScorerStore<br/>(auth, match config, FSM modal,<br/>sync queue offline-first)"]
        end

        subgraph CoreEngine["Pure Calculation Engines (Decoupled)"]
            Factory["RulesetEngineFactory.getRulesetEngine(mode)"]
            PORDI["PordiRulesetEngine"]
            ORADO["OradoRulesetEngine"]
            CASUAL["CasualRulesetEngine"]
        end

        ScorerActions["Server Actions<br/>features/scorer/actions.ts<br/>(setupMatch, commitRoundAction,<br/>rollbackRoundAction, applyPenalty)"]
        GlobalActions["Global Server Actions<br/>app/actions/*<br/>(authActions, tableActions, tenantActions)"]
    end

    subgraph DataLayer["Database & Realtime Infrastructure"]
        PrismaClient["Prisma ORM Client"]
        Database[("PostgreSQL (Supabase Cloud)<br/>Tabel: Tenant, User, TableMaster,<br/>MatchSession + dokumen JSON")]
        RealtimeBus["Supabase Realtime (Broadcast ROUND_COMMITTED)"]
    end

    WasitApp --> Store
    Store -->|"calculateRound()"| CoreEngine
    CoreEngine --> ScorerActions
    WasitApp --> GlobalActions
    AdminDashboard --> GlobalActions
    SuperAdminDashboard --> GlobalActions
    ScorerActions --> PrismaClient
    GlobalActions --> PrismaClient
    PrismaClient --> Database
    Database -.-> RealtimeBus
    RealtimeBus -. "Broadcast Updates" .-> PublicBoard
    PublicBoard -. "Fallback: polling 4s" .-> Database
```

**Status realtime (jujur terhadap kode terpasang):** halaman TV sudah berlangganan channel broadcast `ROUND_COMMITTED` dan memiliki fallback polling 4 detik; pemanggilan `broadcastRoundCommitted()` pada jalur commit/rollback Server Action adalah item kerja aktif (lihat [`ROADMAP.md`](./ROADMAP.md)).

---

## 3. Struktur Rute & Modul

```
src/
├── app/
│   ├── (wasit)/play/
│   │   ├── page.tsx                    # Portal wasit: tenant code + nomor meja + PIN
│   │   ├── layout.tsx
│   │   └── live/[tableId]/
│   │       ├── page.tsx                # Scorer pad utama (kuadran 2x2)
│   │       ├── setup/page.tsx          # Cascading setup form
│   │       ├── audit/page.tsx          # Riwayat ronde + rollback/reset
│   │       └── history/page.tsx        # Arsip sesi selesai per meja
│   ├── login/page.tsx                  # Portal Admin / Super Admin (email+password)
│   ├── admin/{dashboard,rules,leaderboard-tv,history,logs}/page.tsx
│   ├── superadmin/{tenants,system}/page.tsx
│   ├── actions/                        # Server Actions global
│   │   ├── authActions.ts              # loginAction (admin email/pass; verifikasi PIN meja)
│   │   ├── tableActions.ts             # lock/unlock meja, master data meja
│   │   └── tenantActions.ts            # operasi multi-tenant
│   ├── api/
│   │   ├── matches/route.ts            # GET daftar meja/sesi per tenant; POST aksi (lock/unlock)
│   │   ├── tables/route.ts
│   │   ├── tenants/route.ts
│   │   ├── system/logs/route.ts
│   │   └── health/route.ts
│   └── page.tsx                        # Redirect "/" → "/play"
├── components/
│   ├── wasit/                          # ScorerPadRenderer, Casual/Pordi/OradoScorerPad,
│   │                                   # PlayerCard, TeamScoreHeader, modal-modal FSM,
│   │                                   # MatchFinishedModal, VictoryAnimationOverlay
│   ├── ui/                             # Primitif UI bersama
│   ├── Numpad.tsx
│   └── Header.tsx
├── features/scorer/
│   ├── actions.ts                      # commitRoundAction, rollbackRoundAction, dst.
│   └── engine/
│       ├── types.ts                    # IRulesetEngine, CalculationInput/Result
│       ├── RulesetEngineFactory.ts
│       ├── PordiRulesetEngine.ts
│       ├── OradoRulesetEngine.ts
│       └── CasualRulesetEngine.ts
├── lib/
│   ├── prisma.ts                       # Prisma Client singleton
│   └── supabase.ts                     # Klien Supabase + broadcastRoundCommitted()
├── store/useScorerStore.ts             # Zustand store tunggal (auth + match + FSM + sync queue)
├── types/domino.ts                     # Enum & tipe domain terpusat
└── middleware.ts
prisma/
├── schema.prisma
└── seed.ts
scripts/
└── test-games-completion.ts            # Simulasi penyelesaian pertandingan
```

---

## 4. Skema Database (ERD — JSON Document-Relational)

Berdasarkan `prisma/schema.prisma` terpasang:

```mermaid
erDiagram
    Tenant ||--o{ User : "memiliki"
    Tenant ||--o{ TableMaster : "mengelola"
    Tenant ||--o{ MatchSession : "memiliki"
    TableMaster ||--o{ MatchSession : "menampung"

    Tenant {
        string id PK
        string name
        string slug UK
        string code UK
        string adminEmail
        string adminPasswordHash
        string subscriptionPlan
        string status
        int maxTables
    }

    User {
        string id PK
        string tenantId FK "nullable"
        string email UK
        string name
        string passwordHash
        enum role "SUPER_ADMIN | ADMIN | WASIT"
    }

    TableMaster {
        string id PK
        string tenantId FK
        int tableNumber "unique per tenant"
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
        int tableNumber
        enum rulesetMode "CASUAL | PB_PORDI | PB_ORADO"
        enum matchCategory "SINGLE_1V1V1V1 | TEAM_2V2"
        enum matchMode "ROUNDS | POINTS"
        string targetType
        int targetValue
        int currentSet
        int teamASetWins
        int teamBSetWins
        json pointsConfig
        json rulesConfig
        json playersData "dokumen: 4 pemain"
        json roundsHistory "dokumen: append-only"
        enum status "SETUP | IN_PROGRESS | COMPLETED | CANCELLED"
        string winnerId
    }
```

Enum domain lengkap (`ActionType`, `RoundStatusTag`, `TeamIdentifier`) dan bentuk dokumen `playersData`/`roundsHistory`: lihat [`PRD.md` Bagian 9](./PRD.md) dan sumber kebenaran tipenya di `src/types/domino.ts`.

---

## 5. Wasit Finite State Machine (Zero-Redundancy Auto-Commit)

Proses penginputan skor pada meja wasit mengeliminasi tombol simpan manual di dasbor. Mutasi dieksekusi pada langkah penutup masing-masing skenario:

```mermaid
stateDiagram-v2
    [*] --> IDLE : Wasit Ketuk Kuadran Pemain/Tim
    IDLE --> ACTION_SELECTED : Buka Bottom Sheet Aksi

    state "Branching Skenario" as SCENARIOS {
        ACTION_SELECTED --> SCENARIO_C : Aksi == KANDANG 🔥
        ACTION_SELECTED --> SCENARIO_B : Aksi == TANGKAP 🚓
        ACTION_SELECTED --> SCENARIO_A : Aksi == MENANG_BIASA / CEKI / PALANG
        ACTION_SELECTED --> SCENARIO_ORADO : Ruleset == PB_ORADO
    }

    SCENARIO_C --> AUTO_COMMIT : Auto-Assign 3 Pemain = 😭 Berdiri
    SCENARIO_B --> MODAL_VICTIM : Buka Modal "Siapa yang Ditangkap?"
    MODAL_VICTIM --> AUTO_COMMIT : Pilih 1 Korban 💀 & Auto-Assign 2 = 🪑 Duduk
    SCENARIO_A --> MODAL_MANUAL_STATUS : Buka Modal Status 3 Pemain
    MODAL_MANUAL_STATUS --> AUTO_COMMIT : Wasit Klik "Konfirmasi & Lanjut ➔"
    SCENARIO_ORADO --> AUTO_COMMIT : Input Sisa Titik via Numpad + Checkbox

    AUTO_COMMIT --> ENGINE : calculateRound() (pure, 0ms)
    ENGINE --> OPTIMISTIC : Update Zustand instan + enqueue mutasi
    OPTIMISTIC --> SERVER_ACTION : commitRoundAction() → mutasi dokumen MatchSession
    SERVER_ACTION --> REALTIME_SYNC : Broadcast Supabase Realtime ke TV
    REALTIME_SYNC --> [*] : Ronde N+1 Siap & Floating Undo Toast (4s)
```

**Pola eksekusi (sesuai kode):**
1. Engine menghitung hasil ronde secara _pure_ (tanpa I/O).
2. UI diperbarui secara optimistis (0ms); mutasi dimasukkan ke antrean sinkronisasi (`pendingSyncQueue`) — mendukung perilaku _offline-first_ PRD.
3. Worker latar memanggil Server Action; Server Action melakukan rekonsiliasi dokumen `MatchSession` (append `roundsHistory`, rekonstruksi skor `playersData`) dalam satu update Prisma.
4. Gagal jaringan → status `OFFLINE_PENDING`, antrean dicoba ulang otomatis.

---

## 6. Desain Ruleset Calculation Engine (Decoupled Interface)

Untuk memastikan aturan kalkulasi skor domino dapat diuji independen (*unit testing*) tanpa React atau Prisma, dibuat interface terisolasi `IRulesetEngine`. Sumber kebenaran: `src/features/scorer/engine/types.ts`.

```typescript
export interface IRulesetEngine {
  calculateRound(input: CalculationInput): CalculationResult;
}
```

`CalculationInput` membawa konteks penuh satu ronde: `rulesetMode`, `matchCategory`, `rulesConfig`/`pointsConfig`, identitas pemenang (`winnerPlayerId`/`winnerTeam`), `actionType`, `victimPlayerId`, `manualStatuses`, `rawPointsInput` + `oradoMultipliers` (khusus ORADO), `isPenalty`/`penaltyAmount`, snapshot `players`, serta progres pertandingan (`currentRoundsCount`, `currentSet`, `targetValue`, `matchMode`, `targetType`, `teamASetWins`, `teamBSetWins`).

`CalculationResult` mengembalikan `roundScores[]` (`statusTag`, `pointsAwarded`, `scoreAfter` per pemain), `winType`, `isPenalty`, `isMatchComplete`, plus field set ORADO (`setJustWon`, `currentSet`, `teamASetWins`, `teamBSetWins`) dan `newTargetValue` untuk overtime/tie-break.

### Implementasi Engine:

1. **`PordiRulesetEngine`:** Regulasi resmi PB PORDI (Target Tunggal: Fixed 7 Ronde, Ganda: Race to 7 Poin, bobot aksi tetap, tie-break overtime, kalkulasi penalti denda cepat +1/+4).
2. **`OradoRulesetEngine`:** Regulasi PB ORADO (Set 101 Poin Best of 3, akumulasi sisa titik batu lawan, pengali Dua Ujung Cocok ×2, bonus Balak Habis +50, penalti Balak 0 Mati 13 titik, evaluasi kemenangan mutlak Apollo).
3. **`CasualRulesetEngine`:** Aturan santai warkop dengan bobot kustom dinamis (`pointsConfig`) untuk kategori Tunggal maupun Tim 2v2.

Spesifikasi matematis tiap aturan: [`SKILLS.md`](./SKILLS.md).

---

## 7. Sinkronisasi Real-Time & TV Telemetry

Target tampilan papan skor langsung di Smart TV/Proyektor (`/admin/leaderboard-tv`) tanpa refresh:

1. Saat wasit menyelesaikan ronde, Server Action memutasi dokumen `MatchSession` via Prisma.
2. Handler `broadcastRoundCommitted(matchId, payload)` (`src/lib/supabase.ts`) memancarkan event `ROUND_COMMITTED` ke channel `match:${matchId}`.
3. Halaman TV berlangganan channel tersebut dan memperbarui klasemen peringkat (#1 Gold 👑, #2 Silver 🥈, #3 Bronze 🥉, #4 Brick 🧱) serta grafik garis telemetri (Recharts) segera.
4. **Fallback terpasang saat ini:** polling berkala 4 detik sebagai lapisan ketahanan; wiring broadcast penuh ada di [`ROADMAP.md`](./ROADMAP.md).
