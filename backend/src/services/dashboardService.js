import { env } from '../config/env.js';
import { Property } from '../models/Property.js';
import { Tenant } from '../models/Tenant.js';

export const getDashboardData = async () => {
  const [totalTenants, properties] = await Promise.all([
    Tenant.countDocuments({ status: 'active' }),
    Property.find({ isActive: true }).lean()
  ]);

  let totalBeds = 0;
  let occupiedBeds = 0;

  const occupancySummary = properties.map((property) => {
    const floors = Array.isArray(property.floors) ? property.floors : [];

    const propertyTotalBeds = floors.reduce(
      (floorSum, floor) =>
        floorSum + (Array.isArray(floor.rooms) ? floor.rooms.reduce(
          (roomSum, room) => roomSum + (Array.isArray(room.beds) ? room.beds.length : 0),
          0
        ) : 0),
      0
    );

    const propertyOccupiedBeds = floors.reduce(
      (floorSum, floor) =>
        floorSum + (Array.isArray(floor.rooms) ? floor.rooms.reduce(
          (roomSum, room) =>
            roomSum + (Array.isArray(room.beds) ? room.beds.filter((bed) => bed.status === 'occupied').length : 0),
          0
        ) : 0),
      0
    );

    totalBeds += propertyTotalBeds;
    occupiedBeds += propertyOccupiedBeds;

    return {
      propertyId: property._id,
      name: property.name,
      totalBeds: propertyTotalBeds,
      occupiedBeds: propertyOccupiedBeds,
      vacantBeds: propertyTotalBeds - propertyOccupiedBeds
    };
  });

  return {
    totalTenants,
    totalProperties: properties.length,
    occupiedBeds,
    vacantBeds: totalBeds - occupiedBeds,
    occupancySummary,
    automation: {
      enabled: env.enableCronJobs,
      timezone: env.cronTimezone,
      notificationProvider: env.notificationProvider,
      adminEmail: env.adminEmail || null,
      schedule: {
        monthlyInvoice: '1st day at 00:05',
        lateFeeUpdate: 'daily at 01:00',
        dueReminders: 'daily at 09:00',
        overdueAlerts: 'daily at 09:15',
        occupancySummary: 'daily at 10:00'
      }
    }
  };
};
