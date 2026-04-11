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
    monthlyRent: ""
  });

  const [properties, setProperties] = useState([]);
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProperties().then(res => setProperties(res.data));
  }, []);

  /* ================= HANDLE CHANGE ================= */

  const handleChange = async (e) => {
    const { name, value } = e.target;

    setForm(prev => ({ ...prev, [name]: value }));

    // 🔥 load full property data when selected
    if (name === "propertyId") {
      if (!value) return setPropertyData(null);

      const res = await getProperty(value);
      setPropertyData(res.data);

      // reset dependent fields
      setForm(prev => ({
        ...prev,
        propertyId: value,
        floorName: "",
        roomNumber: "",
        bedLabel: ""
      }));
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.propertyId) {
      return alert("Please fill required fields");
    }

    try {
      setLoading(true);

      const res = await addTenant({
        ...form,
        monthlyRent: Number(form.monthlyRent)
      });

      alert(
        `Tenant added\n${
          res.data.tempPassword
            ? "Temp Password: " + res.data.tempPassword
            : "Existing user reused"
        }`
      );

      navigate("/tenants");

    } catch (err) {
      alert(err.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= DERIVED DATA ================= */

  const selectedFloor = propertyData?.floors?.find(
    f => f.name === form.floorName
  );

  const selectedRoom = selectedFloor?.rooms?.find(
    r => r.number === form.roomNumber
  );

  return (
    <div className="max-w-xl mx-auto">

      <h2 className="text-xl font-semibold mb-6">Add Tenant</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-slate-900 p-6 rounded-xl border border-slate-800"
      >

        <input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
        />

        <input
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
        />

        {/* PROPERTY */}
        <select name="propertyId" value={form.propertyId} onChange={handleChange}>
          <option value="">Select Property</option>
          {properties.map(p => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* FLOOR */}
        <select name="floorName" value={form.floorName} onChange={handleChange}>
          <option value="">Select Floor</option>
          {propertyData?.floors?.map((f, i) => (
            <option key={i} value={f.name}>{f.name}</option>
          ))}
        </select>

        {/* ROOM */}
        <select name="roomNumber" value={form.roomNumber} onChange={handleChange}>
          <option value="">Select Room</option>
          {selectedFloor?.rooms?.map((r, i) => (
            <option key={i} value={r.number}>{r.number}</option>
          ))}
        </select>

        {/* BED */}
        <select name="bedLabel" value={form.bedLabel} onChange={handleChange}>
          <option value="">Select Bed</option>
          {selectedRoom?.beds?.map((b, i) => (
            <option key={i} value={b.label}>
              {b.label} ({b.status})
            </option>
          ))}
        </select>

        {/* RENT */}
        <input
          name="monthlyRent"
          type="number"
          placeholder="Rent"
          value={form.monthlyRent}
          onChange={handleChange}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Tenant"}
        </button>

      </form>
    </div>
  );
};

export default AddTenant;