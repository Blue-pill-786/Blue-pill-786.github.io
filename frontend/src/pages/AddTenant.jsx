import { useEffect, useState } from "react";
import { addTenant, getProperties, getProperty } from "../services/adminApi";
import { useNavigate } from "react-router-dom";

const AddTenant = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyId: "",
    floorName: "",
    roomNumber: "",
    bedLabel: "",
    monthlyRent: "",
    dueDayOfMonth: 5,
    lateFeePerDay: 50
  });

  const [autoAssign, setAutoAssign] = useState(true);
  const [properties, setProperties] = useState([]);
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch((err) => console.error("Failed to fetch properties", err));
  }, []);

  /* ================= DERIVED ================= */

  const allVacantBeds =
    propertyData?.floors?.flatMap((floor) =>
      floor.rooms?.flatMap((room) =>
        room.beds
          ?.filter((bed) => bed.status === "vacant")
          .map((bed) => ({
            ...bed,
            floorName: floor.name,
            roomNumber: room.number
          })) || []
      ) || []
    ) || [];

  const selectedAutoBed = autoAssign
    ? [...allVacantBeds].sort((a, b) =>
        a.floorName.localeCompare(b.floorName)
      )[0]
    : null;

  const selectedFloor = propertyData?.floors?.find(
    (f) => f.name === form.floorName
  );

  const selectedRoom = selectedFloor?.rooms?.find(
    (r) => r.number === form.roomNumber
  );

  const availableBeds = autoAssign
    ? allVacantBeds
    : selectedRoom?.beds?.filter((bed) => bed.status === "vacant") || [];

  /* ================= HANDLER ================= */

  const handleChange = async (e) => {
    const { name, value } = e.target;

    // PROPERTY CHANGE
    if (name === "propertyId") {
      setForm((prev) => ({
        ...prev,
        propertyId: value,
        floorName: "",
        roomNumber: "",
        bedLabel: "",
        monthlyRent: ""
      }));

      if (!value) {
        return setPropertyData(null);
      }

      try {
        setPropertyLoading(true);
        const property = await getProperty(value);
        setPropertyData(property);
      } catch (err) {
        console.error("Property fetch failed", err);
      } finally {
        setPropertyLoading(false);
      }

      return;
    }

    // FLOOR RESET
    if (name === "floorName") {
      return setForm((prev) => ({
        ...prev,
        floorName: value,
        roomNumber: "",
        bedLabel: "",
        monthlyRent: ""
      }));
    }

    // ROOM RESET
    if (name === "roomNumber") {
      return setForm((prev) => ({
        ...prev,
        roomNumber: value,
        bedLabel: "",
        monthlyRent: ""
      }));
    }

    // BED SELECT
    if (name === "bedLabel") {
      const selectedBed = availableBeds.find((b) => b.label === value);

      if (selectedBed) {
        return setForm((prev) => ({
          ...prev,
          bedLabel: value,
          monthlyRent:
            selectedBed.monthlyRent !== undefined
              ? selectedBed.monthlyRent
              : prev.monthlyRent
        }));
      }
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.propertyId) {
      setError("Please fill required fields");
      return;
    }

    if (!autoAssign && (!form.floorName || !form.roomNumber || !form.bedLabel)) {
      setError("Select floor, room and bed");
      return;
    }

    if (autoAssign && !selectedAutoBed) {
      setError("No vacant beds available");
      return;
    }

    const rentAmount = Number(
      form.monthlyRent || selectedAutoBed?.monthlyRent || 0
    );

    if (!rentAmount || rentAmount <= 0) {
      setError("Invalid rent amount");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await addTenant({
        ...form,
        monthlyRent: rentAmount,
        dueDayOfMonth: Number(form.dueDayOfMonth),
        lateFeePerDay: Number(form.lateFeePerDay),
        autoAssign
      });

      if (response.isExistingUser) {
        setSuccess("Tenant assigned successfully");
      } else {
        setSuccess(`Tenant created! Temporary Password: ${response.tempPassword}`);
      }

      setTimeout(() => navigate("/tenants"), 2000);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error creating tenant");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">Add New Tenant</h1>
          <p className="mt-2 text-slate-400">Create tenant profiles with automatic or manual bed assignment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ERROR/SUCCESS ALERTS */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/50 p-4 text-red-200 flex items-center gap-3">
              <span className="text-lg">❌</span>
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/50 p-4 text-green-200 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-semibold">Success</p>
                <p className="text-sm mt-1">{success}</p>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-cyan-100 mb-5">👤 Tenant Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
                <input
                  name="name"
                  value={form.name}
                  placeholder="e.g., John Doe"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="e.g., john@example.com"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number *</label>
                <input
                  name="phone"
                  value={form.phone}
                  placeholder="e.g., 9876543210"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>
          </div>

          {/* PROPERTY & BED SELECTION */}
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-cyan-100 mb-5">🏢 Property & Bed Assignment</h2>
            
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Property *</label>
              <select
                name="propertyId"
                value={form.propertyId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
              >
                <option value="">-- Choose Property --</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              {propertyLoading && <p className="mt-2 text-sm text-cyan-300 animate-pulse">Loading property details...</p>}
            </div>

            {/* AUTO vs MANUAL TOGGLE */}
            {form.propertyId && (
              <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm font-medium text-slate-300 mb-3">Bed Assignment Method</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition" style={{backgroundColor: autoAssign ? '#06b6d41a' : 'transparent', borderColor: autoAssign ? '#06b6d4' : 'transparent', borderWidth: '2px', opacity: autoAssign ? 1 : 0.6}}>
                    <input
                      type="radio"
                      checked={autoAssign}
                      onChange={() => setAutoAssign(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-200">🤖 Auto-Assign Best Bed</span>
                  </label>

                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition" style={{backgroundColor: !autoAssign ? '#3b82f61a' : 'transparent', borderColor: !autoAssign ? '#3b82f6' : 'transparent', borderWidth: '2px', opacity: !autoAssign ? 1 : 0.6}}>
                    <input
                      type="radio"
                      checked={!autoAssign}
                      onChange={() => setAutoAssign(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-200">👤 Manual Select</span>
                  </label>
                </div>
              </div>
            )}

            {/* AUTO-ASSIGN PREVIEW */}
            {form.propertyId && autoAssign && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30">
                <h3 className="text-sm font-semibold text-green-200 mb-3">✨ Auto-Assignment Preview</h3>
                {selectedAutoBed ? (
                  <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="font-medium text-green-300">Floor:</span> {selectedAutoBed.floorName}</p>
                    <p><span className="font-medium text-green-300">Room:</span> {selectedAutoBed.roomNumber}</p>
                    <p><span className="font-medium text-green-300">Bed:</span> {selectedAutoBed.label}</p>
                    <p><span className="font-medium text-green-300">Monthly Rent:</span> ₹{selectedAutoBed.monthlyRent}</p>
                  </div>
                ) : (
                  <p className="text-yellow-300 text-sm">No available beds in this property</p>
                )}
              </div>
            )}

            {/* MANUAL BED SELECTION */}
            {form.propertyId && !autoAssign && (
              <div className="space-y-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <h3 className="text-sm font-semibold text-blue-200">Select Bed Manually</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Floor *</label>
                  <select
                    name="floorName"
                    value={form.floorName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition"
                  >
                    <option value="">-- Select Floor --</option>
                    {propertyData?.floors?.map((f) => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {form.floorName && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Room *</label>
                    <select
                      name="roomNumber"
                      value={form.roomNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition"
                    >
                      <option value="">-- Select Room --</option>
                      {selectedFloor?.rooms?.map((r) => (
                        <option key={r.number} value={r.number}>{r.number}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.roomNumber && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Bed *</label>
                    <select
                      name="bedLabel"
                      value={form.bedLabel}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition"
                    >
                      <option value="">-- Select Bed --</option>
                      {availableBeds.map((b) => (
                        <option key={b.label} value={b.label}>{b.label} - ₹{b.monthlyRent}/mo</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BILLING DETAILS */}
          <div className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-purple-200 mb-5">💳 Billing Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Rent (₹) *</label>
                <input
                  name="monthlyRent"
                  type="number"
                  value={form.monthlyRent}
                  placeholder="Auto-filled if assigned"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Day of Month *</label>
                <select
                  name="dueDayOfMonth"
                  value={form.dueDayOfMonth}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                >
                  <option value="">-- Select Day --</option>
                  {Array.from({length: 28}, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day === 1 ? "1st" : day === 2 ? "2nd" : day === 3 ? "3rd" : `${day}th`}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Late Fee Per Day (₹) *</label>
                <input
                  type="number"
                  name="lateFeePerDay"
                  value={form.lateFeePerDay}
                  placeholder="e.g., 50"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-cyan-500/25 disabled:shadow-none"
            >
              {loading ? "Creating Tenant..." : "✓ Create Tenant"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/tenants")}
              className="px-6 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddTenant;