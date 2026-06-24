import Profile from "../assets/profile.svg";
import "./Navbar.css";
import Logo from "../assets/Logo.png";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/explore", label: "Explore" },
  { to: "/purchases", label: "Purchases" },
  { to: "/skills", label: "My Skills" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const uploadActive = location.pathname.startsWith("/upload");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left" onClick={() => navigate("/dashboard")}>
        <img src={Logo} alt="Logo" className="brand-logo" />
        <span className="brand-text">Skill Exchange</span>
      </div>

      <ul className="navbar-center">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
        <li className="nav-dropdown">
          <button
            type="button"
            className={uploadActive ? "nav-link nav-dropdown-trigger active" : "nav-link nav-dropdown-trigger"}
          >
            Upload
          </button>
          <div className="nav-dropdown-menu">
            <NavLink
              to="/upload-video"
              className={({ isActive }) => (isActive ? "nav-dropdown-item active" : "nav-dropdown-item")}
            >
              Video
            </NavLink>
            <NavLink
              to="/upload-notes"
              className={({ isActive }) => (isActive ? "nav-dropdown-item active" : "nav-dropdown-item")}
            >
              Notes
            </NavLink>
          </div>
        </li>
      </ul>

      <div className="navbar-right">
        <button
          className="credits credits-btn"
          onClick={() => navigate("/purchase-credits")}
          title="Purchase credits"
        >
          {user?.credits ?? 0} credits
        </button>
        <Button variant="ghost" className="theme-btn" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
        <NavLink to="/profile" className="profile-link">
          <img src={Profile} alt="Profile" className="profile-icon" />
        </NavLink>
        <Button variant="danger" className="logout-btn" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </nav>
  );
}
