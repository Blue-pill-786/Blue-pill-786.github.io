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

        setDashboard(dRes.data);
        setReport(rRes.data);

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
      <div className="text-center text-slate-400 py-10">
        Loading dashboard...
      </div>
    );
  }

  // ✅ Error UI
  if (error) {
    return (
      <div className="text-center text-red-400 py-10">
        {error}
      </div>
    );
  }

  // ✅ Safety fallback
  if (!dashboard) {
    return (
      <div className="text-center text-slate-400 py-10">
        No data available
      </div>
    );
  }

  // ✅ Safe chart data
  const occupancyData = [
    { name: 'Occupied', value: dashboard.occupiedBeds || 0 },
    { name: 'Vacant', value: dashboard.vacantBeds || 0 }
  ];

  return (
    <div className="space-y-6">

      {/* 🔹 Stats */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={dashboard.totalTenants || 0} />
        <StatCard title="Pending Payments" value={dashboard.pendingInvoices || 0} />
        <StatCard
          title="Monthly Revenue"
          value={`₹${dashboard.monthlyRevenue?.toLocaleString() || 0}`}
        />
        <StatCard title="Properties" value={dashboard.totalProperties || 0} />
      </section>

      {/* 🔹 Charts + Reports */}
      <section className="grid gap-4 lg:grid-cols-2">

        {/* 📊 Occupancy Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold mb-2">Occupancy</h3>

          <div className="h-64">
            {occupancyData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No occupancy data
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={occupancyData}
                    dataKey="value"
                    outerRadius={90}
                    label
                  >
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

        {/* 💰 Finance Report */}
        {report && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-semibold">
              Monthly Finance ({report.month || "N/A"})
            </h3>

            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>Income: ₹{report.income?.toLocaleString() || 0}</p>
              <p>Expenses: ₹{report.expenses?.toLocaleString() || 0}</p>
              <p className="font-semibold text-cyan-300">
                Net: ₹{report.net?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        )}

      </section>
    </div>
  );
};

export default AdminDashboard;