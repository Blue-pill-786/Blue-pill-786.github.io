import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTenants, removeTenant } from "../services/adminApi";

const Tenants = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTenants = async () => {
      try {
      const tenantsData = await getTenants();
      setTenants(tenantsData || []);

      } catch (err) {
        console.error("TENANTS ERROR:", err);
        setError("Failed to load tenants");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this tenant?")) {
      try {
        await removeTenant(id);
        setTenants(tenants.filter(t => t._id !== id));
        alert("Tenant removed successfully");
      } catch (err) {
        alert("Failed to remove tenant: " + err.response?.data?.message);
      }
    }
  };

  /* ================= STATES ================= */

  if (loading) {
    return <div className="p-4">Loading tenants...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!tenants.length) {
    return <div className="p-4 text-slate-300">No tenants found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tenant roster</h2>
        <p className="text-slate-400">{tenants.length} active tenant(s)</p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/80">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="p-3">Tenant</th>
              <th className="p-3">Email</th>
              <th className="p-3">Property</th>
              <th className="p-3">Room</th>
              <th className="p-3">Bed</th>
              <th className="p-3">Rent</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants
              .filter((t) => t.user)
              .map((t) => (
                <tr key={t._id} className="border-t border-slate-800 hover:bg-slate-900/70">
                  <td className="p-3 font-medium text-white">{t.user?.name || "-"}</td>
                  <td className="p-3 text-slate-400">{t.user?.email || "-"}</td>
                  <td className="p-3 text-slate-300">{t.property?.name || t.property?.code || "-"}</td>
                  <td className="p-3 text-slate-300">{t.roomNumber || "-"}</td>
                  <td className="p-3 text-slate-300">{t.bedLabel || "-"}</td>
                  <td className="p-3 text-emerald-300">₹{t.monthlyRent ?? "-"}</td>
                  <td className="p-3 space-x-2">
                    <button
                      onClick={() => navigate(`/edit-tenant/${t._id}`)}
                      className="px-3 py-1 bg-blue-600/70 hover:bg-blue-600 text-white text-xs rounded transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="px-3 py-1 bg-red-600/70 hover:bg-red-600 text-white text-xs rounded transition"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tenants;