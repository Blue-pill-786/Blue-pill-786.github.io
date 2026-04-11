import { useEffect, useState } from "react";
import { getTenants } from "../services/adminApi";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    getTenants().then(res => setTenants(res.data));
  }, []);

  return (
    <div>
      <h2 className="text-xl mb-4">Tenants</h2>

      <table className="w-full border border-slate-800">
        <thead className="bg-slate-800">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Room</th>
            <th>Bed</th>
            <th>Rent</th>
          </tr>
        </thead>

        <tbody>
          {tenants.map(t => (
            <tr key={t._id} className="border-t border-slate-800">
              <td>{t.user?.name}</td>
              <td>{t.user?.email}</td>
              <td>{t.roomNumber}</td>
              <td>{t.bedLabel}</td>
              <td>₹{t.monthlyRent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tenants;