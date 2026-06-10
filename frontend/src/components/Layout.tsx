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
      {/* Mobile overlay */}
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
      </aside>

      <div>
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
              <div style={{ fontSize: ".88rem" }}>{user?.subject ?? "guest"}</div>
              <div className="faint" style={{ fontSize: ".72rem", textTransform: "capitalize" }}>
                {user?.role ?? ""}
              </div>
            </div>
            <div
              className="avatar"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              {(user?.subject ?? "U")[0].toUpperCase()}
            </div>
            <button className="btn btn--ghost btn--sm" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="content fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
