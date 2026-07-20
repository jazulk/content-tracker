-- ============================================================
-- FITUR: History / riwayat perubahan tiap postingan
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- ---------- Tabel ----------
create table if not exists post_history (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  changed_by uuid references profiles(id),
  changed_by_name text,
  changes jsonb not null,
  changed_at timestamptz default now()
);

create index if not exists idx_post_history_post_id on post_history(post_id);

alter table post_history enable row level security;

-- Admin bisa lihat history SEMUA postingan.
-- Bidang cuma bisa lihat history postingan yang mereka ajukan sendiri.
drop policy if exists "post_history_select_admin_or_owner" on post_history;
create policy "post_history_select_admin_or_owner"
  on post_history for select
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (select 1 from posts p where p.id = post_history.post_id and p.requested_by = auth.uid())
  );

-- Tidak ada policy insert/update/delete untuk client -> hanya lewat trigger (security definer) di bawah.

-- ---------- Trigger: catat perubahan tiap INSERT & UPDATE ----------
create or replace function log_post_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '[]'::jsonb;
  v_actor_name text;
  v_fields text[] := array['title','platform','status','post_date','post_time','pic','caption','source_link','rejection_note'];
  f text;
  old_val text;
  new_val text;
  old_json jsonb;
  new_json jsonb;
begin
  select bidang_name into v_actor_name from profiles where id = auth.uid();

  if TG_OP = 'INSERT' then
    v_changes := jsonb_build_array(jsonb_build_object('field', 'created', 'old', null, 'new', 'Request dibuat'));
  else
    old_json := to_jsonb(old);
    new_json := to_jsonb(new);
    foreach f in array v_fields loop
      old_val := old_json ->> f;
      new_val := new_json ->> f;
      if old_val is distinct from new_val then
        v_changes := v_changes || jsonb_build_object('field', f, 'old', old_val, 'new', new_val);
      end if;
    end loop;

    -- nggak ada perubahan field yang dianggap penting -> jangan catat (hindari noise)
    if jsonb_array_length(v_changes) = 0 then
      return new;
    end if;
  end if;

  insert into post_history (post_id, changed_by, changed_by_name, changes)
  values (new.id, auth.uid(), coalesce(v_actor_name, 'System'), v_changes);

  return new;
end;
$$;

drop trigger if exists trg_log_post_history_insert on posts;
create trigger trg_log_post_history_insert
  after insert on posts
  for each row execute function log_post_history();

drop trigger if exists trg_log_post_history_update on posts;
create trigger trg_log_post_history_update
  after update on posts
  for each row execute function log_post_history();
