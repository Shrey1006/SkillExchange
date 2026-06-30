import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import TransactionModal from "../components/TransactionModal";
import RewardModal from "../components/RewardModal";
import ResourcePublisher from "../components/ResourcePublisher";
import { useUser } from "../context/UserContext";
import "./Notes.css";
import "./AppPages.css";

export default function Notes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser, updateCredits, loadingUser } = useUser();
  const [note, setNote] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [rewardPopup, setRewardPopup] = useState({ open: false, spent: 0, reward: 0 });

  useEffect(() => {
    const loadNote = async () => {
      try {
        const res = await api.get(`/notes/${id}`);
        setNote(res.data || null);
      } catch {
        setError("Unable to load notes details.");
      }
    };
    loadNote();
  }, [id]);

  useEffect(() => {
    const loadAccess = async () => {
      if (!id || loadingUser) {
        return;
      }

      setCheckingAccess(true);
      setHasAccess(false);

      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        const accessRes = await api.get(`/user/content-access/doc/${id}`);
        setHasAccess(Boolean(accessRes.data?.hasAccess));
      } catch {
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    loadAccess();
  }, [id, loadingUser, user]);

  const downloadNote = async () => {
    const res = await api.post(`/notes/download/${id}`, {}, { responseType: "blob" });
    const disposition = res.headers["content-disposition"] || "";
    const filename =
      disposition.match(/filename="(.+)"/)?.[1] ||
      disposition.match(/filename=([^;]+)/)?.[1] ||
      note?.filename ||
      "downloaded-notes";
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const unlockAndDownload = async () => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const unlockRes = await api.post("/user/unlock-content", {
        contentType: "doc",
        contentId: id,
      });
      if (typeof unlockRes?.data?.credits === "number") {
        updateCredits(unlockRes.data.credits);
      }
      await refreshUser();
      await downloadNote();
      setHasAccess(true);
      if (unlockRes.data?.rewardMessage) {
        setStatusMessage(unlockRes.data.rewardMessage);
      }
      if (!unlockRes?.data?.alreadyUnlocked) {
        setRewardPopup({
          open: true,
          spent: Number(unlockRes?.data?.spentCredits ?? note?.cost ?? 3),
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

  const cost = Number(note?.cost ?? 3);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main notes-page">
        <Card className="notes-card">
          <div className="notes-preview">
            <div>
              <span className="notes-file-mark">NOTES</span>
              <p>Review details before unlocking this document.</p>
            </div>
          </div>
          <div className="notes-details">
            <h1 className="page-title">{note?.title || "Notes"}</h1>
            {note && <ResourcePublisher item={note} />}
            <p className="muted-text">
              {hasAccess
                ? "You already unlocked these notes. Download again anytime without spending more credits."
                : "Unlock these notes to download the file. Credits are deducted only once for this document."}
            </p>
            {!hasAccess && <p className="notes-cost">{cost} credits</p>}
            {statusMessage && <p className="success-text">{statusMessage}</p>}
            {error && <p className="error-text">{error}</p>}
            <div className="notes-actions">
              {hasAccess ? (
                <Button onClick={downloadNote} disabled={loading || !note}>
                  {loading ? "Downloading..." : "Download"}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowModal(true)}
                  disabled={loading || !note || checkingAccess}
                >
                  {loading ? "Processing..." : "Unlock & Download"}
                </Button>
              )}
              {error === "Insufficient Credits" && (
                <Button variant="ghost" onClick={() => navigate("/purchase-credits")}>
                  Purchase Credits
                </Button>
              )}
            </div>
          </div>
        </Card>
      </main>
      <TransactionModal
        open={showModal}
        title="Unlock Notes"
        requiredCredits={cost}
        currentCredits={Number(user?.credits ?? 0)}
        loading={loading}
        onCancel={() => setShowModal(false)}
        onConfirm={unlockAndDownload}
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
