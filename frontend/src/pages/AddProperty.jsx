import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

const AddProperty = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    code: "",
    city: "",
    address: "",
    floors: [],
    autoInvoicingEnabled: true,
    autoLateFeesEnabled: true,
    autoRemindersEnabled: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ================= FLOOR ================= */

  const addFloor = () => {
    setForm((prev) => ({
      ...prev,
      floors: [...prev.floors, { name: "", rooms: [] }]
    }));
  };

  const updateFloor = (index, value) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, idx) =>
        idx === index ? { ...floor, name: value } : floor
      )
    }));
  };

  /* ================= ROOM ================= */

  const addRoom = (floorIndex) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, idx) =>
        idx !== floorIndex
          ? floor
          : {
              ...floor,
              rooms: [...floor.rooms, { number: "", beds: [] }]
            }
      )
    }));
  };

  const updateRoom = (floorIndex, roomIndex, value) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, idx) =>
        idx !== floorIndex
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room, rIdx) =>
                rIdx === roomIndex ? { ...room, number: value } : room
              )
            }
      )
    }));
  };

  /* ================= BED ================= */

  const addBed = (floorIndex, roomIndex) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, idx) =>
        idx !== floorIndex
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room, rIdx) =>
                rIdx !== roomIndex
                  ? room
                  : {
                      ...room,
                      beds: [
                        ...room.beds,
                        { label: "", monthlyRent: 0, status: "vacant" }
                      ]
                    }
              )
            }
      )
    }));
  };

  const updateBed = (floorIndex, roomIndex, bedIndex, key, value) => {
    setForm((prev) => ({
      ...prev,
      floors: prev.floors.map((floor, fIdx) =>
        fIdx !== floorIndex
          ? floor
          : {
              ...floor,
              rooms: floor.rooms.map((room, rIdx) =>
                rIdx !== roomIndex
                  ? room
                  : {
                      ...room,
                      beds: room.beds.map((bed, bIdx) =>
                        bIdx !== bedIndex
                          ? bed
                          : {
                              ...bed,
                              [key]: key === "monthlyRent" ? Number(value) : value
                            }
                      )
                    }
              )
            }
      )
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.code || !form.city || !form.address) {
      setError("All property fields are required");
      return;
    }

    const hasInvalidFloor = form.floors.some(
      (floor) =>
        !floor.name.trim() ||
        floor.rooms.some(
          (room) =>
            !room.number.trim() ||
            room.beds.some((bed) => !bed.label.trim())
        )
    );

    if (hasInvalidFloor) {
      setError("Please fill all floor, room, and bed labels");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/admin/properties", form);

      setSuccess("Property created successfully");

      setTimeout(() => navigate("/properties"), 2000);

    } catch (err) {
      console.error("ERROR:", err.response?.data);

      setError(err.response?.data?.message || "Failed to create property");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-200 to-blue-400 bg-clip-text text-transparent">Add New Property</h1>
          <p className="mt-2 text-slate-400">Create and manage your PG property with autonomous features</p>
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

          {/* BASIC INFORMATION SECTION */}
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-cyan-100 mb-5">📋 Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Property Name *</label>
                <input
                  name="name"
                  value={form.name}
                  placeholder="e.g., Green Valley PG"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Property Code *</label>
                <input
                  name="code"
                  value={form.code}
                  placeholder="e.g., GV-001"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">City *</label>
                <input
                  name="city"
                  value={form.city}
                  placeholder="e.g., Bangalore"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address *</label>
                <input
                  name="address"
                  value={form.address}
                  placeholder="Full address"
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                />
              </div>
            </div>
          </div>

          {/* AUTONOMOUS FEATURES SECTION */}
          <div className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-purple-200 mb-5">⚙️ Autonomous Features</h2>
            <p className="text-sm text-slate-400 mb-4">Enable automated management features to streamline operations</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-purple-500/10 hover:border-purple-500/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={form.autoInvoicingEnabled}
                  onChange={(e) => setForm(prev => ({ ...prev, autoInvoicingEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                />
                <div>
                  <p className="font-medium text-white">Auto-generate Monthly Invoices</p>
                  <p className="text-xs text-slate-400">Automatically create rent invoices on the first day of each month</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-purple-500/10 hover:border-purple-500/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={form.autoLateFeesEnabled}
                  onChange={(e) => setForm(prev => ({ ...prev, autoLateFeesEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                />
                <div>
                  <p className="font-medium text-white">Auto-apply Late Fees</p>
                  <p className="text-xs text-slate-400">Automatically calculate and apply late fees for overdue payments</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-purple-500/10 hover:border-purple-500/30 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={form.autoRemindersEnabled}
                  onChange={(e) => setForm(prev => ({ ...prev, autoRemindersEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
                />
                <div>
                  <p className="font-medium text-white">Auto-send Payment Reminders</p>
                  <p className="text-xs text-slate-400">Automatically send SMS/email reminders to tenants before due date</p>
                </div>
              </label>
            </div>
          </div>

          {/* PROPERTY STRUCTURE SECTION */}
          <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-cyan-100">🏗️ Property Structure</h2>
              <button type="button" onClick={addFloor} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-white text-sm font-medium transition shadow-lg hover:shadow-cyan-500/25">
                ✚ Add Floor
              </button>
            </div>

            {form.floors.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="mb-3">No floors added yet</p>
                <button type="button" onClick={addFloor} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">Add your first floor →</button>
              </div>
            ) : (
              <div className="space-y-4">
                {form.floors.map((floor, i) => (
                  <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1">
                        <input
                          placeholder={`Floor ${i + 1} Name (e.g., Ground, First, Second)`}
                          value={floor.name}
                          onChange={(e) => updateFloor(i, e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition"
                        />
                      </div>
                      <span className="text-slate-500 text-sm font-medium">{Math.max(floor.rooms?.length || 0, 0)} rooms</span>
                    </div>

                    <button type="button" onClick={() => addRoom(i)} className="mb-4 px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white text-sm rounded-lg transition">
                      + Room
                    </button>

                    {floor.rooms.map((room, j) => (
                      <div key={j} className="ml-4 mb-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <input
                              placeholder="Room Number (e.g., 101, 102)"
                              value={room.number}
                              onChange={(e) => updateRoom(i, j, e.target.value)}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition text-sm"
                            />
                          </div>
                          <span className="text-slate-400 text-sm">{room.beds?.length || 0} beds</span>
                        </div>

                        <button type="button" onClick={() => addBed(i, j)} className="mb-3 px-2.5 py-1 bg-yellow-600/80 hover:bg-yellow-600 text-white text-xs rounded transition">
                          + Bed
                        </button>

                        {room.beds.map((bed, k) => (
                          <div key={k} className="flex gap-2 mb-2">
                            <input
                              placeholder="Bed Label"
                              value={bed.label}
                              onChange={(e) => updateBed(i, j, k, "label", e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Rent"
                              value={bed.monthlyRent}
                              onChange={(e) => updateBed(i, j, k, "monthlyRent", e.target.value)}
                              className="w-24 px-2.5 py-1.5 bg-slate-500 border border-slate-400 rounded text-white placeholder-slate-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition text-sm"
                            />
                          </div>
                        ))}

                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-cyan-500/25 disabled:shadow-none"
            >
              {loading ? "Creating Property..." : "✓ Create Property"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/properties")}
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

export default AddProperty;
