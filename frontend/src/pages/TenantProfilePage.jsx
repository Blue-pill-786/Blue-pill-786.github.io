import { useEffect, useState } from "react";
import api from "../lib/apiService";
import { useNotification } from "../context/NotificationContext";

const NO_PROFILE_MESSAGE =
  "Your tenant profile has not been assigned yet. Please contact your admin.";

const TenantProfilePage = () => {
  const { showError, showSuccess } = useNotification();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    emergencyContactName: "",
    emergencyContactPhone: "",
    alternatePhone: "",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/tenant/profile");
      const tenant = res.data?.data;

      if (!tenant) {
        setProfile(null);
        setError(NO_PROFILE_MESSAGE);
        return;
      }

      setProfile(tenant);
      setFormData({
        emergencyContactName: tenant?.emergencyContact?.name || "",
        emergencyContactPhone: tenant?.emergencyContact?.phone || "",
        alternatePhone: tenant?.alternatePhone || "",
      });
    } catch (err) {
      console.error("PROFILE ERROR:", err);

      const msg =
        err.response?.status === 404
          ? NO_PROFILE_MESSAGE
          : err.response?.data?.message || "Failed to load profile";

      setError(msg);
      if (err.response?.status !== 404) {
        showError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put("/tenant/profile", formData);
      showSuccess("Profile updated");
      setEditing(false);
      await loadProfile();
    } catch (err) {
      const msg = err.response?.data?.message || "Update failed";
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        Loading...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Tenant Profile Pending</h1>
          <p className="mt-3 text-amber-100">
            {error || NO_PROFILE_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 text-white">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 mb-6">
        <h2 className="text-xl font-bold">{profile?.user?.name}</h2>
        <p className="text-slate-400">{profile?.user?.email}</p>
        <p className="text-slate-500 text-sm mt-2">
          {profile?.property
            ? `${profile.property.name} (${profile.property.city})`
            : "Property assignment pending"}
        </p>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 space-y-4">
        <input
          name="emergencyContactName"
          value={formData.emergencyContactName}
          onChange={handleChange}
          disabled={!editing}
          placeholder="Emergency Contact Name"
          className="w-full p-2 bg-slate-800 border border-slate-700 rounded"
        />

        <input
          name="emergencyContactPhone"
          value={formData.emergencyContactPhone}
          onChange={handleChange}
          disabled={!editing}
          placeholder="Emergency Contact Phone"
          className="w-full p-2 bg-slate-800 border border-slate-700 rounded"
        />

        <input
          name="alternatePhone"
          value={formData.alternatePhone}
          onChange={handleChange}
          disabled={!editing}
          placeholder="Alternate Phone"
          className="w-full p-2 bg-slate-800 border border-slate-700 rounded"
        />

        <div className="flex gap-4 pt-4">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-cyan-600 px-4 py-2 rounded"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 px-4 py-2 rounded disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => {
                  setEditing(false);
                  loadProfile();
                }}
                className="bg-gray-600 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantProfilePage;
