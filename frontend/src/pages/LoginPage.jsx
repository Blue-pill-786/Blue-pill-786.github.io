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
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold">Login</h2>
        <p className="mt-1 text-sm text-slate-400">Admin, manager, staff, or tenant access</p>
        {error && <p className="mt-4 rounded bg-rose-900/30 p-2 text-sm text-rose-300">{error}</p>}
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-md border border-slate-700 bg-slate-800 p-2" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="w-full rounded-md border border-slate-700 bg-slate-800 p-2" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <button className="w-full rounded-md bg-cyan-600 p-2 font-medium hover:bg-cyan-500" type="submit">Sign in</button>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
