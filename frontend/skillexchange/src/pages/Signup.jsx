import { useState } from "react";
import API from "../api";
import "./AuthCSS.css";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Signup() {
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (form.password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      await API.post("/auth/signup", form);
      setMessage("Account created. You can now login.");
      setTimeout(() => navigate("/"), 900);
    } catch (err) {
      setMessage(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="brand-header">
        <img src={Logo} alt="Skill Exchange logo" className="auth-logo" />
        <h1 className="brand-text">Skill Exchange</h1>
      </div>
      <Card className="auth-card">
        <h2 className="auth-title">Create account</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          {message && <p className="auth-error">{message}</p>}
          <Input name="name" placeholder="Full name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input name="email" placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input type="password" name="password" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input type="password" placeholder="Confirm password" onChange={(e) => setConfirm(e.target.value)} />
          <Button type="submit">Create Account</Button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/">Log in</Link>
        </p>
      </Card>
    </div>
  );
}
