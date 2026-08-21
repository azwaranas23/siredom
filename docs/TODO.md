# TODO - Peta Jalan & Daftar Tugas Eksekusi SIREDOM

> **Rencana Eksekusi Refactoring & Pengembangan SIREDOM v2.0**  
> **Status Legend:**  
> `[ ]` Belum Dimulai | `[P]` Dalam Proses (*In Progress*) | `[x]` Selesai (*Completed*)

---

## Ringkasan Progres Pengembangan

- [x] **Inisialisasi Dokumentasi Arsitektur & Spesifikasi Regulasi (`PRD.md`, `ARCHITECTURE.md`, `SKILLS.md`, `AGENTS.md`)**
- [ ] **Fase 1: Database Setup (MySQL Prisma) & Decoupled Ruleset Engines**
- [ ] **Fase 2: Autentikasi Role, PIN Meja, & Session Locking**
- [ ] **Fase 3: Refactoring Wasit Scorer Pad (`/wasit/live`) & Auto-Commit Flow**
- [ ] **Fase 4: Live Telemetry Leaderboard TV (`/admin/leaderboard-tv`) & Realtime Sync**
- [ ] **Fase 5: Pengujian Otomatis (Unit & Integration Testing)**
- [ ] **Fase 6: Verifikasi Produksi & Deployment Hosting**

---

## 🗄️ Fase 1: Database Setup (MySQL Prisma) & Decoupled Ruleset Engines

Tujuan: Mengonfigurasi basis data MySQL permanen dan memisahkan logika kalkulasi aturan domino ke dalam modul independen (*pure logic*).

- [ ] **1.1. Konfigurasi Skema Prisma MySQL**
  - [ ] Ubah provider database menjadi `mysql` pada `prisma/schema.prisma`.
  - [ ] Tambahkan enum `UserRole` (`SUPER_ADMIN`, `CAFE_ADMIN`, `WASIT_MEJA`).
  - [ ] Tambahkan enum `RulesetMode` (`CASUAL`, `PB_PORDI`, `PB_ORADO`).
  - [ ] Tambahkan enum `MatchCategory` (`SINGLE_1V1V1V1`, `TEAM_2V2`) dan `TeamIdentifier` (`NONE`, `TEAM_A`, `TEAM_B`).
  - [ ] Sinkronkan skema ke MySQL via `npx prisma db push` atau `npx prisma migrate dev`.
  - [ ] Generate Prisma Client types via `npx prisma generate`.

- [ ] **1.2. Implementasi Pure Ruleset Engines**
  - [ ] Buat interface `src/features/rulesets/engine.ts` (`IRulesetEngine`).
  - [ ] Buat modul `src/features/rulesets/pordi.ts`:
    - [ ] Logika Tunggal (Fixed 7 Ronde) & Ganda (Race to 7 Poin).
    - [ ] Matriks bobot aksi resmi (Domi Biasa +1, Balak +2, Ceki +2/+3, Palang +4, Kandang +2/+3).
    - [ ] Logika Denda Cepat Wasit (+1 Ringan, +4 Passed Palsu).
  - [ ] Buat modul `src/features/rulesets/orado.ts`:
    - [ ] Logika Race to 101 Poin (Best of 3 Sets) untuk kategori Tim 2v2.
    - [ ] Kalkulasi sisa titik kartu lawan dengan pengali Dua Ujung Cocok (x2) dan Balak Habis (+50).
    - [ ] Logika penalti Balak 0 Mati (13 titik) dan deteksi kemenangan mutlak Apollo.
  - [ ] Buat modul `src/features/rulesets/casual.ts` untuk bobot aksi kustom.
  - [ ] Buat factory function `getRulesetEngine(mode: RulesetMode)` di `src/features/rulesets/index.ts`.

---

## 🔐 Fase 2: Autentikasi Role, PIN Meja, & Session Locking

Tujuan: Memisahkan hak akses antarmuka tiap peran dan mengunci sesi wasit aktif pada satu perangkat.

- [ ] **2.1. Dual-Mode Authentication (`/login`)**
  - [ ] Implementasikan login Wasit menggunakan on-screen touch numpad untuk verifikasi PIN Meja.
  - [ ] Implementasikan login Cafe Admin & Super Admin menggunakan form Email & Password.
  - [ ] Hashing password dan PIN menggunakan `bcryptjs`.

- [ ] **2.2. Route Guards & Role-Based Middleware**
  - [ ] Pasang Next.js Middleware di `src/middleware.ts` untuk memproteksi `/admin/*` dan `/superadmin/*`.
  - [ ] Pastikan tidak ada topbar universal yang menyatukan menu antar role.

- [ ] **2.3. Single-Device Session Locking**
  - [ ] Implementasikan pengecekan `activeDeviceId` dan `isLocked` pada tabel `TableMaster` saat wasit login.
  - [ ] Tampilkan pesan peringatan jika meja sedang digunakan oleh perangkat lain.

---

## 📱 Fase 3: Refactoring Wasit Scorer Pad & Auto-Commit Flow

Tujuan: Mengoptimalkan antarmuka wasit di tablet landscape, membuang tombol simpan manual, dan menghubungkan Server Actions.

- [ ] **3.1. Refactor Form Setup Meja (`/wasit/setup`)**
  - [ ] Buat *Cascading Dynamic Form*: Pilihan Mode Aturan -> Pilihan Kategori (Tunggal vs Tim 2v2) -> Input Nama Kursi 1–4 -> Konfigurasi Target & Poin.
  - [ ] Kunci otomatis opsi Tim 2v2 dan target 101 poin jika memilih PB ORADO.
  - [ ] Lebarkan tombol "Simpan & Mulai Sesi Wasit" menjadi `w-full`.

