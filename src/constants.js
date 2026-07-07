export const STATUSES = [
  { key: "Ide", color: "#3DB4F2" },
  { key: "Draft", color: "#FFB800" },
  { key: "Terjadwal", color: "#7C5CFC" },
  { key: "Posted", color: "#00C896" },
  { key: "Ditolak", color: "#9CA3AF" },
];

export const PLATFORM_COLORS = {
  Instagram: { c: "#E1306C", s: "#FCE1EB" },
  TikTok: { c: "#1E1B3A", s: "#E7E5F0" },
  YouTube: { c: "#FF0000", s: "#FFE1E1" },
  "Website BEM": { c: "#3DB4F2", s: "#DBF1FE" },
};

export const STAT_GRADIENTS = [
  "linear-gradient(135deg,#7C5CFC,#9B7BFF)",
  "linear-gradient(135deg,#FF6B6B,#FF8FA3)",
  "linear-gradient(135deg,#3DB4F2,#5FCBF5)",
  "linear-gradient(135deg,#00C896,#3DDBB0)",
];

export function formatDateShort(dstr) {
  if (!dstr) return "—";
  const d = new Date(dstr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function escapeText(s) {
  return s || "";
}
