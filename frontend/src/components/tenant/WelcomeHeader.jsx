import PropTypes from 'prop-types';

const WelcomeHeader = ({ tenant, propertyData }) => {
  const tenantUser = tenant.user || {};

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-8 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Welcome, {tenantUser.name || 'Tenant'}! 👋
          </h1>
          <p className="mt-2 text-slate-400">Manage your accommodation and payments</p>
        </div>
      </div>

      {/* PROPERTY & ROOM INFO */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">📍 Property</p>
          <p className="font-semibold text-white">{propertyData.name || 'N/A'}</p>
          <p className="text-xs text-slate-500">{propertyData.city || ''}</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">🛏️ Room Assignment</p>
          <p className="font-semibold text-white">
            {tenant.floorName ? `Floor ${tenant.floorName}, Room ${tenant.roomNumber}, Bed ${tenant.bedLabel}` : 'N/A'}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">💰 Monthly Rent</p>
          <p className="font-semibold text-emerald-300 text-lg">₹{tenant.monthlyRent || 0}</p>
          <p className="text-xs text-slate-500">Due on {tenant.dueDayOfMonth || 'N/A'}th of month</p>
        </div>
      </div>
    </div>
  );
};

WelcomeHeader.propTypes = {
  tenant: PropTypes.shape({
    user: PropTypes.object,
    floorName: PropTypes.string,
    roomNumber: PropTypes.string,
    bedLabel: PropTypes.string,
    monthlyRent: PropTypes.number,
    dueDayOfMonth: PropTypes.number,
  }).isRequired,
  propertyData: PropTypes.shape({
    name: PropTypes.string,
    city: PropTypes.string,
  }).isRequired,
};

export default WelcomeHeader;
