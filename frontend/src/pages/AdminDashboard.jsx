import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StatCard from '../components/StatCard';
import { api } from '../lib/api';

const COLORS = ['#22d3ee', '#f43f5e'];

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [dRes, rRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/reports/monthly')
        ]);

        setDashboard(dRes.data.data);
        setReport(rRes.data.data);

      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ✅ Loading UI
  if (loading) {
    return (
      <div className="text-center text-slate-400 py-10">Loading dashboard...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-10">{error}</div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center text-slate-400 py-10">No data available</div>
    );
  }

  const occupancyData = [
    { name: 'Occupied', value: dashboard.occupiedBeds || 0 },
    { name: 'Vacant', value: dashboard.vacantBeds || 0 }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-6 shadow-float card-glow">
        <h2 className="text-3xl font-semibold text-cyan-100">Admin Command Center</h2>
        <p className="mt-2 text-sm text-slate-400">Insights, occupancy and finance data in one polished dashboard.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={dashboard.totalTenants || 0} className="card-glow shadow-float" />
        <StatCard title="Total Properties" value={dashboard.totalProperties || 0} className="card-glow shadow-float" />
        <StatCard title="Occupied Beds" value={dashboard.occupiedBeds || 0} className="card-glow shadow-float" />
        <StatCard title="Vacant Beds" value={dashboard.vacantBeds || 0} className="card-glow shadow-float" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-5 shadow-float card-glow">
          <h3 className="font-semibold text-white mb-3">Automation Status</h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-3xl bg-slate-900/80 p-4">
              <p className="text-slate-400">Cron Automation</p>
              <p className="mt-1 text-xl font-semibold text-cyan-300">{dashboard.automation?.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-4">
              <p className="text-slate-400">Timezone</p>
              <p className="mt-1 text-lg text-slate-100">{dashboard.automation?.timezone || 'UTC'}</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-4">
              <p className="text-slate-400">Notification Provider</p>
              <p className="mt-1 text-lg text-slate-100">{dashboard.automation?.notificationProvider || 'console'}</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-4">
              <p className="text-slate-400">Admin Email</p>
              <p className="mt-1 text-lg text-slate-100">{dashboard.automation?.adminEmail || 'Not configured'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-5 shadow-float card-glow">
          <h3 className="font-semibold text-white mb-3">Occupancy</h3>
          <div className="h-64">
            {occupancyData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-full text-slate-500">No occupancy data</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={occupancyData} dataKey="value" outerRadius={90} label>
                    {occupancyData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {report && (
          <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-5 shadow-float card-glow">
            <h3 className="font-semibold text-white">Monthly Finance</h3>
            <p className="text-sm text-slate-400">{report.month || "N/A"}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-3xl bg-slate-900/80 p-4">
                <p className="text-slate-400">Income</p>
                <p className="mt-1 text-xl font-semibold text-cyan-300">₹{report.income?.toLocaleString() || 0}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4">
                <p className="text-slate-400">Expenses</p>
                <p className="mt-1 text-xl font-semibold text-rose-400">₹{report.expenses?.toLocaleString() || 0}</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-4">
                <p className="text-slate-400">Net</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">₹{report.net?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {dashboard.occupancySummary?.length > 0 && (
        <section className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-5 shadow-float card-glow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white">Property Occupancy Details</h3>
              <p className="text-sm text-slate-400">Detailed bed-level occupancy per property.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 overflow-x-auto">
            {dashboard.occupancySummary.map((property) => (
              <div key={property.propertyId} className="rounded-3xl bg-slate-900/80 p-4 grid gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase">Property</p>
                  <p className="text-sm text-white">{property.name || 'Unnamed'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Total Beds</p>
                  <p className="text-sm text-white">{property.totalBeds}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Occupied</p>
                  <p className="text-sm text-white">{property.occupiedBeds}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase">Vacant</p>
                  <p className="text-sm text-white">{property.vacantBeds}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;