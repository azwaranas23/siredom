---
name: SIREDOM
description: A high-density, gamified dark bento operational system for live domino tournament scoring and table management.
colors:
  background: "#0D0F12"
  surface: "#171A21"
  surface-elevated: "#222631"
  border: "#2A2F3D"
  content: "#FFFFFF"
  content-secondary: "#94A3B8"
  content-muted: "#64748B"
  primary: "#CCFF00"
  secondary: "#00E5FF"
  player-1: "#FB7185"
  player-2: "#6366F1"
  player-3: "#34D399"
  player-4: "#FBBF24"
  win-biasa: "#F59E0B"
  win-kandang: "#EF4444"
  win-ceki: "#10B981"
  win-palang: "#8B5CF6"
  win-tangkap: "#06B6D4"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontWeight: 900
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontWeight: 500
  mono:
    fontFamily: "JetBrains Mono, monospace"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  full: "9999px"
components:
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    borderWidth: "1.5px"
    rounded: "{rounded.xl}"
  button-primary:
    background: "linear-gradient(90deg, {colors.secondary} 0%, #3B82F6 100%)"
    textColor: "#0D0F12"
    fontWeight: 800
    rounded: "{rounded.full}"
  button-keycap:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "12px 6px"
---

# Design System: SIREDOM v2.0

## Overview

**Creative North Star: "The Gamified Bento Tournament Arena"**

SIREDOM adalah antarmuka operasional turnamen domino yang memadukan kedisiplinan kontrol wasit dengan estetika gamifikasi gelap (*Dark Gamified Bento*). Sistem dirancang khusus untuk kecepatan reaksi wasit di bawah tekanan riuhnya meja pertandingan: keterbacaan data instan (*zero cognitive lag*), area sentuh maksimal (*edge-to-edge touch targets*), dan hierarki skor yang mendominasi tanpa elemen visual sampah (*anti-AI slop*).

Sistem ini melayani wasit meja (*touch-first mobile/tablet landscape*), pengelola warkop/PB (*desktop administration*), dan penonton (*Spectator TV broadcast*)[cite: 12].

**Karakter Kunci:**
- **Dark Surface Atmosphere:** Kanvas gelap murni (`#0D0F12`) dengan kontainer bento terisolasi (`#171A21`)[cite: 14].
- **Gamified Palette Hierarchy:** Aksen primer *Acid Lime* (`#CCFF00`) dan *Electric Cyan* (`#00E5FF`), diperkuat identitas 4 kursi pemain (*Coral, Indigo, Emerald, Amber*)[cite: 14].
- **High Data-Density:** Memangkas ruang kosong berlebih; mengoptimalkan bentang layar untuk interaksi sentuhan jari wasit.
- **Micro-Tactile Controls:** Tombol aksi kemenangan bergaya *arcade keycaps* dan *segmented pill switches*[cite: 5, 6].

---

## Colors

Sistem warna menggunakan palet gelap pekat dengan aksen neon fungsional. Warna membawa arti teknis dan status permainan, bukan sekadar dekorasi[cite: 14].

### Surface Tokens
- **Background (`#0D0F12`):** Dasar kanvas aplikasi utama[cite: 14].
- **Card Base (`#171A21`):** Latar kartu bento kuadran pemain, panel setup, dan baris data[cite: 14].
- **Card Elevated (`#222631`):** Permukaan kontrol sub-komponen, input field, kotak emoji riwayat ronde, dan dropdown menu[cite: 14].
- **Border Subtle (`#2A2F3D`):** Garis batas tegas 1px – 1.5px untuk memisahkan hierarki tanpa bayangan blur kotor[cite: 14].

