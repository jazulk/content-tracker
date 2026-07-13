-- ============================================================
-- Content Tracker — Schema Supabase
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- PROFILES ----------
-- Menyimpan role & nama bidang untuk tiap akun auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null check (role in ('admin','bidang')),
  bidang_name text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_all_authenticated" on profiles;
create policy "profiles_select_all_authenticated"
  on profiles for select
  to authenticated
  using (true);

-- Tidak ada policy insert/update/delete untuk client -> hanya lewat seed script (service_role)

-- ---------- POSTS ----------
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null check (platform in ('Instagram','TikTok','YouTube','Website BEM')),
  status text not null default 'Request' check (status in ('Request','On Progress','Siap Posting','Sudah Diposting','Ditolak')),
  submit_date date,
  post_date date,
  post_time time check (post_time is null or (post_time >= '08:00' and post_time <= '21:00')),
  pic text,
  caption text,
  source_link text,
  rejection_note text,
  requested_by uuid references profiles(id),
  requested_by_name text,
  updated_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table posts enable row level security;

-- Semua akun yang login (admin & bidang) bisa lihat SEMUA postingan
drop policy if exists "posts_select_all_authenticated" on posts;
create policy "posts_select_all_authenticated"
  on posts for select
  to authenticated
  using (true);

-- Semua akun yang login boleh insert (request baru).
-- Nilai requested_by, requested_by_name, dan status di-force oleh trigger di bawah,
-- jadi client tidak bisa menitipkan status lain lewat request body.
drop policy if exists "posts_insert_authenticated" on posts;
create policy "posts_insert_authenticated"
  on posts for insert
  to authenticated
  with check (true);

-- Admin boleh update semua. Bidang boleh update HANYA postingan miliknya sendiri
-- (status tetap dikunci lewat trigger di bawah, terlepas dari policy ini).
drop policy if exists "posts_update_admin_only" on posts;
create policy "posts_update_own_or_admin"
  on posts for update
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or requested_by = auth.uid()
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or requested_by = auth.uid()
  );

-- Admin boleh delete semua. Bidang boleh delete HANYA postingan miliknya sendiri.
drop policy if exists "posts_delete_admin_only" on posts;
create policy "posts_delete_own_or_admin"
  on posts for delete
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or requested_by = auth.uid()
  );

-- ---------- TRIGGER: kunci requested_by & status saat insert ----------
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

  -- kalau yang insert adalah akun bidang, status WAJIB 'Ide' apapun yang dikirim client
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

drop trigger if exists trg_enforce_post_insert on posts;
create trigger trg_enforce_post_insert
  before insert on posts
  for each row execute function enforce_post_insert();

-- ---------- TRIGGER: auto-update updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- ---------- TRIGGER: kunci status saat bidang edit postingan sendiri ----------
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

drop trigger if exists trg_enforce_post_update on posts;
create trigger trg_enforce_post_update
  before update on posts
  for each row execute function enforce_post_update();
