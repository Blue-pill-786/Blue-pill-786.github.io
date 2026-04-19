import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProperties } from "../services/adminApi";
import { useAuth } from "../context/AuthContext";

const Properties = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canAddProperty = ["admin", "owner", "manager"].includes(user?.role);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProperties();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Properties</h2>
          <p className="mt-2 text-sm text-slate-400">
            Manage your PG buildings, room layouts, and available beds from one place.
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-cyan-300/70">
            {properties.length} {properties.length === 1 ? "property" : "properties"} in workspace
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadProperties}
            className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          >
            Refresh
          </button>

          {canAddProperty && (
            <button
              type="button"
              onClick={() => navigate("/add-property")}
              className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500"
            >
              Add New Property
            </button>
          )}
        </div>
      </div>

      {!properties.length ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
          <h3 className="text-xl font-semibold text-white">No properties found</h3>
          <p className="mt-3 text-sm text-slate-400">
            Start by creating your first property so you can add floors, rooms, beds, and tenants.
          </p>

          {canAddProperty ? (
            <button
              type="button"
              onClick={() => navigate("/add-property")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500"
            >
              Create First Property
            </button>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              Ask the PG owner or admin to create a property first.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => {
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

                <div className="mt-4 flex gap-2">
                  <Link
                    to={`/property/${property._id}`}
                    className="flex-1 rounded-lg bg-cyan-600/80 px-3 py-2 text-center text-sm text-white transition hover:bg-cyan-600"
                  >
                    View
                  </Link>

                  <button
                    onClick={() => navigate(`/edit-property/${property._id}`)}
                    className="flex-1 rounded-lg bg-blue-600/80 px-3 py-2 text-sm text-white transition hover:bg-blue-600"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Properties;
