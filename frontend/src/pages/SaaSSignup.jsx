import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const SaaSSignup = () => {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    organizationName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    companyPhone: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.organizationName.trim()) return setError('Organization name is required');
    if (!formData.ownerName.trim()) return setError('Owner name is required');
    if (!formData.ownerEmail.includes('@')) return setError('Valid email is required');
    if (formData.ownerPassword.length < 8) return setError('Password must be at least 8 characters');
    if (formData.ownerPassword !== formData.confirmPassword) return setError('Passwords do not match');

    setLoading(true);

    try {
      const response = await api.post('/saas/signup', {
        organizationName: formData.organizationName.trim(),
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        ownerPassword: formData.ownerPassword,
        companyPhone: formData.companyPhone.trim()
      });

      const signupData = response.data?.data;
      if (!signupData?.token || !signupData?.user) {
        throw new Error('Owner signup response is incomplete');
      }

      setAuthenticatedUser(signupData.token, signupData.user);
      navigate('/admin');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Owner registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold">PG Owner Registration</h1>
          <p className="mt-2 text-slate-400">Create your PG organization and admin account in one step.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/70 p-8 shadow-xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Owner / Admin</p>
            <h2 className="mt-3 text-3xl font-semibold">Start your PG Ops workspace</h2>
            <p className="mt-3 text-sm text-slate-400">
              This flow is for the PG owner or primary admin. Tenant accounts use a separate registration page.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Organization Name</label>
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                placeholder="Your PG or company name"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Owner Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Phone</label>
                <input
                  type="tel"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Owner Email</label>
              <input
                type="email"
                name="ownerEmail"
                value={formData.ownerEmail}
                onChange={handleInputChange}
                placeholder="owner@example.com"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  name="ownerPassword"
                  value={formData.ownerPassword}
                  onChange={handleInputChange}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Repeat password"
                  className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(56,189,248,0.35)] disabled:opacity-70"
            >
              {loading ? 'Creating owner account...' : 'Register as PG Owner'}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <button type="button" onClick={() => navigate('/register')} className="hover:text-white">
              Choose another account type
            </button>
            <button type="button" onClick={() => navigate('/register/tenant')} className="hover:text-white">
              Need tenant registration instead?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSSignup;
