import { useState, useEffect } from "react";
import { STATUSES } from "../constants";

const emptyForm = {
  title: "",
  platform: "Instagram",
  status: "Request",
  post_date: "",
  post_time: "",
  pic: "",
  caption: "",
  source_link: "",
  rejection_note: "",
};

export default function PostModal({ profile, editingPost, onClose, onSave }) {
  const isAdmin = profile.role === "admin";
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingPost) {
      setForm({
        title: editingPost.title || "",
        platform: editingPost.platform || "Instagram",
        status: editingPost.status || "Request",
        post_date: editingPost.post_date || "",
        post_time: editingPost.post_time || "",
        pic: editingPost.pic || "",
        caption: editingPost.caption || "",
        source_link: editingPost.source_link || "",
        rejection_note: editingPost.rejection_note || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingPost]);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      alert("Judul postingan wajib diisi ya");
      return;
    }

    if (!isAdmin && !editingPost) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 8 || hour >= 21) {
        alert("Request cuma bisa diajukan jam 08:00 - 21:00 WIB.");
        return;
      }
      if (!form.post_date) {
        alert("Tanggal posting wajib diisi ya.");
        return;
      }
      const minDate = new Date();
      minDate.setHours(0, 0, 0, 0);
      minDate.setDate(minDate.getDate() + 5);
      const chosenDate = new Date(form.post_date + "T00:00:00");
      if (chosenDate < minDate) {
        alert("Request cuma bisa diajukan minimal H-5 dari tanggal posting.");
        return;
      }
    }

    onSave(form);
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{editingPost ? "Edit Postingan" : isAdmin ? "Tambah Postingan" : "Request Postingan"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Judul / Topik</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="misal: Recap Sarasehan Prodi"
              autoFocus
            />
          </div>
          <div className="row2">
            <div className="field">
              <label>Platform</label>
              <select value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Website BEM">Website BEM</option>
              </select>
            </div>
            {isAdmin && (
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="row2">
            <div className="field">
              <label>Tanggal Posting</label>
              <input type="date" value={form.post_date} onChange={(e) => set("post_date", e.target.value)} />
            </div>
            <div className="field">
              <label>Jam Posting</label>
              <input type="time" value={form.post_time} onChange={(e) => set("post_time", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>PIC (Penanggung Jawab)</label>
            <input type="text" value={form.pic} onChange={(e) => set("pic", e.target.value)} placeholder="misal: Jazuli" />
          </div>
          <div className="field">
            <label>Caption / Catatan</label>
            <textarea
              value={form.caption}
              onChange={(e) => set("caption", e.target.value)}
              placeholder="draft caption atau catatan singkat..."
            />
          </div>
          <div className="field">
            <label>Link Sumber — Gdrive / Docs / Spreadsheet (satu link per baris, boleh lebih dari satu)</label>
            <textarea
              value={form.source_link}
              onChange={(e) => set("source_link", e.target.value)}
              placeholder={"https://drive.google.com/...\nhttps://docs.google.com/..."}
              style={{ minHeight: 56 }}
            />
          </div>
          {isAdmin && form.status === "Ditolak" && (
            <div className="field">
              <label>Alasan Ditolak (kasih tau bidang secara manual ya)</label>
              <textarea
                value={form.rejection_note}
                onChange={(e) => set("rejection_note", e.target.value)}
                placeholder="misal: sudah lewat momentum, atau duplikat sama konten lain"
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary wide">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
