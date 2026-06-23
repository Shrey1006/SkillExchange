import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ResourceThumb from "../components/ResourceThumb";
import "./mypurchase.css";
import "./AppPages.css";

export default function MyPurchase() {
  const [videos, setVideos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      // keep page stable even if download fails
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/user/purchases");
        setVideos(res.data?.purchasedSkills || []);
        setDocs(res.data?.purchasedDocs || []);
      } catch {
        setVideos([]);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main purchases-main">
        <h1 className="page-title">My Purchases</h1>

        {loading && <p className="muted-text">Loading purchases...</p>}

        {!loading && videos.length === 0 && docs.length === 0 && (
          <div className="empty-state purchases-empty">
            <p>No purchases found yet.</p>
            <Button onClick={() => navigate("/explore")}>Browse Explore Page</Button>
          </div>
        )}

        <div className="resource-grid">
          {videos.map((v) => (
            <Card key={v._id} className="resource-card">
              <ResourceThumb item={v} />
              <div className="resource-body">
                <h3 className="resource-title">{v.title}</h3>
                <p className="resource-desc">{v.description}</p>
                <div className="resource-row">
                  <span className="muted-text">{v.cost} credits</span>
                  <Button onClick={() => navigate(`/video/${v._id}`)}>Play</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <section>
          <h2 className="section-heading">Purchased Docs</h2>
          <div className="resource-grid">
            {docs.map((d) => (
              <Card key={d._id} className="resource-card">
                <ResourceThumb item={d} type="notes" />
                <div className="resource-body">
                  <h3 className="resource-title">{d.title}</h3>
                  <div className="resource-row">
                    <span className="muted-text">{d.cost} credits</span>
                    <Button onClick={() => downloadNote(d._id || d.id)}>Download</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
