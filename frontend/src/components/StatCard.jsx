const StatCard = ({ title, value, hint }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-900/40">
    <p className="text-sm text-slate-400">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export default StatCard;
