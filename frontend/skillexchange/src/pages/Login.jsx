import { useState } from "react";
import API from "../api";
import "./AuthCSS.css";
import Logo from "../assets/Logo.png";
import { useNavigate, Link } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        setError("Login failed: No token received");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-shell">
        <section className="auth-copy" aria-label="About Skill Exchange">
          <div className="brand-header">
            <img src={Logo} alt="Skill Exchange logo" className="auth-logo" />
            <h1 className="brand-text">Skill Exchange</h1>
          </div>
          <p className="auth-description">
            Learn from people who build, teach, and share. Skill Exchange helps students upload
            videos and notes, discover useful resources, and trade knowledge through a simple
            credit based learning community.
          </p>
          <div className="auth-highlights" aria-label="Site highlights">
            <span>Video lessons</span>
            <span>Shared notes</span>
            <span>Credit rewards</span>
          </div>
        </section>

        <Card className="auth-card login-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-kicker">Log in to continue</p>
            <h2 className="auth-title">Welcome back</h2>
            {error && <p className="auth-error">{error}</p>}
            <Input type="email" name="email" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input type="password" name="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Button type="submit" disabled={loading} className="auth-submit">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
