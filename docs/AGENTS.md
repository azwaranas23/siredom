# AI Agent Instructions & Guidelines - SIREDOM v0

Dokumen ini berisi panduan, aturan arsitektur, serta standar pengkodean (*coding standards*) untuk pengembang dan AI Coding Assistant pada project SIREDOM v0.

---

## 1. Aturan Pengkodean Utama (Core Guidelines)

### 1.1. Single Source of Truth & Database Direct Sync
- **Gunakan Database PostgreSQL (Supabase)** sebagai *Single Source of Truth*.
- **Dilarang keras menyimpan data domain** (Tenants, Tables, Match Sessions) ke dalam `localStorage` browser!
- `localStorage` pada Zustand store (`useScorerStore.ts`) **hanya diizinkan untuk menyimpan metadata sesi login** (`isAuthenticated`, `userRole`, `tenantCode`, `tableNumber`).

### 1.2. Penggunaan Next.js Server Actions & Prisma ORM
- Untuk mutasi data meja master, gunakan **Next.js Server Actions (`'use server'`)** di `src/app/actions/tableActions.ts`.
- Panggil `revalidatePath('/admin/dashboard')` di setiap Server Action mutasi untuk me-refresh cache Next.js App Router secara *real-time*.
- Gunakan instance Prisma Client singleton dari `@/lib/prisma`.

### 1.3. Keamanan Password
- Password pengguna **wajib di-hash** menggunakan `bcryptjs` (Salt 10 Rounds) sebelum disimpan ke PostgreSQL database.
- Jangan pernah menyimpan password dalam bentuk plain text di database maupun log console.

---

## 2. Struktur Kode & Konvensi File

```
src/
├── app/
│   ├── actions/
│   │   └── tableActions.ts      # Server Actions Prisma untuk Meja Master
│   ├── admin/
│   │   ├── dashboard/           # Dashboard Pengelola Cafe Admin
│   │   ├── leaderboard-tv/      # Spectator TV Display
│   │   ├── logs/                # Audit Rekap Matches
│   │   └── rules/               # Setting Aturan Bobot Poin
│   ├── api/
│   │   ├── matches/             # API Live Scoring Match
│   │   ├── system/logs/         # API Telemetry System Logs
│   │   ├── tables/              # API REST Meja Master
│   │   └── tenants/             # API REST Tenant Superadmin
│   ├── login/                   # Portal Login Multi-Role
│   └── superadmin/
│       ├── system/              # Monitoring System & Audit Log
│       └── tenants/             # Governance Tenant SaaS
├── components/                  # Komponen Reusable UI (Header, Modals)
├── lib/
│   └── prisma.ts                # Prisma Client Singleton Instance
├── store/
│   └── useScorerStore.ts        # Zustand FSM Scoring State
└── types/
    └── domino.ts                # TypeScript Interfaces & Enums
```

---

## 3. Workflow Verifikasi Kode
Sebelum menyatakan task selesai, AI Agent wajib mengeksekusi verifikasi berikut:
1. **Type Check**: `npx tsc --noEmit` (Wajib 0 Error).
2. **Production Build**: `npm run build` (Wajib LULUS tanpa error kompilasi).
