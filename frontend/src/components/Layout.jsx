import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = ['admin', 'manager', 'staff'].includes(user?.role);
  const isTenant = user?.role === 'tenant';

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "text-cyan-400"
      : "text-slate-300 hover:text-white";

  return (
    <div className="min-h-screen bg-grid text-slate-100">

      <header className="mx-auto flex max-w-7xl flex-col gap-3 border border-slate-800 bg-slate-950/90 px-6 py-4 shadow-float backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-cyan-200">PG Ops Console</h1>
          <p className="mt-1 text-sm text-slate-400">Smart property management with neon 3D polish</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-500/15 bg-slate-900/80 px-4 py-2 shadow-inner">
          <span className="text-sm text-slate-300">{user?.name} ({user?.role})</span>
          <button onClick={logout} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-400">
            Logout
          </button>
        </div>
      </header>

      <nav className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-3 px-6 pb-4">
        {isAdmin && (
          <>
            <Link to="/admin" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/admin")}`}>
              Dashboard
            </Link>
            <Link to="/properties" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/properties")}`}>
              Properties
            </Link>
            <Link to="/tenants" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/tenants")}`}>
              Tenants
            </Link>
            <Link to="/invoices" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/invoices")}`}>
              Invoices
            </Link>
            <Link to="/add-property" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/add-property")}`}>
              Add Property
            </Link>
            <Link to="/add-tenant" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/add-tenant")}`}>
              Add Tenant
            </Link>
          </>
        )}

        {isTenant && (
          <Link to="/tenant" className={`rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-2 text-sm font-medium transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 ${isActive("/tenant")}`}>
            Tenant Dashboard
          </Link>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-6 pb-10">
        <Outlet />
      </main>

    </div>
  );
};

export default Layout;