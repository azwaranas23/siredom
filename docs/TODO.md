# Project Task Roadmap & Backlog - SIREDOM v0

Dokumen pelacakan tugas, fitur yang telah selesai, serta *roadmap* pengembangan SIREDOM v0.

---

## 1. Fitur & Perbaikan yang Selesai (Completed - Release v0.1.0)

- [x] **Redesign Skema Relational Database**: 7 tabel utama (`Tenant`, `User`, `TableMaster`, `MatchSession`, `Player`, `Round`, `RoundScore`) tersinkron ke Supabase Cloud DB.
- [x] **Next.js Server Actions Prisma**: Implementasi `src/app/actions/tableActions.ts` dengan `revalidatePath('/admin/dashboard')`.
- [x] **Enkripsi Password Bcrypt**: Mengamankan seluruh password Super Admin & Cafe Admin dengan `bcryptjs` (Salt 10 Rounds).
- [x] **Eliminasi Cache LocalStorage Domain**: Menghapus persistence domain dari Zustand store sehingga database menjadi *Single Source of Truth*.
- [x] **Limitasi Kuota Meja Berdasarkan Paket Billing**: Validasi kuota meja otomatis (Basic: 5, Pro: 10, Enterprise: 25) pada `/admin/dashboard` & Modal Superadmin.
- [x] **Sistem Log Dinamis**: Implementasi `/api/system/logs` dan tampilan telemetry real-time pada `/superadmin/system`.
- [x] **Vercel Deployment Compatibility**: Upgrade Next.js ke versi patch aman (`^15.2.0`) untuk menghilangkan peringatan CVE-2025-66478.

---

## 2. Roadmap Pengembangan Selanjutnya (Upcoming & Backlog)

### Phase 1: Realtime WebSockets & Channel Sync
- [ ] Integrasi **Supabase Realtime Channel** / WebSockets untuk pembaruan skor otomatis pada layar Spectator TV (`/admin/leaderboard-tv`) tanpa perlunya polling manual.

### Phase 2: Laporan & Ekspor Audit Match
- [ ] Fitur ekspor laporan rekapitulasi pertandingan Wasit ke format **PDF & Excel (XLSX)** pada halaman `/admin/logs` & `/wasit/audit`.

### Phase 3: Mode Turnamen Sistem Gugur & Bagan (Bracket)
- [ ] Fitur pengelompokan meja ke dalam struktur Turnamen Resmi dengan bagan pertandingan otomatis (*Single Elimination & Swiss System*).
