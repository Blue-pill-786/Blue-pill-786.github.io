import PropTypes from 'prop-types';

const StatCard = ({ title, value, icon, color, unit = '' }) => {
  const colorClasses = {
    emerald: 'border-emerald-500/15 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 text-emerald-300 text-emerald-400',
    yellow: 'border-yellow-500/15 bg-gradient-to-br from-yellow-900/20 to-slate-900/50 text-yellow-300 text-yellow-400',
    red: 'border-red-500/15 bg-gradient-to-br from-red-900/20 to-slate-900/50 text-red-300 text-red-400',
    cyan: 'border-cyan-500/15 bg-gradient-to-br from-cyan-900/20 to-slate-900/50 text-cyan-300 text-cyan-400',
  };

  const [borderBg, titleColor, valueColor] = colorClasses[color].split(' ');

  return (
    <div className={`rounded-2xl border ${borderBg} bg-gradient-to-br from-${color}-900/20 to-slate-900/50 p-6 backdrop-blur-sm`}>
      <p className={`text-sm ${titleColor} mb-2`}>{icon} {title}</p>
      <p className={`text-3xl font-bold text-${valueColor}`}>
        {unit}{value}
      </p>
      <p className="text-xs text-slate-400 mt-2">{title.toLowerCase()}</p>
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['emerald', 'yellow', 'red', 'cyan']).isRequired,
  unit: PropTypes.string,
};

const PaymentsSummary = ({ summary = {} }) => {
  const stats = [
    { title: 'Paid', value: summary.paid || 0, icon: '✅', color: 'emerald' },
    { title: 'Pending', value: summary.pending || 0, icon: '⏳', color: 'yellow' },
    { title: 'Overdue', value: summary.overdue || 0, icon: '🔴', color: 'red' },
    { title: 'Total Due', value: summary.totalDue || 0, icon: '💸', color: 'cyan', unit: '₹' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
};

PaymentsSummary.propTypes = {
  summary: PropTypes.shape({
    paid: PropTypes.number,
    pending: PropTypes.number,
    overdue: PropTypes.number,
    totalDue: PropTypes.number,
  }),
};

export default PaymentsSummary;
