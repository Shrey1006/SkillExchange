import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Card from "../components/ui/Card";
import ResourceThumb from "../components/ResourceThumb";
import "./AppPages.css";

export default function Home() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/videos");
      setVideos(res.data || []);
    };
    load();
  }, []);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main">
        <h1 className="page-title">Featured Skill Videos</h1>
        <div className="resource-grid">
          {videos.map((v) => (
            <Card key={v._id} className="resource-card">
              <ResourceThumb item={v} />
              <div className="resource-body">
                <h3 className="resource-title">{v.title}</h3>
                <p className="resource-desc">{v.description}</p>
                <div className="resource-row">
                  <span className="muted-text">{v.cost} credits</span>
                  <Link to={`/video/${v._id}`}>Open</Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
