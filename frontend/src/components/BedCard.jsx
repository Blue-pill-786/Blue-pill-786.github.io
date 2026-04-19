import { removeTenant, updateRent } from "../services/adminApi";

const BedCard = ({ bed, propertyId, roomNumber, floorName, refresh }) => {

  const handleRemove = async () => {
    try {
      if (!bed.occupiedBy) return;

      await removeTenant(bed.occupiedBy._id);
      refresh(); // ✅ no reload
    } catch (err) {
      alert("Failed to remove tenant");
    }
  };

  const handleRent = async () => {
    const rent = prompt("Enter new rent", bed.monthlyRent);

    if (!rent) return;

    try {
      await updateRent({
        propertyId,
        floorName,
        roomNumber,
        bedLabel: bed.label,
        rent: Number(rent)
      });

      refresh(); // ✅ refresh data
    } catch (err) {
      alert("Failed to update rent");
    }
  };

  const occupantName = bed.occupiedBy?.user?.name || bed.occupiedBy?.name || "Tenant";
  const occupantEmail = bed.occupiedBy?.user?.email || null;

  return (
    <div className="p-3 w-44 rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-lg shadow-cyan-500/10">
      <p className="font-semibold text-cyan-200">{bed.label}</p>
      <p className="mt-1 text-sm text-slate-400">₹{bed.monthlyRent}</p>
      <p className={bed.status === "occupied" ? "mt-2 text-sm text-rose-400" : "mt-2 text-sm text-emerald-300"}>
        {bed.status}
      </p>

      {bed.occupiedBy && (
        <div className="mt-2 text-sm text-slate-300">
          <p>{occupantName}</p>
          {occupantEmail && <p className="text-xs text-slate-500">{occupantEmail}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {bed.status === "occupied" && (
          <button onClick={handleRemove} className="rounded-xl bg-rose-500 px-2 py-1 text-sm transition hover:bg-rose-400">
            Remove tenant
          </button>
        )}

        <button onClick={handleRent} className="rounded-xl bg-sky-500 px-2 py-1 text-sm transition hover:bg-sky-400">
          Edit rent
        </button>
      </div>
    </div>
  );
};

export default BedCard;