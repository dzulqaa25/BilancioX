# Bilancio 🇮🇹

Aplikasi **PWA (Progressive Web App)** pencatat keuangan pribadi khusus iPhone dengan aksen minimalis bernuansa Italia.
Mendukung pencatatan **pemasukan** (*Uang Jajan* & *Lainnya*), **pengeluaran**, **hutang/piutang**, dan **tabungan**, lengkap dengan **analisis AI (Google Gemini)** serta input cepat lewat **iOS Shortcut (Pintasan iPhone)**.

---

## Cara Menjalankan di Laptop (Tanpa Akun Apa Pun — Demo Mode)

```bash
npm install
npm run dev
```

Buka **http://localhost:3000** di browser. Tanpa konfigurasi apa pun, aplikasi langsung berjalan dalam **Demo Mode**.

---

## Panduan Lengkap dari Awal Sampai Terpasang di iPhone (4 Tahap)

### Tahap 1 — Buat Database Gratis di Supabase (5 menit)
1. Daftar/masuk ke [supabase.com](https://supabase.com) → klik **New Project** (pilih region **Singapore**).
2. Di menu kiri, buka **SQL Editor** → klik **New query**.
3. Salin seluruh isi file [`supabase/schema.sql`](./supabase/schema.sql), tempel ke editor, lalu klik **Run**.
4. Buka **Authentication → Providers → Email** → matikan **Confirm email** → klik **Save** (agar pendaftaran akun di aplikasi langsung aktif tanpa verifikasi email).

### Tahap 2 — Ambil Kunci API Supabase & Gemini (3 menit)
1. Di Supabase, buka **Project Settings → API**, lalu salin:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → klik **Create API Key**, lalu salin kuncinya (`GEMINI_API_KEY`).

### Tahap 3 — Online-kan ke Vercel & Pasang di iPhone (5 menit)
1. Upload folder `bilancio` ini ke repositori **GitHub** kamu.
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repositori `bilancio`.
3. Di bagian **Environment Variables**, masukkan 3 kunci dari Tahap 2:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Klik **Deploy**. Setelah selesai, kamu akan mendapatkan alamat web (misal `https://bilancio-kamu.vercel.app`).
5. Buka alamat tersebut di **Safari iPhone**:
   - Ketuk tombol **Share** → pilih **Add to Home Screen** (*Tambahkan ke Layar Utama*).
   - Buka **Bilancio** dari layar utama iPhone, lalu daftar akun di halaman Login.

### Tahap 4 — Buat Pintasan Cepat di iPhone (2 menit)
1. Di aplikasi Bilancio, ketuk ikon profil di kanan atas (**Settings**) → ketuk tombol **Salin Link** pada bagian *iOS Shortcut Setup*.
2. Buka aplikasi **Shortcuts (Pintasan)** bawaan iPhone → ketuk **`+`** di kanan atas → beri nama **"Catat Bilancio"**.
3. Tambahkan **3 aksi** ini secara berurutan:
   - **Ask for Input** (*Minta Input*) → ubah Prompt menjadi: `Catat ke Bilancio (contoh: kopi 18rb)`
   - **URL Encode** (*Kodekan URL*) → otomatis meneruskan teks dari *Provided Input*.
   - **Open URLs** (*Buka URL*) → tempel link yang tadi disalin (`https://.../?quick=`), lalu tepat setelah tanda `=` pilih variabel **URL Encoded Text**.
4. *(Opsional — Sangat Disarankan)* Pasang ke **Ketuk 2× Belakang iPhone**:
   - Buka **Settings iPhone → Accessibility → Touch → Back Tap → Double Tap** → pilih **"Catat Bilancio"**.

### Contoh Kalimat yang Bisa Diketik di Shortcut
- Pengeluaran: `nasi padang 22rb`, `ojol ke kampus 15k`, `fotokopi tugas 12rb`
- Pemasukan: `uang jajan 1,5jt`, `masuk 200rb jual buku`
- Hutang / Piutang: `hutang ke Budi 50rb beli buku`, `piutang Sinta 35rb talangin makan`
- Tabungan: `nabung liburan 100rb`
