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
Notifikasi email ke ketua Mulmed & Pubinfo saat ada request baru. Ini butuh setup tambahan (Supabase Edge Function + layanan email kayak Resend, butuh API key terpisah). Bilang aja kalau mau lanjut ke bagian ini.

## Catatan Keamanan
Hak akses (bidang cuma bisa insert, admin bisa update/delete) dikunci lewat Row Level Security di database — bukan cuma disembunyikan di tampilan. Jadi walau ada yang coba akses API langsung, aturannya tetap berlaku.
