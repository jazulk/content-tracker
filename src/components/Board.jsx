import { STATUSES, PLATFORM_COLORS, formatDateShort } from "../constants";

export default function Board({ posts, profile, onCardClick, onDelete, onDropStatus }) {
  const isAdmin = profile.role === "admin";

  function handleDragStart(e, id) {
    e.dataTransfer.setData("text/plain", id);
  }
  function handleDrop(e, status) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const id = e.dataTransfer.getData("text/plain");
    if (id) onDropStatus(id, status);
  }

  return (
    <div className="board">
      {STATUSES.map((st) => {
        const items = posts.filter((p) => p.status === st.key);
        return (
          <div className="col" key={st.key}>
            <div className="col-head">
              <span className="col-title" style={{ background: st.color }}>
                {st.key}
              </span>
              <span className="col-count">{items.length}</span>
            </div>
            <div
              className="col-body"
              onDragOver={(e) => {
                if (!isAdmin) return;
                e.preventDefault();
                e.currentTarget.classList.add("dragover");
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
              onDrop={(e) => isAdmin && handleDrop(e, st.key)}
            >
              {items.length === 0 ? (
                <div className="empty-col">Belum ada postingan di sini ✨</div>
              ) : (
                items.map((p) => {
                  const pc = PLATFORM_COLORS[p.platform] || { c: "#999", s: "#eee" };
                  const initials = (p.pic || "?").trim().slice(0, 2).toUpperCase();
                  const isOwner = p.requested_by === profile.id;
                  const canModify = isAdmin || isOwner;
                  return (
                    <div
                      key={p.id}
                      className="card"
                      draggable={isAdmin}
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      style={{ borderLeftColor: st.color, cursor: canModify ? "pointer" : "default" }}
                      onClick={() => canModify && onCardClick(p)}
                    >
                      {canModify && (
                        <button
                          className="del-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(p.id);
                          }}
                        >
                          ✕
                        </button>
                      )}
                      <div className="card-title">{p.title}</div>
                      <div className="badge-row">
                        <span className="platform-badge" style={{ background: pc.s, color: pc.c }}>
                          {p.platform}
                        </span>
                        {p.requested_by_name && (
                          <span className="requester-badge">dari {p.requested_by_name}</span>
                        )}
                      </div>
                      <div className="date-row">
                        <div>
                          <span>📝 Diajukan</span>
                          <span>{formatDateShort(p.submit_date)}</span>
                        </div>
                        <div>
                          <span>🚀 Posting</span>
                          <span>
                            {formatDateShort(p.post_date)}
                            {p.post_time ? ` · ${p.post_time.slice(0, 5)}` : ""}
                          </span>
                        </div>
                      </div>
                      {p.status === "Ditolak" && p.rejection_note && (
                        <div className="rejection-note">Alasan: {p.rejection_note}</div>
                      )}
                      {p.source_link && (
                        <a
                          href={p.source_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 11, color: "var(--violet)", fontWeight: 700, display: "inline-block", marginTop: 6 }}
                        >
                          📎 Buka sumber
                        </a>
                      )}
                      <div className="card-foot">
                        <span className="pic-badge" title={p.pic || ""}>
                          {initials}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
