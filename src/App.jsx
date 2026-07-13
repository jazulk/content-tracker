import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import Login from "./components/Login";
import Board from "./components/Board";
import CalendarView from "./components/CalendarView";
import ArchiveView from "./components/ArchiveView";
import PostModal from "./components/PostModal";
import { PLATFORM_COLORS, STAT_GRADIENTS, STATUSES, isArchived } from "./constants";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [bidangFilter, setBidangFilter] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // ---------- Auth ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error) setProfile(data);
      });
  }, [session]);

  // ---------- Posts: fetch + realtime ----------
  useEffect(() => {
    if (!profile) return;
    fetchPosts();

    const channel = supabase
      .channel("posts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile]);

  async function fetchPosts() {
    setLoadingPosts(true);
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (!error) setPosts(data);
    setLoadingPosts(false);
  }

  // ---------- CRUD ----------
  async function handleSave(form) {
    if (editingPost) {
      const { error } = await supabase.from("posts").update(form).eq("id", editingPost.id);
      if (error) alert("Gagal menyimpan: " + error.message);
    } else {
      const { error } = await supabase.from("posts").insert({
        title: form.title,
        platform: form.platform,
        status: form.status,
        post_date: form.post_date || null,
        post_time: form.post_time || null,
        pic: form.pic,
        caption: form.caption,
        source_link: form.source_link,
      });
      if (error) alert("Gagal menyimpan: " + error.message);
    }
    setModalOpen(false);
    setEditingPost(null);
    fetchPosts();
  }

  async function handleDelete(id) {
    if (!confirm("Hapus postingan ini?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) alert("Gagal menghapus: " + error.message);
    fetchPosts();
  }

  async function handleDropStatus(id, status) {
    const { error } = await supabase.from("posts").update({ status }).eq("id", id);
    if (error) alert("Gagal update status: " + error.message);
    fetchPosts();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // ---------- Derived ----------
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (platformFilter && p.platform !== platformFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (bidangFilter && p.requested_by_name !== bidangFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.title} ${p.caption || ""} ${p.pic || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, platformFilter, statusFilter, bidangFilter, search]);

  const bidangList = useMemo(() => {
    const set = new Set(posts.map((p) => p.requested_by_name).filter(Boolean));
    return Array.from(set).sort();
  }, [posts]);

  const archivedPosts = useMemo(() => filteredPosts.filter(isArchived), [filteredPosts]);

  function handleExport() {
    const rows = filteredPosts.map((p) => ({
      Judul: p.title,
      Platform: p.platform,
      Status: p.status,
      "Bidang Pengaju": p.requested_by_name || "-",
      "Tgl Diajukan": p.submit_date || "-",
      "Tgl Posting": p.post_date || "-",
      "Jam Posting": p.post_time || "-",
      PIC: p.pic || "-",
      Caption: p.caption || "-",
      "Link Sumber": p.source_link || "-",
      "Alasan Ditolak": p.rejection_note || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 40 }, { wch: 30 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Content Tracker");
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `content-tracker-${today}.xlsx`);
  }

  const byPlatform = useMemo(() => {
    const m = {};
    posts.forEach((p) => (m[p.platform] = (m[p.platform] || 0) + 1));
    return m;
  }, [posts]);

  if (loadingAuth) return <div className="loading-note">Memuat...</div>;
  if (!session) return <Login />;
  if (!profile) return <div className="loading-note">Menyiapkan akun...</div>;

  const isAdmin = profile.role === "admin";

  return (
    <>
      <div className="hero">
        <div className="hero-inner">
          <p className="eyebrow">Medfo · BEM FIK</p>
          <h1 className="pagetitle display">Content Tracker</h1>
          <p className="sub">Pelacakan dan penjadwalan konten media sosial Medfo</p>
          <div className="topbar">
            <div className="seg">
              <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>Papan</button>
              <button className={view === "cal" ? "active" : ""} onClick={() => setView("cal")}>Kalender</button>
              <button className={view === "archive" ? "active" : ""} onClick={() => setView("archive")}>Arsip</button>
            </div>
            <div className="actions">
              <span className="role-badge">{isAdmin ? `Admin — ${profile.bidang_name}` : `Bidang — ${profile.bidang_name}`}</span>
              <button className="btn-primary" onClick={() => { setEditingPost(null); setModalOpen(true); }}>
                {isAdmin ? "+ Tambah Postingan" : "+ Request Postingan"}
              </button>
              {isAdmin && (
                <button className="logout-btn" onClick={handleExport} title="Export ke Excel">Export</button>
              )}
              <button className="logout-btn" onClick={handleLogout}>Keluar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="stats">
          <div className="stat-card" style={{ background: STAT_GRADIENTS[0] }}>
            <span className="stat-num">{posts.length}</span>
            <span className="stat-label">Total Post</span>
          </div>
          {Object.keys(PLATFORM_COLORS).map((pl, i) =>
            byPlatform[pl] ? (
              <div className="stat-card" key={pl} style={{ background: STAT_GRADIENTS[(i + 1) % STAT_GRADIENTS.length] }}>
                <span className="stat-num">{byPlatform[pl]}</span>
                <span className="stat-label">{pl}</span>
              </div>
            ) : null
          )}
        </div>

        <div className="filterrow">
          <div className="search">
            <input type="text" placeholder="Cari judul, caption, atau PIC..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`chip ${!platformFilter ? "active" : ""}`} onClick={() => setPlatformFilter(null)}>Semua Platform</button>
            {Object.keys(PLATFORM_COLORS).map((pl) => (
              <button key={pl} className={`chip ${platformFilter === pl ? "active" : ""}`} onClick={() => setPlatformFilter(pl)}>{pl}</button>
            ))}
          </div>
        </div>
        <div className="filterrow">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`chip ${!statusFilter ? "active" : ""}`} onClick={() => setStatusFilter(null)}>Semua Status</button>
            {STATUSES.map((s) => (
              <button key={s.key} className={`chip ${statusFilter === s.key ? "active" : ""}`} onClick={() => setStatusFilter(s.key)}>{s.key}</button>
            ))}
          </div>
          {bidangList.length > 0 && (
            <select
              value={bidangFilter || ""}
              onChange={(e) => setBidangFilter(e.target.value || null)}
              style={{ border: "2px solid var(--line)", borderRadius: 12, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", background: "var(--card)" }}
            >
              <option value="">Semua Bidang</option>
              {bidangList.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>

        {loadingPosts ? (
          <div className="loading-note">Lagi ngambil data postingan...</div>
        ) : view === "board" ? (
          <Board
            posts={filteredPosts}
            profile={profile}
            onCardClick={(p) => { setEditingPost(p); setModalOpen(true); }}
            onDelete={handleDelete}
            onDropStatus={handleDropStatus}
          />
        ) : view === "cal" ? (
          <CalendarView
            posts={filteredPosts}
            profile={profile}
            onCardClick={(p) => { setEditingPost(p); setModalOpen(true); }}
          />
        ) : (
          <ArchiveView
            posts={archivedPosts}
            profile={profile}
            onCardClick={(p) => { setEditingPost(p); setModalOpen(true); }}
            onDelete={handleDelete}
          />
        )}
      </div>

      {modalOpen && (
        <PostModal
          profile={profile}
          editingPost={editingPost}
          onClose={() => { setModalOpen(false); setEditingPost(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