- [ ] **3.2. Refactor Dasbor Wasit (`/wasit/live`)**
  - [ ] Kunci orientasi landscape (`h-screen overflow-hidden`) tanpa scroll vertikal/horizontal.
  - [ ] Tambahkan tombol toggle Fullscreen API (`requestFullscreen()`) di navbar wasit.
  - [ ] Terapkan warna peringkat pada kartu pemain (Rank 1: Gold 👑, Rank 2: Silver 🥈, Rank 3: Bronze 🥉, Rank 4: Brick 🧱).
  - [ ] Tampilkan baris horizontal 5 status ronde terakhir di bawah nama pemain (`[👑 R21] [🔥 R22] ...`).
  - [ ] Hapus teks statis "+3 Ronde Lalu" dan badge generik "Leader".
  - [ ] Tambahkan bar ringkasan akumulasi skor Tim A vs Tim B di bagian atas jika mode Tim 2v2 aktif.
  - [ ] Tambahkan tombol denda cepat melayang (`[+1 Denda]` & `[+4 Denda Passed]`) khusus mode PB PORDI.

- [ ] **3.3. Implementasi Zero-Redundancy Auto-Commit Engine**
  - [ ] Hapus tombol statis "Simpan & Lanjut" di bawah dasbor.
  - [ ] Hubungkan aksi terakhir modal langsung ke Server Action `commitRoundAction()`:
    - [ ] Skenario Kandang (🔥): Auto-commit seketika, 3 pemain lain diset Berdiri (😭).
    - [ ] Skenario Tangkap (🚓): Auto-commit seketika setelah memilih 1 nama korban (💀).
    - [ ] Skenario Menang Biasa/Ceki/Palang: Auto-commit setelah klik "Konfirmasi & Lanjut ➔" di modal status.
    - [ ] Skenario PB ORADO: Auto-commit setelah input total titik sisa via numpad.
  - [ ] Tampilkan Floating Undo Toast selama 4 detik setelah commit: `"Ronde [N] Tersimpan" [ ↺ Urungkan ]`.
  - [ ] Cegah click-through pada kuadran saat modal animasi kemenangan muncul.

- [ ] **3.4. Audit & Rollback Engine (`/wasit/audit`)**
  - [ ] Buat tabel kronologis seluruh ronde pada meja terkait.
  - [ ] Implementasikan Server Action `rollbackRoundAction()` untuk membatalkan ronde terakhir dan merevisi total skor secara otomatis.

---

## 📺 Fase 4: Live Telemetry Leaderboard TV & Realtime Sync

Tujuan: Menghubungkan layar spectator TV warkop dengan aksi wasit secara real-time.

- [ ] **4.1. Setup Supabase Realtime Channel**
  - [ ] Buat listener hook `useMatchRealtime(matchId)` untuk mendengarkan event commit dan rollback ronde.
  - [ ] Pastikan channel terisolasi per `matchId` meja.

- [ ] **4.2. Refactor Halaman Spectator TV (`/admin/leaderboard-tv`)**
  - [ ] Selesaikan masalah infinite loading loop dengan menarik data awal langsung dari database MySQL via server props.
  - [ ] Buat layout 16:9 2-kolom:
    - [ ] Kolom Kiri: Klasemen peringkat dinamis dengan aksen warna rank dan delta poin ronde terakhir.
    - [ ] Kolom Kanan: Grafik garis telemetri pergerakan skor 4 pemain dari Ronde 1 hingga ronde aktif menggunakan Recharts / Canvas.
  - [ ] Tambahkan modal Spectator TV popup khusus meja yang bisa dibuka langsung dari `/wasit/audit`.

---

## 🧪 Fase 5: Pengujian Otomatis (Unit & Integration Testing)

Tujuan: Menjamin seluruh perhitungan skor federasi bebas dari bug atau regresi.

- [ ] **5.1. Unit Testing Engine Aturan Domino**
  - [ ] Pasang testing runner (Vitest / Jest).
  - [ ] Buat test suite `pordi.test.ts`: Uji kasus Menang Biasa, Domi Balak, Ceki Palang, Kandang Tunggal vs Ganda, dan Denda Passed.
  - [ ] Buat test suite `orado.test.ts`: Uji kasus input sisa titik, pengali Dua Ujung Cocok, bonus Balak Habis (+50), dan penalti Balak 0 Mati (13 titik).
  - [ ] Buat test suite `casual.test.ts`: Uji kustomisasi bobot poin.

- [ ] **5.2. Integration Testing FSM Wasit**
  - [ ] Uji alur Auto-Commit modal Kandang, Tangkap, dan Menang Biasa.
  - [ ] Uji fungsi Rollback dan rekalkulasi skor ronde sebelumnya.

---

## 🚀 Fase 6: Verifikasi Produksi & Deployment Hosting

- [ ] **6.1. Audit Kode & Typecheck**
  - [ ] Jalankan `npx tsc --noEmit` dan pastikan 0 error.
  - [ ] Jalankan `npm run lint` untuk memastikan kebersihan kode.
  - [ ] Bersihkan seluruh `console.log` debug.

- [ ] **6.2. Konfigurasi Environment & Deploy Vercel**
  - [ ] Daftarkan variabel `DATABASE_URL` (koneksi MySQL) di Vercel Dashboard.
  - [ ] Daftarkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - [ ] Lakukan deployment produksi dan uji coba simulasi pertandingan 10 meja simultan.