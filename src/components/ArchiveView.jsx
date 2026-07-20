import { PLATFORM_COLORS, formatDateShort, canUnarchive } from "../constants";

export default function ArchiveView({ posts, profile, onCardClick, onDelete, onArchive }) {
  const isAdmin = profile.role === "admin";

  const grouped = {};
  posts.forEach((p) => {
    const d = p.post_date ? new Date(p.post_date + "T00:00:00") : null;
    const key = d ? d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "Tanpa tanggal";
    (grouped[key] = grouped[key] || []).push(p);
  });

  if (posts.length === 0) {
    return <div className="empty-col" style={{ padding: 40 }}>Belum ada postingan yang diarsipkan. Postingan Sudah Diposting otomatis pindah ke sini setelah 30 hari, atau admin bisa arsipin manual dari Papan.</div>;
  }

  return (
    <div className="cal-wrap">
      {Object.keys(grouped).map((month) => (
        <div key={month} style={{ marginBottom: 18 }}>
          <div className="col-title display" style={{ background: "#9CA3AF", display: "inline-block", marginBottom: 10 }}>
            {month}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {grouped[month].map((p) => {
              const pc = PLATFORM_COLORS[p.platform] || { c: "#999", s: "#eee" };
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{ borderLeftColor: "#9CA3AF", cursor: isAdmin ? "pointer" : "default" }}
                  onClick={() => isAdmin && onCardClick(p)}
                >
                  {isAdmin && (
                    <button
                      className="del-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p.id);
                      }}
                      aria-label={`Hapus postingan ${p.title}`}
                    >
                      ✕
                    </button>
                  )}
                  {isAdmin && canUnarchive(p) && (
                    <button
                      className="archive-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(p.id, false);
                      }}
                      aria-label={`Keluarkan postingan ${p.title} dari arsip`}
                      title="Keluarkan dari Arsip"
                    >
                      ⤒
                    </button>
                  )}
                  <div className="card-title">{p.title}</div>
                  <div className="badge-row">
                    <span className="platform-badge" style={{ background: pc.s, color: pc.c }}>{p.platform}</span>
                    {p.requested_by_name && <span className="requester-badge">dari {p.requested_by_name}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    Tayang {formatDateShort(p.post_date)}{p.post_time ? ` · ${p.post_time.slice(0, 5)}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
