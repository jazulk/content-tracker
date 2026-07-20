export default function ConfirmDialog({ open, title, message, confirmLabel = "Ya, Hapus", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal small" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "-6px 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} aria-label="Batalkan">
            Batal
          </button>
          <button type="button" className="btn-danger wide" onClick={onConfirm} aria-label={confirmLabel}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
