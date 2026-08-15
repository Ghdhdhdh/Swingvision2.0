import { NavLink } from "react-router-dom";

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">SV</span>
          SwingVision 2.0
        </NavLink>
        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            Home
          </NavLink>
          <NavLink
            to="/track"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            Live Tracking
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            Stats
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
