import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = ['admin', 'manager', 'staff'].includes(user?.role);
  const isTenant = user?.role === 'tenant';

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/")
      ? "text-cyan-400"
      : "text-slate-300 hover:text-white";

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-grid text-slate-100">

      <header className="mx-auto flex max-w-7xl flex-col gap-3 border border-slate-800 bg-slate-950/90 px-6 py-4 shadow-float backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-200">PG Ops Console</h1>
          <p className="text-sm text-slate-400">Smart property management</p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/15 bg-slate-900/80 px-4 py-2">
          <span className="text-sm text-slate-300">
            {user ? `${user.name} (${user.role})` : "Loading user..."}
          </span>

          <button
            onClick={handleLogout}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm text-slate-950 hover:bg-cyan-400"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-3 px-6 pb-4">

        {/* UNIVERSAL SEARCH */}
        <Link to="/search" className={isActive("/search")}>🔍 Search</Link>

        {isAdmin && (
          <>
            <Link to="/admin" className={isActive("/admin")}>Dashboard</Link>
            <Link to="/properties" className={isActive("/properties")}>Properties</Link>
            <Link to="/tenants" className={isActive("/tenants")}>Tenants</Link>
            <Link to="/invoices" className={isActive("/invoices")}>Invoices</Link>
            <Link to="/reports" className={isActive("/reports")}>Reports</Link>
          </>
        )}

        {isTenant && (
          <>
            <Link to="/tenant" className={isActive("/tenant")}>Dashboard</Link>
            <Link to="/payments" className={isActive("/payments")}>Payments</Link>
            <Link to="/alerts" className={isActive("/alerts")}>Alerts</Link>
            <Link to="/tenant/profile" className={isActive("/tenant/profile")}>Profile</Link>
          </>
        )}

      </nav>

      <main className="mx-auto max-w-7xl px-6 pt-4 pb-10">
        <Outlet />
      </main>

    </div>
  );
};

export default Layout;