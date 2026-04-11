import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "text-cyan-400"
      : "text-slate-300 hover:text-white";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      <header className="border-b border-slate-800 bg-slate-900 px-4 py-3 flex justify-between">
        <h1 className="font-bold">PG Ops Console</h1>

        <div className="flex gap-4 items-center">
          <span>{user?.name} ({user?.role})</span>
          <button onClick={logout} className="bg-slate-700 px-3 py-1 rounded">
            Logout
          </button>
        </div>
      </header>

      <nav className="flex gap-6 px-4 py-3 border-b border-slate-800 bg-slate-900">
        <Link to="/admin" className={isActive("/admin")}>Dashboard</Link>
        <Link to="/properties" className={isActive("/properties")}>Properties</Link>
        <Link to="/tenants" className={isActive("/tenants")}>Tenants</Link>
        <Link to="/add-property" className={isActive("/add-property")}>Add Property</Link>
        <Link to="/add-tenant" className={isActive("/add-tenant")}>Add Tenant</Link>
      </nav>

      <main className="p-6">
        <Outlet />
      </main>

    </div>
  );
};

export default Layout;