### Accent & Identity Tokens
- **Primary Lime (`#CCFF00`):** Penanda peringkat tertinggi (#1), indikator aktif, status live, dan aksen Tim A[cite: 8, 14].
- **Secondary Cyan (`#00E5FF`):** Metrik data pendukung, tombol CTA submit, penanda ronde aktif, dan aksen Tim B[cite: 8, 14].
- **Player Seat Quadran:**
  - Kursi 1: Vibrant Coral (`#FB7185`)[cite: 8, 14]
  - Kursi 2: Vivid Indigo (`#6366F1`)[cite: 8, 14]
  - Kursi 3: Emerald Mint (`#34D399`)[cite: 8, 14]
  - Kursi 4: Warm Amber (`#FBBF24`)[cite: 8, 14]
- **Victory Action Tokens:**
  - Menang Biasa: Gold (`#F59E0B`)[cite: 5, 6]
  - Kandang: Flame Red (`#EF4444`)[cite: 5, 6]
  - Ceki: Emerald (`#10B981`)[cite: 5, 6]
  - Palang: Purple (`#8B5CF6`)[cite: 5, 6]
  - Tangkap: Cyan Alert (`#06B6D4`)[cite: 5, 6]

---

## Typography

**Font Utama:** `Plus Jakarta Sans` (dengan fallback geometris `system-ui, -apple-system, sans-serif`)[cite: 14].
**Font Monospace:** `JetBrains Mono` / `Consolas` untuk PIN meja, timer, dan audit code[cite: 12].

### Skala Hierarki
- **Hero Dominant Metric (Score Center):** 40px – 68px (`font-weight: 900`, tracking -0.03em)[cite: 6, 7]. Angka skor selalu menjadi pusat visual terbesar di tengah kuadran[cite: 6, 7].
- **Page & Setup Titles:** 18px – 24px (`font-weight: 800`, tracking -0.01em)[cite: 10, 11].
- **Player Names & Card Labels:** 16px – 20px (`font-weight: 700`)[cite: 6, 7].
- **Data Labels & Badge Text:** 10px – 12px (`font-weight: 800`, uppercase tracking 0.04em)[cite: 6, 7].
- **Unit Metadata (`pts`, `ronde`):** 11px – 14px (`font-weight: 700`, color: `#64748B`)[cite: 6, 7].

---

## Layout & Spatial System

### 1. Live Scoring Arena (`/play/live/[tableId]`)
- **Tampilan Tablet/Mobile Landscape:** Terkunci `h-screen`, `overflow: hidden`[cite: 6, 7, 12].
- **2×2 Quadrant Grid:** Membagi layar menjadi 4 kuadran sentuh seimbang (*edge-to-edge touch target*) dengan gap rapat (6px – 8px)[cite: 6, 7].
- **Floating HUD Capsule:**
  - Area tengah atas: Kapsul minimal penunjuk nomor ronde (`RONDE #N`), dirancang *pointer-events: none* agar tidak menghalangi sentuhan wasit ke kartu pemain[cite: 7].
  - Sudut kanan atas: Tombol hamburger menu pintas semi-transparan (`opacity: 0.45` saat idle, `1.0` saat aktif)[cite: 7].
- **Bottom Toast Undo:** Muncul mengambang di bawah selama 3 detik pasca-commit ronde, lalu otomatis menghilang[cite: 7].

### 2. Setup Meja Pertandingan (`/play/live/[tableId]/setup`)
- **Split 2-Panel Layout (Approach B):**
  - **Panel Kiri (Setup Global & Roster):** Pilihan Ruleset bento (Casual, PORDI, ORADO), selector kategori (1v1 vs 2v2), input nama pemain adaptif, dan target match stepper[cite: 9, 10].
  - **Panel Kanan (Matriks Ruleset & Poin):** Daftar aksi custom dengan toggle [ON/OFF] dan stepper `+`/`-` poin jika Mode Casual, atau kotak informasi *Preset Locked* jika mode resmi PB PORDI/ORADO[cite: 9, 10].
- **Desktop Optimization:** Dibungkus container terpusat (`max-width: 1400px` – `1540px`) dengan skala ukuran kartu dan font yang membesar proporsional agar tidak tampak kerdil di layar PC/laptop[cite: 10, 11].

---

## Components Specification

### 1. Arcade Keycaps (Bottom Sheet Aksi)
- Tombol sentuh taktil khusus aksi kemenangan domino di dalam bottom sheet[cite: 5, 6].
- Dilengkapi ikon emoji besar (👑, 🔥, ✔️, 🐐, 🚓), label nama aksi, dan pill bobot nilai poin yang diperoleh (+1, +2, +3, +4)[cite: 5, 6].
- State aktif diberi efek highlight border sesuai warna aksi dengan micro-glow halus[cite: 5, 6].

### 2. Status Segmented Switches
- Kontrol posisi pemain lain (*Duduk vs Berdiri*) pasca-ronde[cite: 5, 6].
- Menggunakan pill container terintegrasi: *Duduk* menggunakan warna biru operasional (`#2563EB`), *Berdiri* menggunakan warna merah penalti (`#DC2626`)[cite: 5, 6].

### 3. Timeline History Pills
- Menampilkan 5 ronde terakhir secara horizontal di bawah skor pemain[cite: 6, 7].
- Dibungkus dalam kotak elevated berukuran `28px – 36px` dengan sudut rounded `8px` dan label ronde kecil di bawahnya[cite: 6, 7].

### 4. Floating Action Undo
- Tombol darurat pemulihan kesalahan input wasit[cite: 6, 7].
- Berbentuk pil merah kontras (`#EF4444`) yang muncul sesaat setelah aksi selesai atau dapat diakses permanen melalui dropdown menu wasit di sudut kanan[cite: 7].

---

## Do's and Don'ts

### Do:
- **Do** pertahankan seluruh kuadran pemain sebagai area sentuh aktif (*clickable/tappable surface*)[cite: 6, 7].
- **Do** pastikan angka skor tetap menjadi elemen visual yang paling dominan di dalam kartu pemain[cite: 4, 6].
- **Do** gunakan *radial-gradient* ambient yang sangat tipis (opasitas 8% – 12%) pada latar kuadran untuk memperkuat identitas warna kursi tanpa mengorbankan keterbacaan data[cite: 6, 7].
- **Do** kunci *preset* bobot poin secara otomatis ketika memilih mode resmi PB PORDI atau PB ORADO[cite: 9, 10].

### Don't:
- **Don't** menggunakan mesh gradient ungu-biru generik atau drop-shadow blur tebal khas template AI generik.
- **Don't** menempatkan navbar horizontal tebal di atas layar live scoring yang memakan ruang vertikal tablet/HP landscape[cite: 3].
- **Don't** memberi warna hijau/lime pada skor angka tinggi jika sistem permainan menganggap angka kecil sebagai pemenang.
- **Don't** menambahkan elemen floating 3D atau ilustrasi dekoratif yang mengalihkan fokus wasit dari pencatatan angka.