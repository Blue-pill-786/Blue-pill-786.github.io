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

  return (
    <div className="p-2 border w-40 rounded bg-slate-800 text-white">

      <p className="font-semibold">{bed.label}</p>

      <p>₹{bed.monthlyRent}</p>

      <p className={bed.status === "occupied" ? "text-red-400" : "text-green-400"}>
        {bed.status}
      </p>

      {/* ✅ SHOW TENANT NAME */}
      {bed.occupiedBy && (
        <p className="text-sm mt-1">
          {bed.occupiedBy.user?.name || "Tenant"}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-1">
        {bed.status === "occupied" && (
          <button onClick={handleRemove} className="bg-red-500 px-2 py-1 rounded">
            Remove
          </button>
        )}

        <button onClick={handleRent} className="bg-blue-500 px-2 py-1 rounded">
          Edit Rent
        </button>
      </div>
    </div>
  );
};

export default BedCard;