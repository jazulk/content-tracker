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
  status text not null default 'Ide' check (status in ('Ide','Draft','Terjadwal','Posted','Ditolak')),
  submit_date date,
  post_date date,
  post_time time,
  pic text,
  caption text,
  rejection_note text,
  requested_by uuid references profiles(id),
  requested_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table posts enable row level security;

-- Semua akun yang login (admin & bidang) bisa lihat SEMUA postingan
create policy "posts_select_all_authenticated"
  on posts for select
  to authenticated
  using (true);

-- Semua akun yang login boleh insert (request baru).
-- Nilai requested_by, requested_by_name, dan status di-force oleh trigger di bawah,
-- jadi client tidak bisa menitipkan status lain lewat request body.
create policy "posts_insert_authenticated"
  on posts for insert
  to authenticated
  with check (true);

-- Hanya admin yang boleh update (ubah status, edit, dsb)
create policy "posts_update_admin_only"
  on posts for update
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Hanya admin yang boleh delete
create policy "posts_delete_admin_only"
  on posts for delete
  to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

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
    new.status := 'Ide';
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
