// Supabase Edge Function: notify-new-request
// Dipanggil otomatis oleh Database Webhook tiap ada INSERT ke tabel `posts`.
// Kalau yang insert adalah akun bidang (request baru), kirim email ke ketua Mulmed & Pubinfo.

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // proteksi sederhana biar cuma Database Webhook Supabase yang bisa manggil ini
  const secretHeader = req.headers.get("x-webhook-secret");
  if (secretHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;

  console.log("DEBUG ADMIN_EMAILS resolved to:", JSON.stringify(ADMIN_EMAILS));

  if (!record?.requested_by) {
    return new Response("skip: no requester", { status: 200 });
  }

  // cek role si pengaju — cuma notif kalau yang insert akun bidang
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, bidang_name")
    .eq("id", record.requested_by)
    .single();

  if (!profile || profile.role !== "bidang") {
    return new Response("skip: bukan request bidang", { status: 200 });
  }

  const subject = `[Content Tracker] Request baru dari ${profile.bidang_name}`;
  const body = `
Ada request konten baru masuk dari bidang ${profile.bidang_name}.

Judul       : ${record.title}
Platform    : ${record.platform}
Tgl Posting : ${record.post_date || "-"} ${record.post_time || ""}
PIC         : ${record.pic || "-"}
Catatan     : ${record.caption || "-"}
Link Sumber : ${record.source_link || "-"}

Buka Content Tracker buat ditindaklanjuti.
`.trim();

  try {
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from: GMAIL_USER,
      to: ADMIN_EMAILS,
      subject,
      content: body,
    });

    await client.close();
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Gagal kirim email:", err);
    return new Response("error: " + err.message, { status: 500 });
  }
});
