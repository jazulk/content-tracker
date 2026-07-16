/**
 * Reset password 1 akun (jalankan SEKALI di komputer sendiri, bukan di app).
 *
 * Cara pakai:
 *   1. npm install @supabase/supabase-js  (kalau belum)
 *   2. Isi SUPABASE_URL, SERVICE_ROLE_KEY, USERNAME, PASSWORD_BARU di bawah.
 *      SERVICE_ROLE_KEY ada di: Supabase Dashboard > Project Settings > API > "service_role" (secret).
 *   3. Jalankan: node reset-password.js
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://owoftqxjnstjyrinrdiz.supabase.co";
const SERVICE_ROLE_KEY = "PASTE_SERVICE_ROLE_KEY_DI_SINI"; // JANGAN commit ke git

const USERNAME = "pengmas"; // ganti sesuai akun yang mau direset
const PASSWORD_BARU = "password_baru_disini";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const email = `${USERNAME}@medinfo.internal`;

  // cari user id dari email
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Gagal ambil daftar user:", listError.message);
    return;
  }

  const user = list.users.find((u) => u.email === email);
  if (!user) {
    console.error(`User dengan email ${email} tidak ditemukan.`);
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: PASSWORD_BARU,
  });

  if (error) {
    console.error("Gagal reset password:", error.message);
  } else {
    console.log(`OK: password untuk ${USERNAME} berhasil direset.`);
  }
}

run().then(() => process.exit(0));
