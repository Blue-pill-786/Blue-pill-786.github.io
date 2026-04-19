import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useMemo } from "react";

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role;

  const navItems = useMemo(() => {
    const base = [{ label: "Search", path: "/search", icon: "🔍" }];

    if (["admin", "owner", "manager", "staff"].includes(role)) {
      base.push(
        { label: "Home", path: "/admin", icon: "🏠" },
        { label: "Props", path: "/properties", icon: "🏢" },
        { label: "Tenants", path: "/tenants", icon: "👥" },
        { label: "Money", path: "/invoices", icon: "💰" }
      );
    }

    if (role === "tenant") {
      base.push(
        { label: "Home", path: "/tenant", icon: "🏠" },
        { label: "Pay", path: "/payments", icon: "💳" },
        { label: "Alerts", path: "/alerts", icon: "🔔" }
      );
    }

    return base;
  }, [role]);

  const secondaryItems = [
    { label: "Profile", path: "/tenant/profile", icon: "👤" },
    { label: "Logout", action: logout, icon: "🚪" }
  ];

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-4 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur flex items-center justify-between">
        <button
          onClick={() => setMenuOpen(true)}
          className="text-xl p-2 rounded-lg hover:bg-slate-800"
        >
          ☰
        </button>

        <h1 className="text-sm font-semibold truncate text-cyan-300">
          {user?.name || "PG Console"}
        </h1>

        <div className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 capitalize">
          {role}
        </div>
      </header>

      {/* DRAWER */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMenuOpen(false)}
          />

          <div className="fixed top-0 left-0 h-full w-72 bg-slate-900 z-50 p-5 space-y-4 shadow-xl border-r border-slate-800 animate-slideIn">
            <button
              onClick={() => setMenuOpen(false)}
              className="text-right w-full text-slate-400"
            >
              ✕
            </button>

            <div className="text-sm text-slate-400 mb-2">Account</div>

            {secondaryItems.map((item, i) =>
              item.path ? (
                <Link
                  key={i}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                  {item.icon} {item.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={item.action}
                  className="block w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  {item.icon} {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}

      {/* CONTENT */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-28">
        <Outlet />
      </main>

      {/* BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around py-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center text-xs px-2 py-1 rounded-lg transition ${
              isActive(item.path)
                ? "text-cyan-400"
                : "text-slate-400"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Layout;