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
      const res = await getProperty(id);
      setProperty(res.data);
    } catch (err) {
      console.error("Error loading property", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!property) return <p>No property found</p>;

  return (
    <div>
      <h2>{property.name}</h2>

      {property.floors.length === 0 && <p>No rooms yet</p>}

      {property.floors.map((floor, i) => (
        <div key={i}>
          <h3>{floor.name}</h3>

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
      ))}
    </div>
  );
};

export default PropertyDetails;