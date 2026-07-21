-- ============================================================
-- FITUR: Siapin role "viewer" (read-only) buat BPH/Biro -- infrastruktur doang,
-- belum bikin akunnya. Nanti kalau butuh, tinggal bikin akun pakai manage-account.js
-- dengan role "viewer".
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1) Izinin role "viewer" di tabel profiles
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','bidang','viewer'));

-- 2) Kunci INSERT ke posts -- sebelumnya "siapapun yang login boleh insert",
--    sekarang eksplisit cuma admin & bidang (viewer nggak boleh nulis apa-apa).
--    UPDATE & DELETE nggak perlu diubah -- viewer otomatis ke-block di situ karena
--    syaratnya "admin ATAU pemilik postingan", dan viewer bukan dua-duanya.
drop policy if exists "posts_insert_authenticated" on posts;
create policy "posts_insert_admin_or_bidang"
  on posts for insert
  to authenticated
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','bidang'))
  );

-- 3) Viewer juga boleh lihat history semua postingan (read-only akses ke semua data)
drop policy if exists "post_history_select_admin_or_owner" on post_history;
create policy "post_history_select_admin_or_owner"
  on post_history for select
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','viewer'))
    or exists (select 1 from posts p where p.id = post_history.post_id and p.requested_by = auth.uid())
  );
