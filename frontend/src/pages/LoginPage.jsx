import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'tenant' ? '/tenant' : '/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/10 bg-slate-950/95 p-8 shadow-float">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Welcome back</p>
          <h1 className="text-3xl font-semibold text-white">Login to PG Ops</h1>
          <p className="text-sm text-slate-400">Secure access for admins and tenants with a futuristic dashboard feel.</p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-5">
          <input
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner transition focus:border-cyan-400"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner transition focus:border-cyan-400"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <button
            className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(56,189,248,0.35)]"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
