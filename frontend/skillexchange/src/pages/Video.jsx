import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api, { resolveMediaUrl } from "../api";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import TransactionModal from "../components/TransactionModal";
import RewardModal from "../components/RewardModal";
import { useUser } from "../context/UserContext";
import "./Video.css";

export default function Video() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, updateCredits, loadingUser } = useUser();
  const [path, setPath] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [title, setTitle] = useState("Video Player");
  const [description, setDescription] = useState("Unlock to start learning this skill.");
  const [cost, setCost] = useState(5);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [rewardPopup, setRewardPopup] = useState({ open: false, spent: 0, reward: 0 });

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const res = await api.get(`/videos/${id}`);
        setTitle(res.data?.title || "Video Player");
        setDescription(res.data?.description || "Unlock to start learning this skill.");
        setCost(Number(res.data?.cost ?? 5));
    } catch {
        setError("Unable to load video details.");
      }
    };
    loadVideo();
  }, [id]);

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      if (!id || loadingUser) {
        return;
      }

      setCheckingAccess(true);
      setPath("");
      setHasAccess(false);
      setIsOwner(false);

      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        const accessRes = await api.get(`/user/content-access/video/${id}`);
        if (!active) return;
        const unlocked = Boolean(accessRes.data?.hasAccess);
        setHasAccess(unlocked);
        setIsOwner(Boolean(accessRes.data?.isOwner));

        if (unlocked) {
          const watchRes = await api.post(`/videos/watch/${id}`);
          if (!active) return;
          setPath(resolveMediaUrl(watchRes.data.path));
          if (typeof watchRes.data.credits === "number") {
            updateCredits(watchRes.data.credits);
          }
        }
      } catch {
        if (active) setHasAccess(false);
      } finally {
        if (active) setCheckingAccess(false);
      }
    };

    loadAccess();
    return () => {
      active = false;
    };
  }, [id, loadingUser, !!user, updateCredits]);

  const play = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const unlockRes = await api.post("/user/unlock-content", {
        contentType: "video",
        contentId: id,
      });
      if (typeof unlockRes?.data?.credits === "number") {
        updateCredits(unlockRes.data.credits);
      }
      const res = await api.post(`/videos/watch/${id}`);
      await refreshUser();
      setPath(resolveMediaUrl(res.data.path));
      setHasAccess(true);
      setTitle(res.data.title || "Video Unlocked");
      setDescription(res.data.description || "Enjoy the lesson.");
      if (unlockRes.data?.rewardMessage) {
        setStatusMessage(unlockRes.data.rewardMessage);
      }
      if (!unlockRes?.data?.alreadyUnlocked) {
        setRewardPopup({
          open: true,
          spent: Number(unlockRes?.data?.spentCredits ?? cost),
          reward: Number(unlockRes?.data?.reward ?? 0),
        });
      }
      setShowModal(false);
    } catch (err) {
      const apiMessage = err?.response?.data?.message || "Unlock failed";
      if (apiMessage === "Insufficient Credits") {
        setError("Insufficient Credits");
      } else {
        setError(apiMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main video-page">
        <Card className="video-player-card">
          <div className="player-wrap">
            {path ? (
              <video controls src={path} className="video-element" />
            ) : checkingAccess ? (
              <div className="video-placeholder">Loading...</div>
            ) : (
              <div className="video-placeholder">Preview locked</div>
            )}
          </div>
          <div className="video-details">
            <h1 className="page-title">{title}</h1>
            <p className="muted-text">{description}</p>
            {statusMessage && <p className="success-text">{statusMessage}</p>}
            {error && <p className="error-text">{error}</p>}
            {!path && !checkingAccess && (
              <div className="video-actions">
                <Button onClick={() => setShowModal(true)} disabled={loading}>
                  {loading ? "Unlocking..." : "Unlock & Play"}
                </Button>
                {error === "Insufficient Credits" && (
                  <Button variant="ghost" onClick={() => navigate("/purchase-credits")}>
                    Purchase Credits
                  </Button>
                )}
              </div>
            )}
            {path && hasAccess && (
              <p className="muted-text">
                {isOwner
                  ? "This is your uploaded video."
                  : "You already unlocked this video. Credits were deducted only once."}
              </p>
            )}
          </div>
        </Card>
      </main>
      <TransactionModal
        open={showModal}
        title="Unlock Video"
        requiredCredits={cost}
        currentCredits={Number(user?.credits ?? 0)}
        loading={loading}
        onCancel={() => setShowModal(false)}
        onConfirm={play}
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
