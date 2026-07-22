-- ============================================================
-- FITUR: Catat & notif email tiap ada postingan yang DIHAPUS
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- Tabel log terpisah -- SENGAJA nggak di-reference ke posts(id) dengan cascade,
-- soalnya tujuannya justru buat nyimpen bukti WALAU postingan aslinya udah kehapus.
create table if not exists deleted_posts_log (
  id uuid primary key default gen_random_uuid(),
  original_post_id uuid,
  snapshot jsonb not null,
  deleted_by uuid references profiles(id),
  deleted_by_name text,
  deleted_at timestamptz default now()
);

create index if not exists idx_deleted_posts_log_original_id on deleted_posts_log(original_post_id);

alter table deleted_posts_log enable row level security;

-- Cuma admin yang bisa lihat log ini (buat forensik/audit).
drop policy if exists "deleted_posts_log_select_admin" on deleted_posts_log;
create policy "deleted_posts_log_select_admin"
  on deleted_posts_log for select
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- BEFORE DELETE: catat snapshot + siapa yang hapus, SEBELUM row-nya beneran hilang.
create or replace function log_post_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  select bidang_name into v_actor_name from profiles where id = auth.uid();

  insert into deleted_posts_log (original_post_id, snapshot, deleted_by, deleted_by_name)
  values (old.id, to_jsonb(old), auth.uid(), coalesce(v_actor_name, 'System'));

  return old;
end;
$$;

drop trigger if exists trg_log_post_deletion on posts;
create trigger trg_log_post_deletion
  before delete on posts
  for each row execute function log_post_deletion();
