# AGENTS - Standar Pengkodean & Panduan Kolaborasi AI Agent

> **Panduan untuk AI Agent & Pengembang Perangkat Lunak**  
> **Repository:** SIREDOM (Sistem Rekapitulasi Domino)  
> **Status:** Active Guidance (Revision 2.1 - Aligned with [PRD.md](./PRD.md))

---

## 1. Peran & Prinsip Utama AI Agent

Sebagai AI Coding Assistant (Antigravity / Gemini / Cursor / Claude) yang bekerja pada repositori SIREDOM, Anda **WAJIB** mematuhi prinsip-prinsip mutlak berikut:

1. **Domain Integrity (Aturan Federasi Domino Mutlak):**
   - Jangan pernah mencampuradukkan aturan PORDI (Tunggal: Fixed 7 Ronde, Ganda: Race to 7 Poin dengan bobot aksi tetap) dan ORADO (Set 101 Poin Best of 3 dengan hitungan sisa titik batu lawan). Selalu rujuk spesifikasi pada [PRD.md](./PRD.md) dan [SKILLS.md](./SKILLS.md).
2. **Database-First Persistence (Bukan Client-Memory Saja):**
   - Dilarang hanya meng-update state lokal Zustand. Setiap penyelesaian ronde **wajib** memicu mutasi permanen ke basis data via Server Actions (`src/features/scorer/actions.ts`) yang memutasi dokumen `MatchSession` (append `roundsHistory` + rekonstruksi `playersData`) agar data tidak hilang saat refresh atau berganti perangkat.
3. **Zero-Redundancy Scorer Flow:**
   - Jangan membuat tombol statis "Simpan & Lanjut" di bawah dasbor wasit. Pemicu commit adalah aksi terakhir di dalam modal (Skenario Kandang 🔥 langsung commit, Skenario Tangkap 🚓 commit setelah pilih korban 💀, Skenario Menang Biasa/Ceki/Palang commit via tombol konfirmasi modal).
4. **Isolasi Role & Layout:**
   - Dilarang membuat topbar universal yang menyatukan menu Wasit, Admin, dan Super Admin. Setiap role memiliki layout dan route guard terisolasi (`(wasit)/play/*`, `/admin/*`, `/superadmin/*`).
5. **Strict TypeScript & Database Scoping:**
   - Hindari penggunaan tipe `any`. Bentuk dokumen JSON (`playersData`, `roundsHistory`) memiliki tipe sumber tunggal di `src/types/domino.ts`. Setiap query Prisma wajib melakukan pembatasan tenant (`tenantId`).
6. **Verifikasi Sebelum Klaim Selesai:**
   - Selalu jalankan `npx tsc --noEmit` dan pastikan Server Actions terhubung sebelum menyatakan tugas selesai.

---

## 2. Struktur Modul Aktual (Domain-Driven Feature Layout)

Struktur repositori terpasang saat ini:

```
src/
├── app/                            # Next.js App Router (Pages & Route Handlers)
│   ├── (wasit)/play/               # Portal Wasit (/play) — tanpa topbar admin
│   │   └── live/[tableId]/         # Dynamic Table Routing (isolasi per meja)
│   │       ├── page.tsx            # Scorer pad kuadran 2x2
│   │       ├── setup/page.tsx      # Cascading setup form
│   │       ├── audit/page.tsx      # Riwayat ronde + rollback/reset
│   │       └── history/page.tsx    # Arsip sesi meja terkait
│   ├── login/                      # Portal Admin & Super Admin (Email/Password)
│   ├── admin/                      # dashboard, rules, leaderboard-tv, history, logs
│   ├── superadmin/                 # tenants, system
│   ├── actions/                    # Server Actions global
│   │   ├── authActions.ts          # loginAction (email/pass; verifikasi PIN meja)
│   │   ├── tableActions.ts         # lock/unlock meja, master data meja
│   │   └── tenantActions.ts        # operasi multi-tenant
│   └── api/                        # Route Handlers (matches, tables, tenants, health, system/logs)
├── components/
│   ├── ui/                         # Primitif UI bersama
│   └── wasit/                      # ScorerPadRenderer, Casual/Pordi/OradoScorerPad,
│                                   # PlayerCard, TeamScoreHeader, modal-modal FSM,
│                                   # MatchFinishedModal, VictoryAnimationOverlay
├── features/scorer/                # Modul bisnis skoring
│   ├── actions.ts                  # commitRoundAction, rollbackRoundAction, dst.
│   └── engine/                     # Pure Ruleset Engines (decoupled)
│       ├── types.ts                # IRulesetEngine Interface
│       ├── RulesetEngineFactory.ts # getRulesetEngine(mode)
│       ├── PordiRulesetEngine.ts   # PORDI (7 Ronde / 7 Poin + Denda Cepat)
│       ├── OradoRulesetEngine.ts   # ORADO (Set 101 + Dot Count + Apollo)
│       └── CasualRulesetEngine.ts  # Casual Warkop Implementation
├── lib/
│   ├── prisma.ts                   # Prisma Client Singleton (PostgreSQL/Supabase)
│   └── supabase.ts                 # Supabase Realtime Handlers (broadcast untuk Layar TV)
├── store/
│   └── useScorerStore.ts           # Zustand: staging UI, FSM modal, antrean sinkron luring
└── types/
    └── domino.ts                   # Enum & tipe domain terpusat (pemilik bentuk dokumen JSON)
prisma/
├── schema.prisma                   # Model: Tenant, User, TableMaster, MatchSession (JSON Document-Relational)
└── seed.ts
```

