import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post('/auth/register', form);
      const user = await login(form.email, form.password);

      if (user.role === 'tenant') {
        navigate('/tenant');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || "Registration failed");

      if (msg === "User already exists") {
        setError("Account exists. Please login instead.");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/10 bg-slate-950/95 p-8 shadow-float">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Register for PG Ops</h1>
          <p className="mt-2 text-sm text-slate-400">Sign up to manage tenants, properties and billing in style.</p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-200">
            💡 <strong>New:</strong> Create your organization account with our new SaaS platform! Get a 30-day free trial.
          </p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-3 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition"
          >
            Start SaaS Signup →
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="name"
            value={form.name}
            placeholder="Name"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-cyan-400"
          />
          <input
            name="email"
            type="email"
            value={form.email}
            placeholder="Email"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-cyan-400"
          />
          <input
            name="password"
            type="password"
            value={form.password}
            placeholder="Password"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(56,189,248,0.35)]"
          >
            {loading ? "Registering..." : "Register (Legacy)"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Note: Legacy registration is for backward compatibility. New users should use SaaS signup above.
        </p>
      </div>
    </div>
  );
};
export default RegisterPage;