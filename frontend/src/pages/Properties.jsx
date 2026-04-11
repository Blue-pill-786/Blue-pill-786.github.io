import { useEffect, useState } from "react";
import { getProperties } from "../services/adminApi";
import { useNavigate } from "react-router-dom";

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getProperties().then(res => setProperties(res.data));
  }, []);

  return (
    <div>
      <h2>Properties</h2>

      {properties.map(p => (
        <div
          key={p._id}
          onClick={() => navigate(`/property/${p._id}`)}
          className="p-4 border cursor-pointer"
        >
          {p.name} - {p.city}
        </div>
      ))}
    </div>
  );
};

export default Properties;