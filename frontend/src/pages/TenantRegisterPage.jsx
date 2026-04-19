import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const TenantRegisterPage = () => {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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
      const { data } = await api.post("/auth/register", {
        ...form,
        role: "tenant",
      });

      setAuthenticatedUser(data.token, data.user);
      navigate("/tenant/profile");
    } catch (err) {
      const msg = err.response?.data?.message || "Tenant registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-emerald-500/10 bg-slate-950/95 p-8 shadow-float">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/70">Tenant registration</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Create your tenant login</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your room and profile details will appear after the PG owner assigns you inside the system.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="name"
            value={form.name}
            placeholder="Full name"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-emerald-400"
          />
          <input
            name="email"
            type="email"
            value={form.email}
            placeholder="Email"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-emerald-400"
          />
          <input
            name="password"
            type="password"
            value={form.password}
            placeholder="Password"
            onChange={handleChange}
            required
            className="w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-inner focus:border-emerald-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(16,185,129,0.35)]"
          >
            {loading ? "Creating account..." : "Register as Tenant"}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-xs text-slate-500">
          <button type="button" onClick={() => navigate("/register")} className="hover:text-slate-300">
            Choose another account type
          </button>
          <button type="button" onClick={() => navigate("/login")} className="hover:text-slate-300">
            Already have an account?
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantRegisterPage;
