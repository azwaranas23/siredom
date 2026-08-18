# System Architecture & Tech Stack - SIREDOM v0

Dokumen ini menjelaskan arsitektur teknis, skema relasi basis data (ERD), serta aliran data (*data flow*) pada aplikasi SIREDOM v0.

---

## 1. Technology Stack

| Layer | Teknologi Utama | Versi |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Server Actions) | `15.5.x` |
| **UI Engine** | React, TailwindCSS, Lucide Icons, Framer Motion | React `19`, Tailwind `3.4` |
| **State Management** | Zustand (Client FSM Engine) | `5.0` |
| **ORM & Database** | Prisma ORM, Supabase Cloud PostgreSQL | Prisma `6.4` |
| **Authentication** | Bcrypt Password Encryption (`bcryptjs`) | `3.0` |
| **Deployment** | Vercel Serverless Platform | Production |

---

## 2. Skema Database Relational (ERD)

```mermaid
erDiagram
    Tenant ||--o{ User : "memiliki"
    Tenant ||--o{ TableMaster : "memiliki"
    Tenant ||--o{ MatchSession : "menyelenggarakan"
    TableMaster ||--o{ MatchSession : "tempat"
    MatchSession ||--o{ Player : "berisi (4 pemain)"
    MatchSession ||--o{ Round : "terdiri dari"
    Round ||--o{ RoundScore : "mencatat poin"
    Player ||--o{ RoundScore : "menerima poin"

    Tenant {
        string id PK
        string name
        string code UK
        string adminEmail
        string adminPasswordHash
        string subscriptionPlan
        string status
        int maxTables
    }

    User {
        string id PK
        string tenantId FK
        string email UK
        string passwordHash
        enum role
    }

    TableMaster {
        string id PK
        string tenantId FK
        int tableNumber
        string tableName
        string pinCode
        string status
    }

    MatchSession {
        string id PK
        string tenantId FK
        string tableId FK
        enum matchMode
        int targetValue
        json pointsConfig
        enum status
    }

    Player {
        string id PK
        string matchId FK
        int seatNumber
        string name
        int currentScore
    }

    Round {
        string id PK
        string matchId FK
        int roundNumber
        enum actionType
        string winnerPlayerId
        string victimPlayerId
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

## 3. Aliran Data (Data Flow Architecture)

```mermaid
graph TD
    Client[Browser Client / Spectator TV] -->|Client State / FSM| Zustand[Zustand Scorer Store]
    Client -->|Server Actions Mutation| ServerActions[Next.js Server Actions: tableActions.ts]
    Client -->|HTTP REST Fetch| APIRoutes[Next.js API Routes: /api/tenants, /api/matches]
    ServerActions -->|Prisma Client| DB[(Supabase PostgreSQL)]
    APIRoutes -->|Prisma Client| DB
    ServerActions -->|revalidatePath| ClientCache[Next.js Router Cache]
```

---

## 4. Keamanan & Isolasi Data Multi-Tenant
- Setiap query `TableMaster` dan `MatchSession` secara otomatis difilter berdasarkan `tenantId` atau `tenantCode`.
- Akses Wasit memerlukan verifikasi **4-digit PIN Meja** khusus yang dicocokkan dengan record `TableMaster` di PostgreSQL.
