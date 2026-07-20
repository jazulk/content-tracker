/**
 * Ganti username dan/atau password 1 akun (jalankan SEKALI di komputer sendiri, bukan di app).
 *
 * Cara pakai:
 *   1. npm install @supabase/supabase-js  (kalau belum)
 *   2. Isi SUPABASE_URL, SERVICE_ROLE_KEY di bawah.
 *      SERVICE_ROLE_KEY ada di: Supabase Dashboard > Project Settings > API > "service_role" (secret).
 *   3. Isi USERNAME_LAMA (buat nyari akunnya), lalu USERNAME_BARU & PASSWORD_BARU.
 *      - Kalau cuma mau ganti password, isi USERNAME_BARU = USERNAME_LAMA (biarin sama).
 *      - Kalau cuma mau ganti username, kosongkan PASSWORD_BARU (biarin null).
 *   4. Jalankan: node update-account.js
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://owoftqxjnstjyrinrdiz.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93b2Z0cXhqbnN0anlyaW5yZGl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQzMTY1NCwiZXhwIjoyMDk5MDA3NjU0fQ.MLrtqYRXD1icOV8cGw5S-gbKr7qkt7vXAIBX3fY1WGk"; // JANGAN commit ke git

const USERNAME_LAMA = "pengmas"; // buat nyari akunnya, jangan diubah dulu di sini
const USERNAME_BARU = "pengmas"; // isi sama kalau nggak mau ganti username
const PASSWORD_BARU = null; // isi string kalau mau ganti password, atau null kalau nggak

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const emailLama = `${USERNAME_LAMA}@medinfo.internal`;

  // 1. cari user id pakai username/email LAMA dulu
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Gagal ambil daftar user:", listError.message);
    return;
  }
  const user = list.users.find((u) => u.email === emailLama);
  if (!user) {
    console.error(`User dengan email ${emailLama} tidak ditemukan.`);
    return;
  }

  // 2. update auth (email baru & password baru kalau diisi)
  const updatePayload = {};
  if (USERNAME_BARU !== USERNAME_LAMA) {
    updatePayload.email = `${USERNAME_BARU}@medinfo.internal`;
    updatePayload.email_confirm = true;
  }
  if (PASSWORD_BARU) {
    updatePayload.password = PASSWORD_BARU;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, updatePayload);
    if (authError) {
      console.error("Gagal update auth:", authError.message);
      return;
    }
  }

  // 3. sinkronkan kolom username di tabel profiles
  if (USERNAME_BARU !== USERNAME_LAMA) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ username: USERNAME_BARU })
      .eq("id", user.id);
    if (profileError) {
      console.error("Gagal update profiles:", profileError.message);
      return;
    }
  }

  console.log(`OK: akun ${USERNAME_LAMA} berhasil diupdate.`);
}

run().then(() => process.exit(0));