const StatCard = ({ title, value, hint, className = '' }) => (
  <div className={`rounded-[1.75rem] border border-cyan-500/10 bg-slate-950/90 p-5 shadow-float card-glow ${className}`}>
    <p className="text-sm uppercase tracking-[0.12em] text-slate-400">{title}</p>
    <p className="mt-3 text-3xl font-semibold text-cyan-100">{value}</p>
    {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
  </div>
);

export default StatCard;
