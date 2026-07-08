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

export const ARCHIVE_AFTER_DAYS = 30;

export function isArchived(post) {
  if (post.status !== "Posted" || !post.post_date) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - ARCHIVE_AFTER_DAYS);
  const postDate = new Date(post.post_date + "T00:00:00");
  return postDate < cutoff;
}
export function isOverdue(post) {
  if (!post.post_date) return false;
  if (post.status === "Posted" || post.status === "Ditolak") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const postDate = new Date(post.post_date + "T00:00:00");
  return postDate < today;
}

export function sortByPostDate(posts) {
  return [...posts].sort((a, b) => {
    if (!a.post_date && !b.post_date) return 0;
    if (!a.post_date) return 1;
    if (!b.post_date) return -1;
    const cmp = a.post_date.localeCompare(b.post_date);
    if (cmp !== 0) return cmp;
    return (a.post_time || "").localeCompare(b.post_time || "");
  });
}
