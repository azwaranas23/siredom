# SIREDOM

Sistem Rekapitulasi Domino — platform web pencatatan skor pertandingan domino multi-meja untuk ekosistem santai (warkop) dan turnamen resmi federasi (PB PORDI, PB ORADO). Glosarium ini adalah sumber istilah resmi proyek; gunakan istilah di sini secara konsisten di kode, dokumen, issue, dan diskusi.

## Aktor & Organisasi

**Penyelenggara**:
Organisasi pengguna sistem (warkop, cafe, atau pengurus federasi) yang memiliki meja dan sesi pertandingan. Satu Penyelenggara = satu `Tenant`.
_Avoid_: tenant mentah, cafe, mitra, client, penyewa

**Kode Penyelenggara**:
Identitas unik Penyelenggara yang diketik wasit di portal masuk (contoh: `TAB-SLOWBAR`); di kode bernama `tenantCode`. Bukan rahasia — PIN-lah yang mengamankan akses meja.
_Avoid_: tenant ID, API key

**Wasit**:
Petugas lapangan pemegang satu meja selama pertandingan; masuk lewat portal `/play` dengan kombinasi Penyelenggara + Nomor Meja + PIN Meja.
_Avoid_: referee, juri, scorer

**Admin**:
Pengelola satu Penyelenggara; mengurus master meja, aturan poin custom, dan Leaderboard TV via `/login`.

**Super Admin**:
Pengelola lintas-Penyelenggara (platform); mengatur akun Penyelenggara dan kuota meja.

## Meja & Sesi

**Meja**:
Satu unit fisik tempat pertandingan berlangsung (`TableMaster`): punya nomor unik per Penyelenggara dan PIN sendiri.
_Avoid_: table (di luar konteks DB), board, lapangan

**PIN Meja**:
Kode 4 digit milik satu Meja untuk otorisasi Wasit. Rahasia; tidak pernah dikirim ke klien.

**Sesi Pertandingan**:
Satu pertandingan aktif atau selesai pada satu Meja (`MatchSession`) — memuat konfigurasi mode, empat pemain, dan riwayat ronde. Satu Meja maksimal satu Sesi aktif.
_Avoid_: match, game, sesi game

**Kunci Sesi (Session Locking)**:
Mekanisme satu-perangkat: Meja terkunci pada satu `deviceId` selama Sesi berjalan; perangkat lain tidak bisa merebut hingga dilepas.

**Routing Dinamis Meja**:
Isolasi Sesi per Meja melalui URL unik `/play/live/[tableId]`.

## Pemain & Posisi

**Pemain**:
Salah satu dari empat peserta dalam satu Sesi; identik dengan posisi duduknya, bukan orang permanen (tanpa statistik lintas-Sesi).

**Kursi**:
Posisi duduk 1–4 dengan warna tetap: 1 Merah, 2 Biru, 3 Hijau, 4 Kuning.

**Tim A / Tim B**:
Pasangan Kursi 1+3 (Merah–Hijau) = Tim A; Kursi 2+4 (Biru–Kuning) = Tim B. Hanya relevan pada kategori Ganda.

**Ronde**:
Satu babak permainan dalam sebuah Set; setiap Ronde menghasilkan satu aksi penutup dan delta poin untuk keempat Pemain.
_Avoid_: game, babak ganda

**Set**:
Unit pertandingan di atas Ronde; hanya ORADO yang memakai struktur Set (Best of 3). Mode lain berjalan dalam satu Set logis.

## Mode & Aturan Main

**Mode Aturan (Ruleset)**:
Paket regulasi yang menentukan UI, input, dan hitungan: Casual, PB PORDI, atau PB ORADO (`RulesetMode`). Antarmuka dan kalkulasi terisolasi penuh per mode.
_Avoid_: ruleset engine (itu implementasinya), tipe permainan

**Casual**:
Mode santai warkop "kalah berdiri, menang duduk"; bobot poin aksi dapat dikustom per Penyelenggara.

**PB PORDI**:
Regulasi federasi: Tunggal Fixed 7 Ronde, Ganda Race to 7 Poin, bobot aksi tetap, berisi Panel Denda Cepat dan **Timedomi**.

**PB ORADO**:
Regulasi federasi khusus Ganda: Race to 101 Poin per Set, Best of 3, input lewat Numpad hitung titik.

**Kategori Tunggal / Ganda**:
Tunggal = 1v1v1v1 (empat individu); Ganda = 2v2 (dua tim). ORADO mengunci ke Ganda.
_Avoid_: single/double (pakai istilah Indonesia di dokumen)

**Target**:
Batas akhir Sesi: jumlah Ronde tetap atau angka poin, tergantung mode (`targetType`, `targetValue`).

