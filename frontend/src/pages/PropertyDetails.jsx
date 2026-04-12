import { useEffect, useState } from "react";
import { getProperty } from "../services/adminApi";
import { useParams } from "react-router-dom";
import RoomView from "../components/RoomView";

const PropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const property = await getProperty(id);
      setProperty(property);
    } catch (err) {
      console.error("Error loading property", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [id]);

  if (loading) return <p className="text-slate-400">Loading property details…</p>;
  if (!property) return <p className="text-rose-400">No property found.</p>;

  const totalBeds = property.floors.reduce(
    (floorSum, floor) =>
      floorSum + floor.rooms.reduce(
        (roomSum, room) => roomSum + room.beds.length,
        0
      ),
    0
  );

  const occupiedBeds = property.floors.reduce(
    (floorSum, floor) =>
      floorSum + floor.rooms.reduce(
        (roomSum, room) => roomSum + room.beds.filter((bed) => bed.status === 'occupied').length,
        0
      ),
    0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl shadow-cyan-500/10">
        <h2 className="text-3xl font-semibold text-white">{property.name}</h2>
        <p className="text-slate-400">{property.address}, {property.city}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/70 p-4">
            <p className="text-sm uppercase text-slate-500">Floors</p>
            <p className="mt-2 text-xl font-semibold text-cyan-300">{property.floors.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/70 p-4">
            <p className="text-sm uppercase text-slate-500">Total beds</p>
            <p className="mt-2 text-xl font-semibold text-white">{totalBeds}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/70 p-4">
            <p className="text-sm uppercase text-slate-500">Occupied</p>
            <p className="mt-2 text-xl font-semibold text-emerald-300">{occupiedBeds}</p>
          </div>
        </div>
      </div>

      {property.floors.length === 0 ? (
        <p className="text-slate-400">No floors or rooms have been added yet.</p>
      ) : (
        property.floors.map((floor, i) => (
          <div key={i} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
            <h3 className="text-xl font-semibold text-cyan-300">{floor.name}</h3>
            {floor.rooms.length === 0 && <p className="text-slate-500">No rooms on this floor.</p>}
            {floor.rooms.map((room, j) => (
              <RoomView
                key={j}
                room={room}
                propertyId={id}
                floorName={floor.name}
                refresh={loadProperty}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default PropertyDetails;