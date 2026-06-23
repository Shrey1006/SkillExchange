import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import TransactionModal from "../components/TransactionModal";
import RewardModal from "../components/RewardModal";
import ResourceThumb from "../components/ResourceThumb";
import { useUser } from "../context/UserContext";
import "./explore.css";
import "./AppPages.css";

export default function Explore() {
  const [videos, setVideos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [unlockModal, setUnlockModal] = useState({ open: false, note: null });
  const [unlocking, setUnlocking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, refreshUser, updateCredits } = useUser();
  const [rewardPopup, setRewardPopup] = useState({ open: false, spent: 0, reward: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const [v, n] = await Promise.all([api.get("/videos"), api.get("/notes")]);
        setVideos(v.data || []);
        setNotes(n.data || []);
      } catch (err) {
        console.error("Explore load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const downloadNote = async (id) => {
    try {
      const res = await api.post(`/notes/download/${id}`, {}, { responseType: "blob" });
      const disposition = res.headers["content-disposition"] || "";
      const filename = disposition.match(/filename="(.+)"/)?.[1] || "downloaded-file";
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (typeof err?.message === "string" ? err.message : null) ||
        "Download failed";
      alert(msg);
    }
  };

  const startNoteUnlock = (note) => {
    setError("");
    setMessage("");
    setUnlockModal({ open: true, note });
  };

  const confirmUnlockNote = async () => {
    if (!unlockModal.note?._id) return;
    setUnlocking(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/user/unlock-content", {
        contentType: "doc",
        contentId: unlockModal.note._id,
      });
      if (typeof res?.data?.credits === "number") {
        updateCredits(res.data.credits);
      }
      await refreshUser();
      if (res.data?.rewardMessage) setMessage(res.data.rewardMessage);
      if (!res?.data?.alreadyUnlocked) {
        setRewardPopup({
          open: true,
          spent: Number(res?.data?.spentCredits ?? unlockModal.note?.cost ?? 3),
          reward: Number(res?.data?.reward ?? 0),
        });
      }
      setUnlockModal({ open: false, note: null });
      await downloadNote(unlockModal.note._id);
    } catch (err) {
      const apiMessage = err?.response?.data?.message || "Unlock failed";
      if (apiMessage === "Insufficient Credits") {
        setError("Insufficient Credits");
      } else {
        setError(apiMessage);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const skills = useMemo(() => {
    const freq = {};
    [...videos, ...notes].forEach((item) => {
      (item.title || "")
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .split(" ")
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 3)
        .forEach((w) => {
          freq[w] = (freq[w] || 0) + 1;
        });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([word]) => word);
  }, [videos, notes]);

  const purchasedVideoIds = new Set((user?.purchasedSkills || []).map((item) => item._id || item));
  const purchasedNoteIds = new Set((user?.purchasedDocs || []).map((item) => item._id || item));
  const filteredVideos = videos
    .filter((v) => !purchasedVideoIds.has(v._id))
    .filter((v) => v.title.toLowerCase().includes(query.toLowerCase()));
  const filteredNotes = notes
    .filter((n) => !purchasedNoteIds.has(n._id))
    .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main explore-main">
        <section className="explore-hero">
          <h1 className="page-title">Explore</h1>
          <p className="muted-text">Discover high-value videos and notes from the community.</p>
          <div className="explore-controls">
            <Input
              placeholder="Search videos, notes or skills"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="explore-tabs">
              {["all", "videos", "notes", "skills"].map((item) => (
                <Button
                  key={item}
                  variant={tab === item ? "primary" : "ghost"}
                  onClick={() => setTab(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {loading && <p className="muted-text">Loading resources...</p>}
        {message && <p className="success-text">{message}</p>}
        {error && (
          <p className="error-text">
            {error} - <Link to="/purchase-credits">Purchase credits</Link>
          </p>
        )}

        {(tab === "all" || tab === "skills") && (
          <section>
            <h2 className="section-heading">Skills</h2>
            <div className="skills-grid">
              {skills
                .filter((s) => s.includes(query.toLowerCase()))
                .map((s) => (
                  <button key={s} className="skill-chip" onClick={() => setQuery(s)}>
                    {s}
                  </button>
                ))}
            </div>
          </section>
        )}

        {(tab === "all" || tab === "videos") && (
          <section>
            <h2 className="section-heading">Videos</h2>
            <div className="resource-grid">
              {filteredVideos.map((v) => (
                <Card key={v._id} className="resource-card">
                  <ResourceThumb item={v} />
                  <div className="resource-body">
                    <h3 className="resource-title">{v.title}</h3>
                    <p className="resource-desc">{v.description}</p>
                    <div className="resource-row">
                      <span className="muted-text">{v.cost} credits</span>
                      <Button onClick={() => navigate(`/video/${v._id}`)}>Unlock</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {(tab === "all" || tab === "notes") && (
          <section>
            <h2 className="section-heading">Notes</h2>
            <div className="resource-grid">
              {filteredNotes.map((n) => (
                <Card key={n._id} className="resource-card">
                  <ResourceThumb item={n} type="notes" />
                  <div className="resource-body">
                    <h3 className="resource-title">{n.title}</h3>
                    <div className="resource-row">
                      <span className="muted-text">{n.cost} credits</span>
                      <Button onClick={() => startNoteUnlock(n)}>Unlock</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      <TransactionModal
        open={unlockModal.open}
        title="Unlock Notes"
        requiredCredits={Number(unlockModal.note?.cost ?? 3)}
        currentCredits={Number(user?.credits ?? 0)}
        loading={unlocking}
        onCancel={() => setUnlockModal({ open: false, note: null })}
        onConfirm={confirmUnlockNote}
      />
      <RewardModal
        open={rewardPopup.open}
        spent={rewardPopup.spent}
        reward={rewardPopup.reward}
        onClose={() => setRewardPopup({ open: false, spent: 0, reward: 0 })}
      />
      <Footer />
    </div>
  );
}
