# Product Requirement Document (PRD) - SIREDOM v0

**SIREDOM (Sistem Rekapitulasi Domino)** adalah platform Software-as-a-Service (SaaS) modern berbasis web yang dirancang khusus untuk mengelola turnamen dan pencatatan skor pertandingan domino secara *real-time* di cafe, warkop, maupun event olahraga domino di Indonesia.

---

## 1. Visi & Tujuan Produk
- **Digitalisasi Rekapitulasi Domino**: Menggantikan pencatatan kertas manual dengan antarmuka digital yang presisi, cepat, dan transparan.
- **SaaS Multi-Tenant untuk Warkop & Cafe**: Memungkinkan pengelola cafe mendaftarkan venue mereka dan mengelola banyak meja pertandingan secara independen.
- **Pengalaman Penonton Interaktif**: Menyediakan layar TV Spectator dengan grafik telemetri, papan peringkat (*leaderboard*), dan penghargaan unik (*Fun Awards*).

---

## 2. Peran Pengguna (User Roles)

| Peran | Deskripsi & Hak Akses | Portal URL |
| :--- | :--- | :--- |
| **Super Admin** | Pengelola utama SaaS SIREDOM. Berhak mendaftarkan tenant cafe baru, menentukan paket billing, mengatur suspension, dan memantau log sistem. | `/superadmin/tenants`<br>`/superadmin/system` |
| **Cafe Admin** | Pengelola cafe/warkop mitra. Berhak membuat meja baru, mereset PIN wasit, melihat rekapitulasi pertandingan venue, dan mengelola spectating TV. | `/admin/dashboard`<br>`/admin/logs`<br>`/admin/rules` |
| **Wasit / Scorer** | Wasit lapangan di setiap meja. Bertanggung jawab menginput skor ronde per ronde melalui Finite State Machine (FSM) scoring engine. | `/wasit/setup`<br>`/wasit/live`<br>`/wasit/audit` |
| **Penonton (Spectator)** | Penonton di lokasi warkop/cafe yang melihat statistik live, grafik skor, dan peringkat di layar TV secara *real-time*. | `/admin/leaderboard-tv` |

---

## 3. Fitur Utama & Spesifikasi Fungsional

### 3.1. Tata Kelola Multi-Tenant & Billing Plan
- **Skema Paket Billing**:
  - **Basic**: Kuota Maksimal **5 Meja**
  - **Pro**: Kuota Maksimal **10 Meja**
  - **Enterprise**: Kuota Maksimal **25 Meja**
- **Validasi Kuota Otomatis**: Sistem menolak penambahan meja jika telah mencapai batas kuota paket billing.

### 3.2. FSM Scoring Engine (Aturan Pertandingan Domino)
- **4 Kursi Pemain Per Meja**: (Seat 1: Merah, Seat 2: Biru, Seat 3: Hijau, Seat 4: Kuning).
- **Aksi Poin Khusus**:
  - **Menang Biasa**: +1 Poin (Pemenang)
  - **Kandang**: +2 Poin (Pemenang)
  - **Ceki**: +3 Poin (Pemenang)
  - **Palang**: +4 Poin (Pemenang)
  - **Tangkap**: +3 Poin (Pemenang) & Korban di-tag `DITANGKAP`.

### 3.3. Telemetri & Fun Awards Pertandingan
- **Telemetri Live**: Grafik pergerakan skor per ronde (R0 s/d RN).
- **Fun Awards Automatic Calculator**:
  - 👑 *Raja Kandang*: Pemain dengan jumlah kemenangan kandang terbanyak.
  - 🪵 *Terbanyak Palang*: Pemain dengan aksi palang terbanyak.
  - 🎯 *Ceki Master*: Pemain dengan poin ceki terbanyak.
  - 🕳️ *Paling Sering Ditangkap*: Pemain yang paling sering menjadi korban tangkap.

### 3.4. Keamanan & Persistensi Data
- **Enkripsi Bcrypt**: Seluruh password pengguna di-hash menggunakan `bcryptjs` (Salt 10 Rounds).
- **Supabase Cloud PostgreSQL**: Single Source of Truth database terhubung via Prisma ORM.

---

## 4. Metrik Keberhasilan & Non-Functional Requirements
- **Response Time**: Response time Server Actions & API < 100ms.
- **Cross-Session Consistency**: Data 100% konsisten antara browser biasa & Incognito.
- **Build Quality**: 0 TypeScript Compilation Errors (`npx tsc --noEmit`).
