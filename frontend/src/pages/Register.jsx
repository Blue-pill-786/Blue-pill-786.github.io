import { useNavigate } from "react-router-dom";

const registrationOptions = [
  {
    title: "PG Owner / Admin",
    description:
      "Create your organization, owner account, and start managing properties, tenants, and billing.",
    cta: "Register as Owner",
    path: "/register/admin",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    title: "Tenant",
    description:
      "Create a tenant login account. Property, room, and profile details will be assigned by the PG owner later.",
    cta: "Register as Tenant",
    path: "/register/tenant",
    accent: "from-emerald-400 to-teal-500",
  },
];

const RegisterPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid px-4 py-10">
      <div className="w-full max-w-5xl rounded-[2rem] border border-cyan-500/10 bg-slate-950/95 p-8 shadow-float">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Choose account type</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Who is registering?</h1>
          <p className="mt-3 text-sm text-slate-400">
            Owners and tenants use different onboarding flows so the app can set up the right data from day one.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {registrationOptions.map((option) => (
            <button
              key={option.path}
              type="button"
              onClick={() => navigate(option.path)}
              className="rounded-[1.75rem] border border-slate-800 bg-slate-900/80 p-7 text-left transition hover:-translate-y-1 hover:border-cyan-400/40"
            >
              <div className={`inline-flex rounded-full bg-gradient-to-r ${option.accent} px-3 py-1 text-xs font-semibold text-slate-950`}>
                {option.title}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{option.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{option.description}</p>
              <div className="mt-8">
                <span className={`inline-flex rounded-2xl bg-gradient-to-r ${option.accent} px-5 py-3 text-sm font-semibold text-slate-950`}>
                  {option.cta}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already have an account? Use the login page and sign in with your role-specific credentials.
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
