// Supabase Edge Function: notify-new-request
// Dipanggil otomatis oleh Database Webhook tiap ada INSERT atau UPDATE ke tabel `posts`.
// - INSERT oleh akun bidang -> email "request baru" ke admin.
// - UPDATE oleh akun bidang (revisi request miliknya) -> email "ada revisi" ke admin.

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

function escapeHtml(s: unknown) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function sourceLinksHtml(sourceLink: string | null) {
  return (
    (sourceLink || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => `<a href="${escapeHtml(l)}">${escapeHtml(l)}</a>`)
      .join("<br/>") || "-"
  );
}

function buildEmail(kind: "baru" | "revisi", bidangName: string, record: any) {
  const label = kind === "baru" ? "Request baru masuk" : "Ada revisi pada request";
  const subject = `[Content Tracker] ${label} dari ${bidangName}`;

  const textBody = `
${label} dari bidang ${bidangName}.

Judul       : ${record.title}
Platform    : ${record.platform}
Status      : ${record.status}
Tgl Posting : ${record.post_date || "-"} ${record.post_time || ""}
PIC         : ${record.pic || "-"}
Catatan     : ${record.caption || "-"}
Link Sumber : ${record.source_link || "-"}

Buka Content Tracker buat ditindaklanjuti.
`.trim();

  const htmlBody = `
  <div style="font-family:Arial,sans-serif;font-size:14px;color:#1E1B3A;">
    <p>${label} dari bidang <b>${escapeHtml(bidangName)}</b>.</p>
    <table cellpadding="4" cellspacing="0" style="border-collapse:collapse;">
      <tr><td style="color:#6E6892;">Judul</td><td>: <b>${escapeHtml(record.title)}</b></td></tr>
      <tr><td style="color:#6E6892;">Platform</td><td>: ${escapeHtml(record.platform)}</td></tr>
      <tr><td style="color:#6E6892;">Status</td><td>: ${escapeHtml(record.status)}</td></tr>
      <tr><td style="color:#6E6892;vertical-align:top;">Tgl Posting</td><td>: ${escapeHtml(record.post_date || "-")} ${escapeHtml(record.post_time || "")}</td></tr>
      <tr><td style="color:#6E6892;">PIC</td><td>: ${escapeHtml(record.pic || "-")}</td></tr>
      <tr><td style="color:#6E6892;vertical-align:top;">Catatan</td><td>: ${escapeHtml(record.caption || "-")}</td></tr>
      <tr><td style="color:#6E6892;vertical-align:top;">Link Sumber</td><td>: ${sourceLinksHtml(record.source_link)}</td></tr>
    </table>
    <p style="margin-top:16px;">Buka Content Tracker buat ditindaklanjuti.</p>
  </div>
  `.trim();

  return { subject, textBody, htmlBody };
}

async function sendEmail(subject: string, textBody: string, htmlBody: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });
  await client.send({ from: GMAIL_USER, to: ADMIN_EMAILS, subject, content: textBody, html: htmlBody });
  await client.close();
}

Deno.serve(async (req) => {
  const secretHeader = req.headers.get("x-webhook-secret");
  if (secretHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;
  const type = payload.type; // "INSERT" | "UPDATE"

  try {
    if (type === "INSERT") {
      if (!record?.requested_by) return new Response("skip: no requester", { status: 200 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, bidang_name")
        .eq("id", record.requested_by)
        .single();

      if (!profile || profile.role !== "bidang") {
        return new Response("skip: bukan request bidang", { status: 200 });
      }

      const { subject, textBody, htmlBody } = buildEmail("baru", profile.bidang_name, record);
      await sendEmail(subject, textBody, htmlBody);
      return new Response("ok: notif request baru terkirim", { status: 200 });
    }

    if (type === "UPDATE") {
      const editorId = record?.updated_by;
      if (!editorId) return new Response("skip: no editor", { status: 200 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, bidang_name")
        .eq("id", editorId)
        .single();

      // cuma notif kalau yang edit itu akun bidang (berarti dia revisi request miliknya sendiri)
      if (!profile || profile.role !== "bidang") {
        return new Response("skip: bukan revisi dari bidang", { status: 200 });
      }

      // skip kalau nggak ada perubahan berarti (misal save tanpa ubah apa-apa)
      const oldRecord = payload.old_record;
      const watchedFields = ["title", "platform", "post_date", "post_time", "pic", "caption", "source_link"];
      const hasChanges = watchedFields.some((f) => (record?.[f] ?? null) !== (oldRecord?.[f] ?? null));
      if (!hasChanges) {
        return new Response("skip: tidak ada perubahan konten", { status: 200 });
      }

      const { subject, textBody, htmlBody } = buildEmail("revisi", profile.bidang_name, record);
      await sendEmail(subject, textBody, htmlBody);
      return new Response("ok: notif revisi terkirim", { status: 200 });
    }

    return new Response("skip: event type tidak dikenali", { status: 200 });
  } catch (err) {
    console.error("Gagal kirim email:", err);
    return new Response("error: " + err.message, { status: 500 });
  }
});