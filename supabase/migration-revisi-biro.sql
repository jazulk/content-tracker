-- ============================================================
-- MIGRASI: Revisi dari Biro (rename status, jam operasional, H-5, notif revisi)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- Aman dijalankan walau schema.sql versi lama udah pernah di-run.
-- ============================================================

-- 1) Update data lama ke nama status baru DULU (sebelum ganti constraint)
update posts set status = 'Request' where status = 'Ide';
update posts set status = 'On Progress' where status = 'Draft';
update posts set status = 'Siap Posting' where status = 'Terjadwal';
update posts set status = 'Sudah Diposting' where status = 'Posted';

-- 2) Ganti check constraint ke nama status baru
alter table posts drop constraint if exists posts_status_check;
alter table posts add constraint posts_status_check
  check (status in ('Request','On Progress','Siap Posting','Sudah Diposting','Ditolak'));
alter table posts alter column status set default 'Request';

-- 3) Tambah kolom updated_by (buat tau siapa yang terakhir revisi)
alter table posts add column if not exists updated_by uuid references profiles(id);

-- 4) Update trigger insert: nama status baru + validasi jam & H-5
create or replace function enforce_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_bidang text;
begin
  select role, bidang_name into v_role, v_bidang
  from profiles where id = auth.uid();

  new.requested_by := auth.uid();
  new.requested_by_name := v_bidang;

  if v_role = 'bidang' then
    new.status := 'Request';

    if new.post_date is null or new.post_date < ((now() at time zone 'Asia/Jakarta')::date + 5) then
      raise exception 'Request cuma bisa diajukan minimal H-5 dari tanggal posting.';
    end if;

    if extract(hour from (now() at time zone 'Asia/Jakarta')) < 8
       or extract(hour from (now() at time zone 'Asia/Jakarta')) >= 21 then
      raise exception 'Request cuma bisa diajukan jam 08:00 - 21:00 WIB.';
    end if;
  end if;

  if new.submit_date is null then
    new.submit_date := current_date;
  end if;

  return new;
end;
$$;

-- 5) Update trigger update: set updated_by (buat trigger notif revisi)
create or replace function enforce_post_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from profiles where id = auth.uid();

  new.updated_by := auth.uid();

  if v_role <> 'admin' then
    new.status := old.status;
    new.rejection_note := old.rejection_note;
    new.requested_by := old.requested_by;
    new.requested_by_name := old.requested_by_name;
  end if;

  return new;
end;
$$;