---

## 3. Aturan Zustand & Jembatan ke Server Actions

Zustand digunakan secara eksklusif untuk menangani interaksi antarmuka cepat di perangkat wasit (optimistic update 0ms) sebelum/kesejajaran dengan penyimpanan database:

### 3.1. Pemisahan Tanggung Jawab (Store vs Server Actions)

- **Zustand (`useScorerStore`):** Hanya menyimpan state transien — pilihan pemenang sementara, pilihan aksi modal, input numpad korban, status 3 pemain manual — plus antrean mutasi luring (`pendingSyncQueue`) untuk mendukung *Offline-First* (PRD Bagian 2.1).
- **Server Action (`commitRoundAction`):** Dipanggil pada langkah terakhir modal untuk:
  1. Menghitung delta skor via `IRulesetEngine.calculateRound()` (*pure*, tanpa I/O).
  2. Memutasi dokumen `MatchSession`: append ronde baru ke `roundsHistory`, rekonstruksi skor di `playersData`, perbarui metadata (`currentSet`, `teamASetWins`/`teamBSetWins`, `targetValue`, `status`, `winnerId`).
  3. Memicu broadcast Supabase Realtime (`ROUND_COMMITTED`) ke `/admin/leaderboard-tv`.

### 3.2. Contoh Pola Eksekusi Auto-Commit yang Benar

```typescript
// features/scorer/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { getRulesetEngine } from '@/features/scorer/engine/RulesetEngineFactory';
import { broadcastRoundCommitted } from '@/lib/supabase';

export async function commitRoundAction(payload: CommitRoundPayload) {
  try {
    const matchSession = await prisma.matchSession.findUnique({
      where: { id: payload.matchId },
    });
    if (!matchSession) return { status: 'error', message: 'Sesi tidak ditemukan' };

    // 1. Kalkulasi pure via engine (tanpa I/O)
    const engine = getRulesetEngine(matchSession.rulesetMode);
    const result = engine.calculateRound({ /* CalculationInput dari payload + state sesi */ });

    // 2. Mutasi dokumen MatchSession dalam satu update Prisma:
    //    append roundsHistory + rekonstruksi skor playersData
    const rounds = Array.isArray(matchSession.roundsHistory)
      ? (matchSession.roundsHistory as RoundHistoryItem[])
      : [];
    const players = Array.isArray(matchSession.playersData)
      ? (matchSession.playersData as PlayerDocument[])
      : [];

    const newRound: RoundHistoryItem = {
      id: crypto.randomUUID(),
      setNumber: result.currentSet ?? matchSession.currentSet,
      roundNumber: rounds.length + 1,
      actionType: payload.actionType,
      winnerPlayerId: payload.winnerPlayerId ?? null,
      victimPlayerId: payload.victimPlayerId ?? null,
      winType: result.winType,
      rawPointsInput: payload.rawPointsInput ?? 0,
      isPenalty: result.isPenalty,
      timestamp: new Date().toISOString(),
      scores: result.roundScores,
    };

    const updatedPlayers = players.map((p) => {
      const delta = result.roundScores.find((s) => s.playerId === p.id);
      return delta ? { ...p, currentScore: delta.scoreAfter } : p;
    });

    const updatedSession = await prisma.matchSession.update({
      where: { id: matchSession.id },
      data: {
        roundsHistory: [...rounds, newRound] as unknown as Prisma.InputJsonValue,
        playersData: updatedPlayers as unknown as Prisma.InputJsonValue,
        ...(result.isMatchComplete && { status: 'COMPLETED', winnerId: /* hitung pemenang */ null }),
      },
    });

    // 3. Broadcast ke TV penonton
    await broadcastRoundCommitted(updatedSession.id, {
      type: 'ROUND_COMMITTED',
      matchId: updatedSession.id,
    });

    return { status: 'success', data: updatedSession };
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}
```

> **Catatan:** Invarian wajib — skor akhir setiap pemain di `playersData` **harus selalu dapat direkonstruksi** dari `roundsHistory`. Rollback memanfaatkan invarian ini (buang ronde terakhir → rekonstruksi).

