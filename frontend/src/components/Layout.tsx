import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auth } from "../lib/auth";
import { notificationsApi } from "../features/notifications/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◉", roles: ["compliance", "rm"] },
  { to: "/onboarding", label: "Onboarding", icon: "✦", roles: ["compliance", "rm", "investor"] },
  { to: "/applications", label: "Applications", icon: "▤", roles: ["compliance", "rm"] },
  { to: "/compliance/review", label: "Review Queue", icon: "✓", roles: ["compliance"] },
  { to: "/clients", label: "Clients", icon: "❖", roles: ["compliance", "rm"] },
  { to: "/securities", label: "Securities", icon: "◈", roles: ["compliance", "rm"] },
  { to: "/strategies", label: "Strategies", icon: "◆", roles: ["compliance", "rm"] },
  { to: "/brokers", label: "Brokers", icon: "⬡", roles: ["compliance", "rm"] },
  { to: "/fee-schedules", label: "Fee Schedules", icon: "₹", roles: ["compliance"] },
  { to: "/orders", label: "Orders", icon: "⬡", roles: ["compliance", "rm"] },
  { to: "/trades", label: "Trades", icon: "⇄", roles: ["compliance", "rm"] },
  { to: "/holdings", label: "Holdings", icon: "▦", roles: ["compliance", "rm"] },
  { to: "/performance", label: "Performance", icon: "◆", roles: ["compliance", "rm"] },
  { to: "/reports", label: "Reports", icon: "▧", roles: ["compliance", "rm", "investor"] },
  { to: "/activity", label: "Activity", icon: "▸", roles: ["compliance", "rm", "investor"] },
  { to: "/my-portfolio", label: "My Portfolio", icon: "◉", roles: ["investor"] },
  { to: "/settings", label: "Settings", icon: "⚙", roles: ["compliance", "rm", "investor"] },
];

export function Layout() {
  const navigate = useNavigate();
  const user = auth.getUser();
  const role = user?.role ?? "";
  const displayName = user?.full_name ?? user?.subject ?? "User";
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000,
  });
  const unread = unreadData?.count ?? 0;

  const nav = NAV.filter((n) => n.roles.includes(role)).map((n) =>
    role === "investor" && n.to === "/onboarding" ? { ...n, label: "My Onboarding" } : n
  );

  const logout = () => {
    auth.clear();
    navigate("/login");
  };

  return (
    <div className="shell">
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark">P</div>
          <div>
            <div className="brand__name">Aurum PMS</div>
            <div className="brand__sub">Discretionary</div>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item--active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-item__icon">{n.icon}</span>
              {n.label}
              {n.to === "/activity" && unread > 0 && (
                <span className="nav-badge">{unread > 99 ? "99+" : unread}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div style={{ fontSize: ".72rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            SEBI Registered PMS<br />
            INP000XXXXXX
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="row">
            <button
              className="hamburger"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              <span /><span /><span />
            </button>
            <div className="muted" style={{ fontSize: ".9rem" }}>
              SEBI-registered Portfolio Management Service
            </div>
          </div>
          <div className="row">
            <button
              className="btn btn--ghost btn--sm"
              style={{ position: "relative" }}
              onClick={() => navigate("/activity")}
            >
              ▸ Activity
              {unread > 0 && <span className="topbar-badge">{unread}</span>}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: ".88rem", fontWeight: 500 }}>{displayName}</div>
              <div className="faint" style={{ fontSize: ".72rem", textTransform: "capitalize" }}>
                {role === "rm" ? "Relationship Manager" : role === "compliance" ? "Compliance Officer" : role || ""}
              </div>
            </div>
            <div
              className="avatar"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              {displayName[0].toUpperCase()}
            </div>
            <button className="btn btn--ghost btn--sm" onClick={logout}>Logout</button>
          </div>
        </header>

        <main className="content fade-in">
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>Aurum PMS · SEBI (Portfolio Managers) Regulations, 2020</span>
          <span>Discretionary Portfolio Management · All rights reserved</span>
        </footer>
      </div>
    </div>
  );
}
