import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProperties } from "../services/adminApi";

const Properties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProperties();

      // ✅ Ensure it's always an array
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load properties", err);
      setError("Unable to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-400">Loading properties...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">{error}</div>;
  }

  if (!properties.length) {
    return <div className="p-4 text-slate-300">No properties found.</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Properties</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {(properties || []).map((property) => {
          // ✅ Safe fallbacks
          const floors = property.floors || [];

          const totalBeds = floors.reduce((floorSum, floor) => {
            const rooms = floor.rooms || [];

            return (
              floorSum +
              rooms.reduce((roomSum, room) => {
                const beds = room.beds || [];
                return roomSum + beds.length;
              }, 0)
            );
          }, 0);

          const occupiedBeds = floors.reduce((floorSum, floor) => {
            const rooms = floor.rooms || [];

            return (
              floorSum +
              rooms.reduce((roomSum, room) => {
                const beds = room.beds || [];

                return (
                  roomSum +
                  beds.filter((bed) => bed?.status === "occupied").length
                );
              }, 0)
            );
          }, 0);

          return (
            <div
              key={property._id}
              className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 transition duration-300 hover:border-cyan-500"
            >
              <h3 className="text-lg font-semibold text-white">
                {property.name || "Unnamed Property"}
              </h3>

              <p className="text-sm text-cyan-300">
                {property.city || "No city"}
              </p>

              <p className="mt-2 text-slate-300">
                {property.address || "No address provided"}
              </p>

              <div className="mt-4 grid gap-2 text-sm text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Total beds</span>
                  <span>{totalBeds}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Occupied</span>
                  <span>{occupiedBeds}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Available</span>
                  <span>{Math.max(0, totalBeds - occupiedBeds)}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/property/${property._id}`}
                  className="flex-1 px-3 py-2 bg-cyan-600/80 hover:bg-cyan-600 text-white text-sm rounded-lg transition text-center"
                >
                  View
                </Link>

                <button
                  onClick={() =>
                    navigate(`/edit-property/${property._id}`)
                  }
                  className="flex-1 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-sm rounded-lg transition"
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Properties;