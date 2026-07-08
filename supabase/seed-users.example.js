/**
 * Script bikin 10 akun sekaligus (jalankan SEKALI di komputer lo sendiri, bukan di app).
 *
 * Cara pakai:
 *   1. npm install @supabase/supabase-js
 *   2. Isi SUPABASE_URL dan SERVICE_ROLE_KEY di bawah.
 *      SERVICE_ROLE_KEY ada di: Supabase Dashboard > Project Settings > API > "service_role" (secret).
 *      JANGAN taruh key ini di app/frontend atau kirim ke siapa pun — cukup dipakai sekali di sini.
 *   3. Jalankan: node seed-users.js
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://owoftqxjnstjyrinrdiz.supabase.co";
const SERVICE_ROLE_KEY = "PASTE_SERVICE_ROLE_KEY_DI_SINI"; // ambil dari Supabase Project Settings > API // JANGAN dishare / dicommit ke git

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// username = password (sesuai permintaan), tinggal edit kalau mau beda
const ACCOUNTS = [
  { username: "pengmas", role: "bidang", bidang_name: "Pengmas" },
  { username: "litbang", role: "bidang", bidang_name: "Litbang" },
  { username: "kwu", role: "bidang", bidang_name: "KWU" },
  { username: "lugri", role: "bidang", bidang_name: "Lugri" },
  { username: "dagri", role: "bidang", bidang_name: "Dagri" },
  { username: "kader", role: "bidang", bidang_name: "Kader" },
  { username: "advo", role: "bidang", bidang_name: "Advokasi" },
  { username: "senor", role: "bidang", bidang_name: "Senor" },
  { username: "mulmed", role: "admin", bidang_name: "Mulmed" },
  { username: "pubinfo", role: "admin", bidang_name: "Pubinfo" },
];

async function run() {
  for (const acc of ACCOUNTS) {
    const email = `${acc.username}@medinfo.internal`;
    const password = acc.username; // username = password

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error(`Gagal bikin ${acc.username}:`, error.message);
      continue;
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username: acc.username,
      role: acc.role,
      bidang_name: acc.bidang_name,
    });

    if (profileError) {
      console.error(`Gagal bikin profile ${acc.username}:`, profileError.message);
    } else {
      console.log(`OK: ${acc.username} (${acc.role}) dibuat.`);
    }
  }
}

run().then(() => {
  console.log("Selesai.");
  process.exit(0);
});
