-- ============================================================
-- CRON: jalanin edge function remind-h1 tiap hari jam 08:00 WIB (01:00 UTC)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- Prasyarat: extension pg_cron & pg_net (biasanya sudah aktif di Supabase,
-- kalau belum: Dashboard > Database > Extensions > cari "pg_cron" & "pg_net" > Enable)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- GANTI 2 value di bawah sesuai project kamu sebelum run:
--   1. project-ref (ganti "owoftqxjnstjyrinrdiz" kalau beda)
--   2. WEBHOOK_SECRET (samain persis sama secret yang di-set di edge function)
select cron.schedule(
  'remind-h1-daily',
  '0 1 * * *', -- 01:00 UTC = 08:00 WIB
  $$
  select net.http_post(
    url := 'https://owoftqxjnstjyrinrdiz.supabase.co/functions/v1/remind-h1',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'GANTI_DENGAN_WEBHOOK_SECRET_KAMU'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Buat cek jadwal cron yang udah keset:
-- select * from cron.job;

-- Buat hapus/nonaktifkan kalau perlu:
-- select cron.unschedule('remind-h1-daily');
