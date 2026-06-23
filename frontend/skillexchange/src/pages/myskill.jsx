import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ResourceThumb from "../components/ResourceThumb";
import { useUser } from "../context/UserContext";
import "./myskill.css";
import "./AppPages.css";

export default function MySkill() {
  const [videos, setVideos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const load = async () => {
      try {
        const [p, v, n] = await Promise.all([
          api.get("/user/profile"),
          api.get("/videos"),
          api.get("/notes"),
        ]);
        const uid = p.data._id || p.data.id;
        const byUser = (item) =>
          item.uploadedBy === uid ||
          item.uploadedby === uid ||
          (item.uploadedBy && item.uploadedBy._id === uid);
        setVideos((v.data || []).filter(byUser));
        setNotes((n.data || []).filter(byUser));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const downloadNote = async (id) => {
    try {
      const res = await api.post(`/notes/download/${id}`, {}, { responseType: "blob" });
      const filename = res.headers["content-disposition"]?.match(/filename="(.+)"/)?.[1] || "downloaded-file";
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Not enough credits or download error");
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main myskills-main">
        <h1 className="page-title">My Uploaded Skills</h1>
        {loading && <p className="muted-text">Loading your uploads...</p>}

        <section>
          <h2 className="section-heading">Videos</h2>
          {videos.length === 0 ? (
            <div className="empty-state">You have not uploaded videos yet.</div>
          ) : (
            <div className="resource-grid">
              {videos.map((v) => (
                <Card key={v._id} className="resource-card">
                  <ResourceThumb item={v} />
                  <div className="resource-body">
                    <h3 className="resource-title">{v.title}</h3>
                    <p className="resource-desc">{v.description}</p>
                    <div className="resource-row">
                      <span className="muted-text">{v.cost} credits</span>
                      <Button onClick={() => navigate(`/video/${v._id}`)}>View</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="section-heading">Notes</h2>
          {notes.length === 0 ? (
            <div className="empty-state">You have not uploaded notes yet.</div>
          ) : (
            <div className="resource-grid">
              {notes.map((n) => (
                <Card key={n._id} className="resource-card">
                  <ResourceThumb item={n} type="notes" />
                  <div className="resource-body">
                    <h3 className="resource-title">{n.title}</h3>
                    <div className="resource-row">
                      <span className="muted-text">{n.cost} credits</span>
                      <Button onClick={() => downloadNote(n._id || n.id)}>Download</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <main className="page-main myskills-main">
        <section>
          <h2 className="section-heading">Unlocked Purchases</h2>
          {(!user?.purchasedSkills?.length && !user?.purchasedDocs?.length) ? (
            <div className="empty-state">No unlocked content yet.</div>
          ) : (
            <div className="resource-grid">
              {(user?.purchasedSkills || []).map((v) => (
                <Card key={v._id || v} className="resource-card">
                  <ResourceThumb item={v} />
                  <div className="resource-body">
                    <h3 className="resource-title">{v.title || "Unlocked Video"}</h3>
                    <div className="resource-row">
                      <span className="muted-text">{v.cost ?? "-"} credits</span>
                      <Button onClick={() => navigate(`/video/${v._id || v}`)}>Unlocked</Button>
                    </div>
                  </div>
                </Card>
              ))}
              {(user?.purchasedDocs || []).map((n) => (
                <Card key={n._id || n} className="resource-card">
                  <ResourceThumb item={n} type="notes" />
                  <div className="resource-body">
                    <h3 className="resource-title">{n.title || "Unlocked Notes"}</h3>
                    <div className="resource-row">
                      <span className="muted-text">{n.cost ?? "-"} credits</span>
                      <Button onClick={() => navigate("/explore")}>Unlocked</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
