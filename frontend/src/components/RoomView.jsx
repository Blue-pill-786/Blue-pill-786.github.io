import BedCard from "./BedCard";

const RoomView = ({ room, propertyId, floorName, refresh }) => {
  return (
    <div className="border p-3 mt-3">
      <h4>Room {room.number}</h4>

      <div className="flex gap-2 flex-wrap">
        {room.beds.map((bed, i) => (
          <BedCard
            key={i}
            bed={bed}
            propertyId={propertyId}
            roomNumber={room.number}
            floorName={floorName}
            refresh={refresh}
          />
        ))}
      </div>
    </div>
  );
};

export default RoomView;