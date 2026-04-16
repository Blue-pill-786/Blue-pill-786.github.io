import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";
import StatCard from "../components/StatCard";
import { api } from "../lib/api";

const COLORS = ["#22d3ee", "#f43f5e"];

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
          api.get("/admin/dashboard"),
          api.get("/admin/reports/monthly")
        ]);

        setDashboard(dRes.data.data);
        setReport(rRes.data.data);

      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-400">{error}</div>;
  }

  if (!dashboard) {
    return <div className="text-center py-10 text-slate-400">No data</div>;
  }

  const occupancyData = [
    { name: "Occupied", value: dashboard.occupiedBeds || 0 },
    { name: "Vacant", value: dashboard.vacantBeds || 0 }
  ];

  const cleanProperties =
    dashboard.occupancySummary
      ?.filter(p => p.totalBeds > 0 && p.name?.trim())
      .sort((a, b) => b.totalBeds - a.totalBeds) || [];

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400">Real-time analytics</p>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Tenants" value={dashboard.totalTenants || 0} />
        <StatCard title="Properties" value={dashboard.totalProperties || 0} />
        <StatCard title="Occupied Beds" value={dashboard.occupiedBeds || 0} />
        <StatCard title="Vacant Beds" value={dashboard.vacantBeds || 0} />
      </div>

      {/* PIE CHART */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
        <h3 className="text-white mb-4">Occupancy Overview</h3>

        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={occupancyData} dataKey="value" outerRadius={90}>
                {occupancyData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
        <h3 className="text-white mb-4">Property Occupancy Details</h3>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left p-2">Property</th>
              <th>Total</th>
              <th>Occupied</th>
              <th>Vacant</th>
              <th>%</th>
            </tr>
          </thead>

          <tbody>
            {cleanProperties.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-slate-400">
                  No valid property data
                </td>
              </tr>
            ) : (
              cleanProperties.map((prop) => {
                const rate = prop.totalBeds
                  ? Math.round((prop.occupiedBeds / prop.totalBeds) * 100)
                  : 0;

                return (
                  <tr key={prop.propertyId} className="border-b border-slate-700">
                    <td className="p-2 text-white font-semibold">
                      {prop.name.trim()}
                    </td>
                    <td>{prop.totalBeds}</td>
                    <td className="text-emerald-400">{prop.occupiedBeds}</td>
                    <td className="text-orange-400">{prop.vacantBeds}</td>
                    <td className="text-cyan-400">{rate}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FINANCE */}
      {report && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
          <h3 className="text-white mb-4">Monthly Finance</h3>

          <div className="grid md:grid-cols-3 gap-4 text-white">
            <div>💰 Income: ₹{report.income?.toLocaleString() || 0}</div>
            <div>💸 Expenses: ₹{report.expenses?.toLocaleString() || 0}</div>
            <div>📊 Net: ₹{report.net?.toLocaleString() || 0}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;