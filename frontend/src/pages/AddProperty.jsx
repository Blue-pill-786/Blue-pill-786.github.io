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
    floors: []
  });

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
      return alert('Please fill in all floor, room, and bed labels before submitting.');
    }

    try {
      await api.post("/admin/properties", form);
      alert("Property created successfully");
      navigate("/properties");
    } catch (err) {
      console.error("Error:", err);
      const message = err.response?.data?.message || 'Failed to create property';
      alert(message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">

      <h2 className="text-xl font-semibold mb-4">Add Property</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* BASIC INFO */}
        <input
          name="name"
          value={form.name}
          placeholder="Property Name"
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
          required
        />
        <input
          name="code"
          value={form.code}
          placeholder="Property Code"
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
          required
        />
        <input
          name="city"
          value={form.city}
          placeholder="City"
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
          required
        />
        <input
          name="address"
          value={form.address}
          placeholder="Address"
          onChange={handleChange}
          className="w-full p-2 bg-slate-800"
          required
        />

        {/* FLOORS */}
        <div>
          <button type="button" onClick={addFloor} className="bg-cyan-500 px-3 py-1 rounded">
            + Add Floor
          </button>

          {form.floors.map((floor, i) => (
            <div key={i} className="mt-3 p-3 border border-slate-700">

              <input
                placeholder="Floor Name"
                value={floor.name}
                onChange={(e) => updateFloor(i, e.target.value)}
                className="w-full p-2 bg-slate-800 mb-2"
              />

              <button type="button" onClick={() => addRoom(i)} className="bg-green-500 px-2 py-1">
                + Add Room
              </button>

              {floor.rooms.map((room, j) => (
                <div key={j} className="mt-2 ml-4 border-l pl-3">

                  <input
                    placeholder="Room Number"
                    value={room.number}
                    onChange={(e) => updateRoom(i, j, e.target.value)}
                    className="w-full p-2 bg-slate-800 mb-2"
                  />

                  <button type="button" onClick={() => addBed(i, j)} className="bg-yellow-500 px-2 py-1">
                    + Add Bed
                  </button>

                  {room.beds.map((bed, k) => (
                    <div key={k} className="ml-4 mt-2 flex gap-2">

                      <input
                        placeholder="Bed Label"
                        value={bed.label}
                        onChange={(e) => updateBed(i, j, k, "label", e.target.value)}
                        className="p-2 bg-slate-800"
                      />

                      <input
                        type="number"
                        placeholder="Rent"
                        value={bed.monthlyRent}
                        onChange={(e) => updateBed(i, j, k, "monthlyRent", e.target.value)}
                        className="p-2 bg-slate-800"
                      />

                    </div>
                  ))}

                </div>
              ))}

            </div>
          ))}
        </div>

        <button type="submit" className="bg-cyan-500 px-4 py-2 rounded">
          Create Property
        </button>

      </form>
    </div>
  );
};

export default AddProperty;