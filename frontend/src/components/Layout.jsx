import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">PG Ops Console</h1>
          <div className="flex items-center gap-4 text-sm">
            <span>{user?.name} ({user?.role})</span>
            <Link to="/" className="text-cyan-400 hover:text-cyan-300">Home</Link>
            <button onClick={logout} className="rounded-md bg-slate-800 px-3 py-1 hover:bg-slate-700">Logout</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
