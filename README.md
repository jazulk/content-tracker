# Content Tracker — Setup

## 1. Setup Database Supabase
1. Buka project Supabase kamu → **SQL Editor** → New query.
2. Copy-paste isi `supabase/schema.sql` → Run.

## 2. Bikin 10 Akun
1. Ambil **service_role key** (Project Settings > API > service_role — JANGAN dishare ke siapa pun, cuma dipakai sekali di komputer sendiri).
2. Di folder `supabase/`, jalankan:
   ```
   npm install @supabase/supabase-js
   ```
3. Buka `seed-users.js`, isi `SERVICE_ROLE_KEY`.
4. Jalankan:
   ```
   node seed-users.js
   ```
   Ini bikin 10 akun: pengmas, litbang, kwu, lugri, dagri, kader, advo, senor (role bidang), mulmed & pubinfo (role admin). Username = password.

## 3. Jalankan App di Lokal
```
npm install
cp .env.example .env
npm run dev
```
`.env` udah keisi Project URL & anon key kamu, tinggal cek aja.

## 4. Deploy ke Vercel
1. Push folder ini ke GitHub repo.
2. Import repo di Vercel.
3. Di Vercel > Project Settings > Environment Variables, tambahin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (isinya sama kayak di `.env`)
4. Deploy.

## Belum termasuk di versi ini
~~Notifikasi email~~ → sudah ada, lihat bagian "Setup Notifikasi Email" di bawah.

## Revisi dari Biro (Update Terbaru)

### 1. Jalankan migrasi database
Run `supabase/migration-revisi-biro.sql` di Supabase SQL Editor (aman dijalankan walau `schema.sql` versi lama udah pernah di-run). Isinya:
- Rename status lama ke nama baru: Ide→Request, Draft→On Progress, Terjadwal→Siap Posting, Posted→Sudah Diposting
- Validasi di level database: bidang cuma bisa request jam 08:00–21:00 WIB, dan minimal H-5 dari tanggal posting
- Kolom baru `updated_by` buat lacak siapa yang terakhir revisi (dipakai buat notifikasi email)

### 2. Deploy ulang Edge Function
File `supabase/functions/notify-new-request/index.ts` udah diupdate biar bisa kirim 2 jenis notif (request baru & revisi). Deploy ulang:
```
supabase functions deploy notify-new-request --no-verify-jwt
```

### 3. Tambah Database Webhook baru buat event Update
Selain webhook lama (Insert), bikin 1 lagi:
1. Dashboard → **Database** → **Webhooks** → **Create a new hook**
2. Name: `notify-revision`
3. Table: `posts`
4. Events: centang **Update** aja
5. Type: **Supabase Edge Functions** → pilih `notify-new-request` (function yang sama, dia otomatis bedain Insert vs Update)
6. HTTP Headers: sama kayak sebelumnya, `x-webhook-secret` = value `WEBHOOK_SECRET`
7. Save

Sekarang tiap bidang edit request yang udah mereka submit, admin otomatis dapet email "Ada revisi pada request".



### 1. Siapkan akun Gmail pengirim
1. Pakai akun Gmail (bisa akun baru khusus buat ini, atau akun pribadi).
2. Aktifkan **2-Step Verification**: myaccount.google.com/security.
3. Bikin **App Password**: myaccount.google.com/apppasswords → pilih app "Mail" → generate → copy 16 digit passwordnya (beda sama password Gmail biasa).

### 2. Install Supabase CLI (kalau belum ada)
```
npm install -g supabase
supabase login
```

### 3. Link project & deploy function
Di folder root project:
```
supabase link --project-ref owoftqxjnstjyrinrdiz
supabase functions deploy notify-new-request --no-verify-jwt
```

### 4. Set secrets (isi sesuai punya lo)
```
supabase secrets set GMAIL_USER=emailpengirim@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=16digitapppassword
supabase secrets set ADMIN_EMAIL_MULMED=emailketuamulmed@gmail.com
supabase secrets set ADMIN_EMAIL_PUBINFO=emailketuapubinfo@gmail.com
supabase secrets set WEBHOOK_SECRET=bikinstringrandomsendiribuatpassword
```

### 5. Bikin Database Webhook di Dashboard
1. Dashboard Supabase → **Database** → **Webhooks** → **Create a new hook**
2. Name: `notify-new-request`
3. Table: `posts`
4. Events: centang **Insert** aja
5. Type: **Supabase Edge Functions**
6. Edge Function: pilih `notify-new-request`
7. HTTP Headers: tambah header `x-webhook-secret` = (nilai yang sama persis dengan `WEBHOOK_SECRET` di step 4)
8. Save

### 6. Testing
Login pakai salah satu akun bidang, submit request baru → cek inbox 2 email ketua (cek folder spam juga kalau belum masuk).


## 7. Upgrade Pack: History & Reminder H-1

### 7.1 Fitur History (riwayat perubahan tiap postingan)
Kalau database kamu **udah pernah** di-setup sebelumnya (bukan fresh install), run `supabase/migration-post-history.sql` di SQL Editor. Kalau ini fresh install baru dari `schema.sql`, fiturnya udah otomatis ikut karena udah digabung ke `schema.sql`.

Yang didapat:
- Setiap perubahan (judul, status, tanggal posting, dll) otomatis kecatat siapa yang ubah & kapan
- Bisa dilihat di form edit postingan, expand bagian "Riwayat Perubahan"
- Admin bisa lihat history SEMUA postingan; bidang cuma bisa lihat history postingan miliknya sendiri

### 7.2 Reminder H-1 (email otomatis buat postingan besok)
1. Deploy edge function baru:
   ```
   supabase functions deploy remind-h1 --no-verify-jwt
   ```
2. Function ini pakai secrets yang sama kayak `notify-new-request` (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAILS`, `WEBHOOK_SECRET`) — kalau udah di-set sebelumnya, nggak perlu di-set ulang.
3. Setup jadwal otomatis harian: run `supabase/migration-cron-h1-reminder.sql` di SQL Editor. **Sebelum run**, edit dulu 2 bagian di file itu:
   - URL project (ganti `owoftqxjnstjyrinrdiz` kalau project-ref kamu beda)
   - Value `WEBHOOK_SECRET` (samain persis sama yang di-set di step 4 bagian "Setup Notifikasi Email")
4. Function ini jalan otomatis tiap jam 08:00 WIB, ngecek postingan yang jadwalnya BESOK dan belum "Sudah Diposting", terus kirim 1 email ringkasan ke admin.
5. Testing manual (tanpa nunggu jadwal cron): jalanin lewat terminal —
   ```
   curl -X POST https://owoftqxjnstjyrinrdiz.supabase.co/functions/v1/remind-h1 \
     -H "x-webhook-secret: isi_sama_dengan_WEBHOOK_SECRET"
   ```

## Catatan Keamanan
Hak akses (bidang cuma bisa insert, admin bisa update/delete) dikunci lewat Row Level Security di database — bukan cuma disembunyikan di tampilan. Jadi walau ada yang coba akses API langsung, aturannya tetap berlaku.
