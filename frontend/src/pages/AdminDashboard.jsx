import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StatCard from '../components/StatCard';
import { api } from '../lib/api';

const COLORS = ['#22d3ee', '#334155'];

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [dRes, rRes] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/reports/monthly')]);
      setDashboard(dRes.data);
      setReport(rRes.data);
    };
    load();
  }, []);

  if (!dashboard) return <p>Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={dashboard.totalTenants} />
        <StatCard title="Pending Payments" value={dashboard.pendingInvoices} />
        <StatCard title="Monthly Revenue" value={`₹${dashboard.monthlyRevenue.toLocaleString()}`} />
        <StatCard title="Properties" value={dashboard.totalProperties} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold">Occupancy</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Occupied', value: dashboard.occupiedBeds },
                    { name: 'Vacant', value: dashboard.vacantBeds }
                  ]}
                  dataKey="value"
                  outerRadius={90}
                  label
                >
                  {COLORS.map((color) => (
                    <Cell key={color} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {report && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="font-semibold">Monthly Finance ({report.month})</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>Income: ₹{report.income.toLocaleString()}</p>
              <p>Expenses: ₹{report.expenses.toLocaleString()}</p>
              <p className="font-semibold text-cyan-300">Net: ₹{report.net.toLocaleString()}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