---

## 4. Panduan Sub-Agent Khusus (Sub-Agent Personas)

Jika tugas diberikan secara terpisah kepada AI Sub-Agent:

- **Ruleset Specialist Agent:**
  - Fokus pada unit testing matematika di `src/features/scorer/engine/`.
  - Pastikan logika **PORDI** menerapkan: Domi Biasa (+1), Domi Balak (+2), Ceki (+2/+3), Palang (+4), Kandang (+2 Ganda / +3 Tunggal), serta Denda Cepat (+1 Ringan dan +4 Passed Palsu).
  - Pastikan logika **ORADO** menerapkan: akumulasi sisa titik balak lawan, Dua Ujung Cocok (×2), Balak Habis (+50), Balak 0 Mati (13 titik), dan Kemenangan Apollo.
- **Wasit Scorer UI Agent:**
  - Fokus pada komponen kuadran 2x2 (`src/components/wasit/PlayerCard.tsx`).
  - Wajib menyertakan baris 5 pill riwayat ronde terakhir di bawah nama pemain (contoh: `[👑 R21] [🔥 R22] [✅ R23] [😭 R24] [👑 R25]`).
  - Menerapkan warna peringkat: Rank 1 Gold (👑), Rank 2 Silver (🥈), Rank 3 Bronze (🥉), Rank 4 Brick (🧱).
  - Mengunci tampilan landscape (`h-screen overflow-hidden`) dan mencegah click-through pada background modal perayaan.
- **TV Telemetry & Realtime Agent:**
  - Menangani `/admin/leaderboard-tv` dengan Recharts.
  - Pastikan listener Supabase Realtime meng-update klasemen dan garis telemetri secara instan (<150ms) tanpa loading loop; fallback polling tetap tersedia.

---

## 5. Daftar Periksa (Checklist) Sebelum Commit

- [ ] Skema database terhubung via Prisma ORM dan tervalidasi tanpa error.
- [ ] Mutasi skor wasit terhubung ke Server Actions dan tersimpan di dokumen `MatchSession`.
- [ ] Tombol statis "Simpan & Lanjut" tidak ada (*Zero-Redundancy Auto-Commit* aktif).
- [ ] *Floating Undo Toast* muncul selama 4 detik setelah commit ronde untuk fasilitas rollback instan.
- [ ] Riwayat 5 ronde terakhir tampil pada masing-masing kartu pemain (*History Pills*).
- [ ] Rute role Wasit, Admin, dan Super Admin terpisah tanpa topbar bersama (*Route Isolation*).
- [ ] **Entri devlog dibuat/diperbarui di `docs/devlog/NNNN-slug.md` + baris indeks di `README.md`** (lihat Bagian 6).
- [ ] Perintah `npx tsc --noEmit` lulus tanpa error TypeScript.

---

## 6. Dokumentasi Iterasi (Devlog) — WAJIB

Setiap iterasi kerja (fix, fitur, refactor, diagnosis, update docs) **wajib** didokumentasikan:

1. Salin [`devlog/TEMPLATE.md`](./devlog/TEMPLATE.md) → `devlog/NNNN-slug.md` (nomor urut berikutnya; satu file per sesi/topik).
2. Isi minimal: konteks, akar masalah/desain, perubahan per file, dan **bukti verifikasi** (command + hasil). Status `Fixed`/`Done` tanpa bukti verifikasi tidak diperbolehkan.
3. Tambahkan baris pada tabel indeks [`devlog/README.md`](./devlog/README.md).
4. Pesan commit merujuk entri: `fix: ... (devlog/0005)` — lihat `WORKFLOW.md` Bagian 3.
5. Untuk keputusan arsitektur permanen, tetap gunakan ADR (`docs/adr/`) — devlog adalah jurnal iterasi, bukan penggantinya.

---

## 7. Peta Dokumen Proyek

| Dokumen | Isi |
| :--- | :--- |
| [`PRD.md`](./PRD.md) | Sumber kebenaran produk: tujuan, fitur, alur, matriks regulasi, model data |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Stack, diagram sistem, ERD, FSM auto-commit, interface engine |
| [`SKILLS.md`](./SKILLS.md) | Detail matematis ruleset PORDI/ORADO/Casual & mesin rekalkulasi |
| [`ROADMAP.md`](./ROADMAP.md) | Status progres & fase eksekusi (termasuk Fase 7 perbaikan konsistensi) |
| [`devlog/`](./devlog/README.md) | Jurnal per-iterasi: fix, fitur, refactor, diagnosis (wajib tiap sesi) |
| [`WORKFLOW.md`](./WORKFLOW.md) | Setup lokal, Git, Prisma, verifikasi pra-commit, deployment |
