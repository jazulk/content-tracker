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

## Setup Notifikasi Email (Request Baru → Ketua Mulmed & Pubinfo)

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


## Catatan Keamanan
Hak akses (bidang cuma bisa insert, admin bisa update/delete) dikunci lewat Row Level Security di database — bukan cuma disembunyikan di tampilan. Jadi walau ada yang coba akses API langsung, aturannya tetap berlaku.
