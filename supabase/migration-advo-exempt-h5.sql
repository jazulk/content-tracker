-- ============================================================
-- FIX: bidang Advokasi (username "advo") dikecualikan dari aturan H-5,
-- karena sering ada info yang sifatnya mendadak.
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

create or replace function enforce_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_bidang text;
  v_username text;
begin
  select role, bidang_name, username into v_role, v_bidang, v_username
  from profiles where id = auth.uid();

  new.requested_by := auth.uid();
  new.requested_by_name := v_bidang;

  if v_role = 'bidang' then
    new.status := 'Request';

    -- bidang Advokasi dikecualikan dari H-5 (info sering mendadak)
    if v_username <> 'advo' then
      if new.post_date is null or new.post_date < ((now() at time zone 'Asia/Jakarta')::date + 5) then
        raise exception 'Request cuma bisa diajukan minimal H-5 dari tanggal posting.';
      end if;
    end if;

    -- catatan: validasi jam 08:00-21:00 buat KOLOM post_time udah dihandle
    -- lewat constraint posts_post_time_check, bukan di sini.
  end if;

  if new.submit_date is null then
    new.submit_date := current_date;
  end if;

  return new;
end;
$$;
