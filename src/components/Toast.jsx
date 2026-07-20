export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
