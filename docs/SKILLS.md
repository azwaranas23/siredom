# SKILLS - Spesifikasi Logika Bisnis & Aturan Perhitungan Skor Domino

> **Manual Domain Knowledge & Ruleset Calculation Engine**  
> **Sistem:** SIREDOM (Sistem Rekapitulasi Domino) v2.0  
> **Cakupan Regulasi:** PB PORDI, PB ORADO, Casual Warkop  
> **Rujukan induk:** [`PRD.md`](./PRD.md) — matriks regulasi ringkas ada di sana; file ini memuat detail matematisnya.

---

## 1. Tata Letak Pemain & Pemetaan Tim (Seating & Pairing)

Pertandingan domino standar pada SIREDOM melibatkan 4 orang pemain yang duduk mengelilingi 1 meja.

### 1.1. Penamaan Kursi & Identifikasi Tim (Kategori Tim 2v2)

Dalam kategori **TEAM_2V2** (Pasangan/Ganda), pemain yang duduk saling berhadapan membentuk satu tim yang sama:

| Nomor Kursi | Warna Identifikasi | Penugasan Tim | Posisi Kompas |
|:---|:---|:---|:---|
| **Kursi 1** | Merah | **TIM A** (Merah - Hijau) | Utara |
| **Kursi 2** | Biru | **TIM B** (Biru - Kuning) | Timur |
| **Kursi 3** | Hijau | **TIM A** (Merah - Hijau) | Selatan |
| **Kursi 4** | Kuning | **TIM B** (Biru - Kuning) | Barat |

> **Aturan Agregasi Poin Tim:** Poin yang didapatkan atau penalti yang diterima oleh salah satu pemain berkontribusi langsung pada total akumulasi skor timnya:
> $$\text{Skor Tim A} = \text{Poin Kursi 1} + \text{Poin Kursi 3}$$
> $$\text{Skor Tim B} = \text{Poin Kursi 2} + \text{Poin Kursi 4}$$

---

## 2. Detail Spesifikasi Ruleset & Formula Matematis

### 2.1. Ruleset PB PORDI (Standar Resmi PB PORDI)

PB PORDI menggunakan sistem **bobot poin tindakan tetap**:

* **Target Selesai Pertandingan:**
  * **Kategori Tunggal (1v1v1v1):** Wajib **Fixed 7 Gocokan/Ronde**. Pemain dengan akumulasi poin tertinggi keluar sebagai pemenang. Jika terjadi skor seri pada Peringkat 1, diadakan *Additional Game* (1 ronde tambahan / Overtime).
  * **Kategori Ganda (2v2):** Wajib **Race to 7 Poin**. Tim yang pertama kali menyentuh angka 7 memenangkan set.
* **Hak Pembuka Jalan (Smash Off):**
  * Ronde 1: Wajib pemain yang memegang **Balak 6** (Enam-Enam).
  * Ronde $N+1$: Pemain yang memenangkan (**Domi**) ronde sebelumnya.
* **Matriks Poin Aksi (PORDI):**
  * `DOMI_BIASA`: **+1 Poin** (Menang domi normal satu sisi).
  * `DOMI_BALAK`: **+2 Poin** (Menang satu sisi menggunakan kartu balak).
  * `DOMI_CEKI_BIASA`: **+2 Poin** (Kartu terakhir cocok di kedua ujung jalur terbuka).
  * `DOMI_CEKI_HABIS` / `DOMI_CEKI_BALAK`: **+3 Poin**.
  * `DOMI_CEKI_PALANG_APOLLO`: **+4 Poin** (Domi balak saat kedua sisi angka habis di meja).
  * `DOMI_KANDANG`: Mengunci kedua sisi kartu dan menang hitungan titik terkecil:
    * Kategori Tunggal: **+3 Poin** untuk pengunci jika titik terkecil.
    * Kategori Ganda: **+2 Poin** untuk tim pengunci jika titik terkecil.
* **Sistem Denda Cepat Wasit (PORDI Pasal 14):**
  * `DENDA_RINGAN` (**+1 Poin Lawan**): Salah turun kartu, kartu jatuh saat putaran berjalan, atau meletakkan kartu di meja.
  * `DENDA_PASSED_PALSU` (**+4 Poin Lawan**): Mengaku *passed* (lewat) padahal kartu yang dimaksud masih ada di tangan. Ronde langsung dihentikan dan poin langsung dihadiahi ke lawan.
  * `DENDA_TURUN_GANDA` (**+3 Poin Lawan**): Menurunkan dua kartu atau lebih secara bersamaan.

---

### 2.2. Ruleset PB ORADO (The Law of Domino 101)

PB ORADO menggunakan sistem **akumulasi sisa titik batu lawan**:

* **Target Selesai Pertandingan:**
  * Khusus kategori **Tim / Ganda (2v2)** dengan sistem **Race to 101 Poin per Set** (Format pertandingan: *Best of 3 Sets*).