**Overtime**:
Ronde tambahan otomatis saat Ronde terakhir berakhir seri di Peringkat 1 (Fixed Rounds).

## Aksi Penutup Ronde

**Aksi Penutup**:
Keputusan wasit yang mengakhiri Ronde dan memicu penyimpanan instan; nilainya salah satu `ActionType` di bawah.

**Menang Biasa**:
Domi normal satu sisi (+1). Pemenang ditentukan; tiga pemain lain diberi status manual.
_Avoid_: menang domi biasa, win normal

**Kandang**:
Penutup mengunci kedua sisi jalur sehingga menang hitungan titik terkecil; tiga pemain lain otomatis Berdiri.
_Avoid_: lockout, blocked game

**Ceki**:
Kartu penutup cocok di kedua ujung jalur terbuka.
_Avoid_: ceki palang tanpa konteks (lihat Palang)

**Palang**:
Domi balak saat kedua sisi angka habis di meja (poin tertinggi di kelompok aksi domi).
_Avoid_: goat (emoji saja yang boleh: 🐐)

**Tangkap**:
Pemenang menangkap pelanggar alur; satu Korban ditunjuk, dua pemain lain otomatis Duduk.
_Avoid_: catch,ENC

**Hitungan ORADO (ORADO Count)**:
Input numerik sisa titik batu lawan via numpad; satu-satunya aksi dengan masukan angka bebas.

**Denda Poin**:
Penalti instan oleh wasit di mode PORDI: Ringan +1 atau Passed Palsu +4, langsung menjadi poin lawan.
_Avoid_: penalty (Inggris), sanksi

**Berdiri**:
Status pemain kalah pada ronde ("kalah berdiri"); tag `BERDIRI` 😭.

**Duduk**:
Status pemain netral/aman pada ronde ("menang duduk"); tag `DUDUK` 🪑.

**Korban**:
Pemain yang Ditangkap pada aksi Tangkap; tag `DITANGKAP` 💀.

## Istilah Kartu & Federasi

**Balak**:
Kartu dengan angka kembar (0-0 s.d. 6-6). Menentukan hak pembuka dan beberapa bonus ORADO.
_Avoid_: double, kartu ganda

**Domi**:
Kondisi habis semua kartu di tangan seorang pemain/tim — dasar kemenangan ronde pada PORDI/Casual.
_Avoid_: out, finish

**Hak Pembuka (Smash Off)**:
Kewajiban pemegang kartu pembuka Ronde 1: Balak 6 (PORDI) atau Balak 0 (ORADO); ronde berikutnya mengikuti aturan mode.

**Dua Ujung Cocok**:
Multiplier ORADO ×2 saat kartu penutup cocok di kedua ujung jalur.

**Balak Habis**:
Bonus ORADO +50 saat balak terakhir di ujung turun habis.

**Balak 0 Mati**:
Penalti ORADO: Balak 0 yang tak sempat diturunkan dihitung 13 titik.

**Batu Macet (Beradu)**:
Kondisi jalur tertutup; pemenang titik terkecil memperoleh sisa titik (dengan aturan pengali khusus bila penutup kalah).

**Apollo**:
Kemenangan mutlak ORADO: mencapai ≥101 sementara lawan masih 0 — langsung menang 2 Set.
_Avoid_: kemenangan mutlak sebagai istilah tunggal (gunakan "Apollo")

## Perangkat Produk

**Scorer Pad**:
Layar utama wasit per Meja: kuadran 2×2 pemain, landscape, touch-friendly, tempat seluruh aksi Ronde diinput.

**Auto-Commit Tanpa Redundansi**:
Prinsip produk: tidak ada tombol simpan; penyimpanan terjadi pada langkah penutup tiap skenario aksi (Kandang 2 ketukan, Tangkap 3 ketukan, dsb.).

**Undo Toast**:
Notifikasi melayang 4 detik pasca-Ronde dengan tombol urungkan satu Ronde terakhir.
_Avoid_: undo button, tombol batal

**Rollback**:
Pembatalan satu Ronde terakhir dengan rekonstruksi skor dari sisa riwayat; juga dasar reset meja ke Ronde awal.

**History Pills**:
Deretan ikon 5 Ronde terakhir di kartu tiap Pemain sebagai jejak visual cepat.

**Leaderboard TV**:
Halaman layar besar `/admin/leaderboard-tv` untuk proyeksi klasemen dan grafik telemetri ke Smart TV; menerima pembaruan realtime per Sesi.

**Timedomi**:
Stopwatch digital khusus mode PB PORDI di layar wasit untuk durasi pikir pemain; diaktifkan manual.
