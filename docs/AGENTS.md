# AGENTS - Standar Pengkodean & Panduan Kolaborasi AI Agent

> **Panduan untuk AI Agent & Pengembang Perangkat Lunak**  
> **Repository:** SIREDOM (Sistem Rekapitulasi Domino)  
> **Status:** Active Guidance (Revision 2.0 - Aligned with PRD v2.0)

---

## 1. Peran & Prinsip Utama AI Agent

Sebagai AI Coding Assistant (Antigravity / Gemini / Cursor / Claude) yang bekerja pada repositori SIREDOM, Anda **WAJIB** mematuhi prinsip-prinsip mutlak berikut:

1. **Domain Integrity (Aturan Federasi Domino Mutlak):** 
   - Jangan pernah mencampuradukkan aturan PORDI (Tunggal: 7 Ronde, Ganda: 7 Poin dengan bobot aksi tetap) dan ORADO (Set 101 Poin dengan hitungan sisa titik batu lawan). Selalu rujuk spesifikasi pada [PRD.md](file:///c:/Users/acer/Documents/1%20Projects/SIREDOM%20v0/docs/PRD.md) dan [SKILLS.md](file:///c:/Users/acer/Documents/1%20Projects/SIREDOM%20v0/docs/SKILLS.md).
2. **Database-First Persistence (Bukan Client-Memory Saja):**
   - Dilarang hanya meng-update state lokal Zustand. Setiap penyelesaian ronde **wajib** memicu mutasi permanen ke basis data via Server Actions (`src/app/actions/` atau `src/features/scorer/actions/`) agar data tidak hilang saat refresh atau berganti perangkat.
3. **Zero-Redundancy Scorer Flow:**
   - Jangan membuat tombol statis "Simpan & Lanjut" di bawah dasbor wasit. Pemicu commit ke database adalah aksi terakhir di dalam modal (Skenario Kandang 🔥 langsung commit, Skenario Tangkap 🚓 commit setelah pilih korban 💀, Skenario Menang Biasa/Ceki/Palang commit via tombol modal konfirmasi).
4. **Isolasi Role & Layout:**
   - Dilarang membuat topbar universal yang menyatukan menu Wasit, Admin, dan Super Admin. Setiap role memiliki layout dan route guard terisolasi.
5. **Strict TypeScript & Database Scoping:**
   - Hindari penggunaan tipe `any`. Setiap query Prisma wajib melakukan pembatasan tenant (`tenantId: currentTenantId`).
6. **Verifikasi Sebelum Klaim Selesai:**
   - Selalu jalankan `npx tsc --noEmit` dan pastikan Server Actions terhubung sebelum menyatakan tugas selesai.

---

## 2. Struktur Modul Domain-Driven

Pastikan struktur repositori mengikuti tata letak modular berbasis fitur (*Domain-Driven Feature Layout*):

```
src/
├── app/                        # Next.js App Router (Pages & Route Handlers)
│   ├── (auth)/login/           # Dual-Mode Authentication (Numpad Wasit & Email Admin)
│   ├── (wasit)/wasit/          # Wasit Scorer Pad (/setup, /live, /audit, /history)
│   ├── (admin)/admin/          # Tenant Admin (/dashboard, /rules, /leaderboard-tv)
│   ├── (superadmin)/superadmin/# Super Admin Platform (/tenants, /system)
│   └── actions/                # Global Server Actions (Auth, Table Lock)
├── components/                 # Shared UI Primitives (Clean Modern Dark Theme)
│   ├── ui/                     # Dialog, Dropdown, Numpad, FloatingUndoToast
│   └── wasit/                  # PlayerCard, ActionBottomSheet, StatusModal, PenaltyPanel
├── features/                   # Modul Bisnis Terisolasi (Co-located Domain Logic)
│   ├── auth/                   # Autentikasi PIN Meja & JWT Admin
│   ├── rulesets/               # Pure Ruleset Calculation Engines
│   │   ├── engine.ts           # IRulesetEngine Interface
│   │   ├── pordi.ts            # PORDI Implementation (7 Ronde / 7 Poin + Denda Cepat)
│   │   ├── orado.ts            # ORADO Implementation (Set 101 + Dot Count + Apollo)
│   │   └── casual.ts           # Casual Warkop Implementation
│   ├── scorer/                 # FSM Wasit, Server Actions Mutasi Skor, & History Engine
│   │   └── actions.ts          # commitRoundAction, rollbackRoundAction, applyPenaltyAction
│   └── tenant/                 # Master Meja & Manajemen Kuota Tenant
├── lib/                        # Infrastruktur Teknis
│   ├── db/                     # Prisma Client Singleton (PostgreSQL / MySQL)
│   ├── supabase/               # Supabase Realtime Handlers (untuk Layar TV)
│   └── utils/                  # Formatters, Classnames
├── store/                      # Zustand Slices (Hanya untuk Staging UI & FSM)
│   ├── slices/                 # useAuthSlice, useScorerFSMSlice, useMatchSlice
│   └── index.ts                # Store Aggregator
└── types/                      # Centralized TypeScript Declarations (domino.ts)
```

---

## 3. Aturan Zustand & Jembatan ke Server Actions

Zustand digunakan secara eksklusif untuk menangani interaksi antarmuka yang cepat di perangkat wasit sebelum disimpan ke database:

### 3.1. Pemisahan Tanggung Jawab (Store vs Server Actions)
- **Zustand (`useScorerFSMSlice`):** Hanya menyimpan state transien (pilihan pemenang sementara, pilihan aksi modal, input numpad korban, status 3 pemain manual).
- **Server Action (`commitRoundAction`):** Dipanggil secara otomatis pada langkah terakhir modal untuk:
  1. Menghitung delta skor via `IRulesetEngine`.
  2. Menyimpan data ke tabel `Round` dan `RoundScore` di database via Prisma.
  3. Memperbarui `currentScore` dan `totalScore` pada tabel `Player` dan `MatchSession`.
  4. Memicu broadcast Supabase Realtime ke `/admin/leaderboard-tv`.

### 3.2. Contoh Pola Eksekusi Auto-Commit yang Benar

```typescript
// features/scorer/actions.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { getRulesetEngine } from '@/features/rulesets';
import { supabaseRealtimeBroadcast } from '@/lib/supabase/broadcast';

export async function commitRoundAction(payload: CommitRoundPayload) {
  try {
    const engine = getRulesetEngine(payload.rulesetMode);
    const result = engine.calculateRound(payload);

    // 1. Prisma Transaction ke Database
    const savedRound = await prisma.$transaction(async (tx) => {
      const round = await tx.round.create({
        data: {
          matchId: payload.matchId,
          setNumber: payload.currentSet,
          roundNumber: payload.nextRoundNumber,
          actionType: payload.actionType,
          winnerPlayerId: payload.winnerPlayerId,
          winnerTeam: payload.winnerTeam,
          victimPlayerId: payload.victimPlayerId,
          rawPointsInput: payload.rawPointsInput ?? 0,
          scores: {
            create: result.roundScores.map((s) => ({
              playerId: s.playerId,
              statusTag: s.statusTag,
              pointsAwarded: s.pointsAwarded,
              scoreAfter: s.scoreAfter,
            })),
          },
        },
      });

      // Update Player Scores
      for (const score of result.roundScores) {
        await tx.player.update({
          where: { id: score.playerId },
          data: { currentScore: score.scoreAfter },
        });
      }

      return round;
    });

    // 2. Broadcast ke TV Penonton
    await supabaseRealtimeBroadcast(`match:${payload.matchId}`, {
      event: 'ROUND_COMMITTED',
      payload: savedRound,
    });

    return { success: true, data: savedRound };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

---

## 4. Panduan Sub-Agent Khusus (Sub-Agent Personas)

Jika tugas diberikan secara terpisah kepada AI Sub-Agent:

- **Ruleset Specialist Agent:**
  - Fokus pada unit testing matematika di `src/features/rulesets/`.
  - Pastikan logika **PORDI** menerapkan: Domi Biasa (+1), Domi Balak (+2), Ceki (+2/+3), Palang (+4), Kandang (+2 Ganda / +3 Tunggal), serta Denda Cepat (+1 Ringan dan +4 Passed Palsu).
  - Pastikan logika **ORADO** menerapkan: Akumulasi sisa titik balak lawan, Dua Ujung Cocok ($\times 2$), Balak Habis (+50), Balak 0 Mati (13 titik), dan Kemenangan Apollo.

- **Wasit Scorer UI Agent:**
  - Fokus pada komponen kuadran 2x2 (`src/components/wasit/PlayerCard.tsx`).
  - Wajib menyertakan baris 5 pill riwayat ronde terakhir di bawah nama pemain (contoh: `[👑 R21] [🔥 R22] [✅ R23] [😭 R24] [👑 R25]`).
  - Menerapkan warna peringkat: Rank 1 Gold (👑), Rank 2 Silver (🥈), Rank 3 Bronze (🥉), Rank 4 Brick (🧱).
  - Mengunci tampilan landscape (`h-screen overflow-hidden`) dan mencegah click-through pada background modal perayaan.

- **TV Telemetry & Realtime Agent:**
  - Menangani `/admin/leaderboard-tv` dengan Recharts / Canvas chart.
  - Pastikan listener Supabase Realtime meng-update klasemen dan garis telemetri secara instan (<150ms) tanpa loading loop.

---

## 5. Daftar Periksa (Checklist) Sebelum Commit

- [ ] Skema database terhubung via Prisma ORM dan tervalidasi tanpa error.
- [ ] Mutasi skor wasit terhubung ke Server Actions dan tersimpan di database.
- [ ] Tombol statis "Simpan & Lanjut" di bawah layar wasit telah dihapus (*Zero-Redundancy Auto-Commit* aktif).
- [ ] *Floating Undo Toast* muncul selama 4 detik setelah commit ronde untuk fasilitas rollback instan.
- [ ] Riwayat 5 ronde terakhir tampil pada masing-masing kartu pemain (*History Pills*).
- [ ] Rute role Wasit, Admin, dan Super Admin terpisah tanpa topbar bersama (*Route Isolation*).
- [ ] Perintah `npx tsc --noEmit` lulus tanpa error TypeScript.