* **Hak Pembuka Jalan (Looping Balak):**
  * Ronde 1: Wajib pemegang **Balak 0** (Kosong-Kosong).
  * Ronde 2: Wajib pemegang **Balak 1**.
  * Berlanjut berurutan hingga Ronde 7 (Balak 6), lalu kembali berulang ke Balak 0 jika target 101 poin belum tercapai.
* **Formula Perhitungan Skor Ronde (ORADO):**
  $$\text{PointsAwarded} = \text{TotalDots}(\text{Sisa Kartu Tim Kalah}) \times \text{Multiplier} + \text{Bonus}$$
  * **Kemenangan Normal:** Poin = Total jumlah titik sisa batu di tangan tim lawan ($\text{Multiplier} = 1$).
  * **Dua Ujung Cocok:** Jika kartu penutup cocok di kedua ujung, poin sisa kartu lawan **dikali 2** ($\text{Multiplier} = 2$).
  * **Balak Terakhir Ujung Habis:** Poin sisa kartu lawan **ditambah 50 poin bonus** ($\text{Bonus} = 50$).
  * **Batu Macet / Beradu (Kandang):**
    * Jika tim yang menutup menang titik terendah: Mendapat total titik sisa semua pemain.
    * Jika seri: Poin diberikan ke tim lawan.
    * Jika tim lawan yang menang titik terendah: Total titik sisa semua pemain **dikali 2** dan diberikan ke tim lawan.
  * **Penalti Balak 0 Mati:** Balak kosong-kosong (0/0) yang tidak berhasil diturunkan dihitung bernilai **13 Titik**.
  * **Kemenangan Mutlak Apollo:** Jika tim mencapai $\ge 101$ poin sementara tim lawan masih $0$ poin, tim pemenang langsung dinyatakan memenangkan 2 set sekaligus (menang mutlak).

---

### 2.3. Ruleset Casual (Santai Warkop)

Mode fleksibel yang dapat dikonfigurasi secara bebas per meja turnamen/warkop:

* **Target Pertandingan:** Pilihan antara *Fixed Rounds* (misal 10 atau 25 ronde) atau *Race to Points* (misal 50 atau 100 poin).
* **Kategori Pertandingan:** Mendukung `SINGLE_1V1V1V1` dan `TEAM_2V2`.
* **Matriks Bobot Aksi Default (Dapat Disesuaikan):**
  ```json
  {
    "menang_biasa": 1,
    "kandang": 2,
    "ceki": 3,
    "palang": 4,
    "tangkap": 3,
    "ditangkap": -3,
    "berdiri": -1,
    "duduk": 0
  }
  ```

---

## 3. Logika Transisi FSM & Auto-Commit Engine

Kalkulasi skor ronde dieksekusi secara murni (*pure logic*) melalui implementasi `IRulesetEngine`:

$$\text{ScoreAfter}_{i} = \text{ScoreBefore}_{i} + \Delta\text{Points}_{i}$$

```
+-----------------------------------------------------------------------------------+
| ALUR SKENARIO AKSI (AUTO-COMMIT)                                                  |
+-----------------------------------------------------------------------------------+
| 1. Skenario C (KANDANG 🔥) [2 Klik]:                                              |
|    - Pemenang: +Points(kandang)                                                   |
|    - 3 Pemain Sisa: Otomatis diset "BERDIRI" (😭) -> Delta: Points(berdiri)        |
|    - Auto-Commit seketika ke database tanpa modal tambahan.                       |
|                                                                                   |
| 2. Skenario B (TANGKAP 🚓) [3 Klik]:                                              |
|    - Pemenang: +Points(tangkap)                                                   |
|    - 1 Korban Dipilih: Otomatis diset "DITANGKAP" (💀) -> Delta: Points(ditangkap)|
|    - 2 Pemain Sisa: Otomatis diset "DUDUK" (🪑) -> Delta: 0                       |
|    - Auto-Commit seketika setelah korban dipilih.                                 |
|                                                                                   |
| 3. Skenario A (MENANG BIASA 👑, CEKI ✅, PALANG 🐐):                              |
|    - Pemenang: +Points(aksi)                                                      |
|    - 3 Pemain Sisa: Wasit memilih manual (😭 Berdiri / 🪑 Duduk)                  |
|    - Auto-Commit saat tombol modal "Konfirmasi & Lanjut ➔" diklik.                |
+-----------------------------------------------------------------------------------+
```

---

## 4. Mesin Kalkulasi Ulang (Recalculation & Rollback Engine)

Jika terjadi *Rollback* atau koreksi data pada ronde masa lalu di halaman `/play/live/[tableId]/audit`:

1. **Pembuangan Ronde Terakhir (LIFO):** Rollback membuang ronde paling akhir dari dokumen `roundsHistory`.
2. **Rekonstruksi Skor:** Skor setiap pemain dihitung ulang dari sisa riwayat (akumulasi `pointsAwarded` miliknya), lalu ditulis kembali ke dokumen `playersData` — menjaga invarian bahwa skor akhir selalu dapat direkonstruksi dari riwayat ronde.
3. **Database & Realtime Broadcast:** Dokumen `MatchSession` diperbarui dalam satu mutasi Prisma, dan event pembaruan dipancarkan ke `/admin/leaderboard-tv`.