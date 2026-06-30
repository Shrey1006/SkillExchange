import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import pic from "../assets/profile.svg";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import api, { resolveMediaUrl } from "../api";
import "./Profile.css";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    gender: "",
    email: "",
    phone: "",
    profilePicture: "",
  });
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/user/profile`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setProfile({
          name: data.name || "",
          gender: data.gender || "",
          email: data.email || "",
          phone: data.phone || "",
          profilePicture: data.profilePicture || "",
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/user/update-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            name: profile.name,
            gender: profile.gender,
            phone: profile.phone,
          }),
        },
      );
      if (!res.ok) throw new Error("Update failed");
      setIsEditing(false);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      setUploadingPicture(true);
      const res = await api.post("/user/upload-profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => ({
        ...prev,
        profilePicture: res.data.profilePicture || "",
      }));
      alert("Profile picture uploaded");
    } catch (err) {
      console.error("Profile picture upload error:", err);
      alert("Profile picture upload failed");
    } finally {
      setUploadingPicture(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="page-main profile-main">
        <Card className="profile-card">
          <div className="profile-left">
            <img
              src={resolveMediaUrl(profile.profilePicture) || pic}
              alt="Profile"
              className="profile-pic"
            />
            <label className="upload-file-label">
              <input
                type="file"
                accept="image/*"
                onChange={handlePictureUpload}
              />
              <Button variant="ghost" disabled={uploadingPicture}>
                {uploadingPicture ? "Uploading..." : "Profile Photo"}
              </Button>
            </label>
          </div>

          <div className="profile-right">
            <div className="profile-header">
              <h1 className="page-title">My Profile</h1>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </div>

            <div className="profile-form">
              <label>Name</label>
              {isEditing ? (
                <Input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                />
              ) : (
                <p>{profile.name || "-"}</p>
              )}

              <label>Gender</label>
              {isEditing ? (
                <select
                  className="ui-input"
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p>{profile.gender || "-"}</p>
              )}

              <label>Email</label>
              <p className="muted-text">{profile.email || "-"}</p>

              <label>Phone</label>
              {isEditing ? (
                <Input
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                />
              ) : (
                <p>{profile.phone || "-"}</p>
              )}

              {isEditing && (
                <div className="profile-actions">
                  <Button onClick={handleSave}>Save</Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
