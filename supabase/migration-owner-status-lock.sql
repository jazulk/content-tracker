-- ============================================================
-- FIX: bidang cuma boleh edit/hapus postingan MEREKA SENDIRI di jendela status
-- tertentu, bukan bebas kapan aja.
--   - Edit  : boleh kalau status "Request" atau "On Progress"
--   - Hapus : boleh kalau status "Request" atau "Ditolak"
-- Di luar itu (Siap Posting, Sudah Diposting), cuma admin yang bisa ubah/hapus.
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- UPDATE: pakai kolom status yang LAMA (sebelum diubah) buat nentuin boleh/nggaknya,
-- via "using" clause (dievaluasi terhadap baris sebelum update).
drop policy if exists "posts_update_own_or_admin" on posts;
create policy "posts_update_own_or_admin"
  on posts for update
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (requested_by = auth.uid() and status in ('Request','On Progress'))
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (requested_by = auth.uid() and status in ('Request','On Progress'))
  );

-- DELETE: sama, evaluasi terhadap status baris yang mau dihapus.
drop policy if exists "posts_delete_own_or_admin" on posts;
create policy "posts_delete_own_or_admin"
  on posts for delete
  to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    or (requested_by = auth.uid() and status in ('Request','Ditolak'))
  );
