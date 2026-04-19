import { useEffect, useState } from "react";
import { updateTenant, getTenant, getProperties, getProperty } from "../services/adminApi";
import { useNavigate, useParams } from "react-router-dom";

const EditTenant = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    emergencyContact: "",
    propertyId: "",
    floorName: "",
    roomNumber: "",
    bedLabel: "",
    monthlyRent: "",
    dueDayOfMonth: 5,
    lateFeePerDay: 50
  });

  const [autoAssign, setAutoAssign] = useState(false);
  const [properties, setProperties] = useState([]);
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        setPageLoading(true);
        
        // Fetch tenant
        const tenant = await getTenant(id);
        setForm({
          name: tenant.user?.name || "",
          email: tenant.user?.email || "",
          phone: tenant.user?.phone || "",
          emergencyContact: tenant.emergencyContact || "",
          propertyId: tenant.property?._id || "",
          floorName: tenant.floorName || "",
          roomNumber: tenant.roomNumber || "",
          bedLabel: tenant.bedLabel || "",
          monthlyRent: tenant.monthlyRent || "",
          dueDayOfMonth: tenant.dueDayOfMonth || 5,
          lateFeePerDay: tenant.lateFeePerDay || 50
        });

        // Fetch properties
        const propsData = await getProperties();
        setProperties(propsData);

        // Fetch property details if tenant has property
        if (tenant.property?._id) {
          const propDetails = await getProperty(tenant.property._id);
          setPropertyData(propDetails);
        }

      } catch (err) {
        console.error("Failed to load tenant", err);
        setError("Unable to load tenant details");
      } finally {
        setPageLoading(false);
      }
    };

    initPage();
  }, [id]);

  /* ================= DERIVED ================= */

  const allVacantBeds =
    propertyData?.floors?.flatMap((floor) =>
      floor.rooms?.flatMap((room) =>
        room.beds
          ?.map((bed) => ({
            ...bed,
            floorName: floor.name,
            roomNumber: room.number
          })) || []
      ) || []
    ) || [];

  const selectedAutoBed = autoAssign
    ? [...allVacantBeds].sort((a, b) => a.floorName.localeCompare(b.floorName))[0]
    : null;

  const selectedFloor = propertyData?.floors?.find((f) => f.name === form.floorName);
  const selectedRoom = selectedFloor?.rooms?.find((r) => r.number === form.roomNumber);
  const availableBeds = selectedRoom?.beds?.map(b => ({ ...b, floorName: selectedFloor.name, roomNumber: selectedRoom.number })) || [];

  /* ================= HANDLER ================= */

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "propertyId") {
      setForm((prev) => ({
        ...prev,
        propertyId: value,
        floorName: "",
        roomNumber: "",
        bedLabel: "",
        monthlyRent: ""
      }));

      if (value) {
        try {
          const property = await getProperty(value);
          setPropertyData(property);
        } catch (err) {
          console.error("Property fetch failed", err);
        }
      }
      return;
    }

    if (name === "floorName") {
      return setForm((prev) => ({
        ...prev,
        floorName: value,
        roomNumber: "",
        bedLabel: "",
        monthlyRent: ""
      }));
    }

    if (name === "roomNumber") {
      return setForm((prev) => ({
        ...prev,
        roomNumber: value,
        bedLabel: "",
        monthlyRent: ""
      }));
    }

    if (name === "bedLabel") {
      const selectedBed = availableBeds.find((b) => b.label === value);
      if (selectedBed) {
        return setForm((prev) => ({
          ...prev,
          bedLabel: value,
          monthlyRent: selectedBed.monthlyRent !== undefined ? selectedBed.monthlyRent : prev.monthlyRent
        }));
      }
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      return setError("Please fill required fields");
    }

    if (!autoAssign && (!form.floorName || !form.roomNumber || !form.bedLabel)) {
      return setError("Select floor, room and bed");
    }

    if (autoAssign && !selectedAutoBed) {
      return setError("No available beds");
    }

    const rentAmount = Number(form.monthlyRent || selectedAutoBed?.monthlyRent || 0);

    if (!rentAmount || rentAmount <= 0) {
      return setError("Invalid rent amount");
    }

    try {
      setLoading(true);
      setError("");

      await updateTenant(id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        emergencyContact: form.emergencyContact,
        floorName: autoAssign ? selectedAutoBed.floorName : form.floorName,
        roomNumber: autoAssign ? selectedAutoBed.roomNumber : form.roomNumber,
        bedLabel: autoAssign ? selectedAutoBed.label : form.bedLabel,
        monthlyRent: rentAmount,
        dueDayOfMonth: Number(form.dueDayOfMonth),
        lateFeePerDay: Number(form.lateFeePerDay)
      });

      alert("Tenant updated successfully!");
      navigate("/tenants");

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error updating tenant");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-slate-400">
          Loading tenant details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">Edit Tenant</h1>
          <p className="mt-2 text-slate-400">Update tenant information and assignment</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* TENANT INFORMATION */}
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

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                <input
                  name="phone"
                  value={form.phone}
                  placeholder="e.g., 9876543210"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Emergency Contact</label>
                <input
                  name="emergencyContact"
                  value={form.emergencyContact}
                  placeholder="e.g., Parent name"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>
          </div>

          {/* BED ASSIGNMENT */}
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-cyan-100 mb-5">🏢 Bed Assignment</h2>
            
            {form.propertyId && (
              <>
                <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm font-medium text-slate-300 mb-3">Current Assignment</p>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p><span className="font-medium">Floor:</span> {form.floorName || "-"}</p>
                    <p><span className="font-medium">Room:</span> {form.roomNumber || "-"}</p>
                    <p><span className="font-medium">Bed:</span> {form.bedLabel || "-"}</p>
                    <p><span className="font-medium text-emerald-300">Rent:</span> ₹{form.monthlyRent || "-"}</p>
                  </div>
                </div>

                <div className="space-y-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <h3 className="text-sm font-semibold text-blue-200">Update Bed Assignment</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Floor</label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-2">Room</label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-2">Bed</label>
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
              </>
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
                  placeholder="Rent amount"
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
              {loading ? "Updating Tenant..." : "✓ Save Changes"}
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

export default EditTenant;
