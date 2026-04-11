import express from 'express';
import dayjs from 'dayjs';
import { protect, authorize } from '../middleware/auth.js';
import { Property } from '../models/Property.js';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';

const router = express.Router();
router.use(protect, authorize('admin', 'manager', 'staff'));

/* ================= DASHBOARD ================= */

router.get('/dashboard', async (_req, res) => {
  try {
    const [totalTenants, totalProperties, occupiedAgg] = await Promise.all([
      Tenant.countDocuments({ status: 'active' }),
      Property.countDocuments({ isActive: true }),
      Property.aggregate([
        { $unwind: '$floors' },
        { $unwind: '$floors.rooms' },
        { $unwind: '$floors.rooms.beds' },
        {
          $group: {
            _id: null,
            totalBeds: { $sum: 1 },
            occupiedBeds: {
              $sum: {
                $cond: [
                  { $eq: ['$floors.rooms.beds.status', 'occupied'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const bedStats = occupiedAgg[0] || { totalBeds: 0, occupiedBeds: 0 };

    res.json({
      totalTenants,
      totalProperties,
      occupiedBeds: bedStats.occupiedBeds,
      vacantBeds: bedStats.totalBeds - bedStats.occupiedBeds
    });

  } catch (err) {
    res.status(500).json({ message: "Dashboard error" });
  }
});

/* ================= GET ALL PROPERTIES ================= */

router.get('/properties', async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch {
    res.status(500).json({ message: "Error fetching properties" });
  }
});

/* ================= CREATE PROPERTY ================= */

const isValidFloors = (floors) => {
  if (!Array.isArray(floors)) return true;
  return floors.every((floor) =>
    floor?.name?.toString().trim() &&
    Array.isArray(floor.rooms) &&
    floor.rooms.every((room) =>
      room?.number?.toString().trim() &&
      Array.isArray(room.beds) &&
      room.beds.every((bed) => bed?.label?.toString().trim())
    )
  );
};

router.post('/properties', async (req, res) => {
  try {
    const { name, code, city, address, floors } = req.body;

    if (!name?.toString().trim() || !code?.toString().trim() || !city?.toString().trim() || !address?.toString().trim()) {
      return res.status(400).json({ message: 'Missing required property fields' });
    }

    if (!isValidFloors(floors)) {
      return res.status(400).json({ message: 'Floor, room, and bed labels are required' });
    }

    const property = await Property.create({
      name: name.toString().trim(),
      code: code.toString().trim(),
      city: city.toString().trim(),
      address: address.toString().trim(),
      floors: Array.isArray(floors) ? floors : []
    });

    res.status(201).json(property);
  } catch (err) {
    console.error('CREATE PROPERTY ERROR:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Property code must be unique' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, errors: err.errors });
    }
    res.status(500).json({ message: err.message || 'Error creating property' });
  }
});

/* ================= GET PROPERTY ================= */

router.get('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate({
        path: 'floors.rooms.beds.occupiedBy',
        populate: { path: 'user', select: 'name email' }
      });

    if (!property) return res.status(404).json({ message: "Not found" });

    res.json(property);

  } catch {
    res.status(500).json({ message: "Error fetching property" });
  }
});

/* ================= GET TENANTS ================= */

router.get('/tenants', async (req, res) => {
  try {
    const tenants = await Tenant.find({ status: 'active', user: { $exists: true, $ne: null } })
      .populate('user', 'name email');

    res.json(tenants);

  } catch (err) {
    console.error("TENANTS ERROR:", err);
    res.status(500).json({ message: "Error fetching tenants" });
  }
});

/* ================= CREATE TENANT ================= */

router.post('/tenants', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      propertyId,
      floorName,
      roomNumber,
      bedLabel,
      monthlyRent
    } = req.body;

    if (!name || !email || !propertyId || !floorName || !roomNumber || !bedLabel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });

    const floor = property.floors.find(f => f.name === floorName);
    if (!floor) return res.status(400).json({ message: "Floor not found" });

    const room = floor.rooms.find(r => r.number === roomNumber);
    if (!room) return res.status(400).json({ message: "Room not found" });

    const bed = room.beds.find(b => b.label === bedLabel);
    if (!bed) return res.status(400).json({ message: "Bed not found" });

    if (bed.status === "occupied") {
      return res.status(400).json({ message: "Bed already occupied" });
    }

    let user = await User.findOne({ email });
    let tempPassword = null;

    if (!user) {
      tempPassword = Math.random().toString(36).slice(-8);

      user = await User.create({
        name,
        email,
        phone,
        password: tempPassword,
        role: 'tenant'
      });
    } else {
      user.name = name;
      user.phone = phone;
      await user.save();
    }

    const existingTenant = await Tenant.findOne({
      user: user._id,
      property: propertyId,
      status: "active"
    });

    if (existingTenant) {
      return res.status(400).json({
        message: "Tenant already exists for this property"
      });
    }

    const tenant = await Tenant.create({
      user: user._id,
      property: propertyId,
      floorName,
      roomNumber,
      bedLabel,
      monthlyRent: Number(monthlyRent) || 0
    });

    user.tenantProfile = tenant._id;
    await user.save();

    const updateResult = await Property.updateOne(
      {
        _id: propertyId,
        'floors.name': floorName,
        'floors.rooms.number': roomNumber,
        'floors.rooms.beds.label': bedLabel
      },
      {
        $set: {
          'floors.$[floor].rooms.$[room].beds.$[bed].status': 'occupied',
          'floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy': tenant._id,
          'floors.$[floor].rooms.$[room].beds.$[bed].monthlyRent': Number(monthlyRent) || 0
        }
      },
      {
        arrayFilters: [
          { 'floor.name': floorName },
          { 'room.number': roomNumber },
          { 'bed.label': bedLabel }
        ]
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        message: "Failed to assign bed"
      });
    }

    res.status(201).json({
      message: "Tenant added successfully",
      user,
      tenant,
      tempPassword
    });

  } catch (err) {
    console.error("CREATE TENANT ERROR:", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }

    res.status(500).json({
      message: err.message || "Error creating tenant"
    });
  }
});

/* ================= REMOVE TENANT ================= */

router.delete('/tenants/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'Not found' });

    await Property.updateOne(
      { 'floors.rooms.beds.occupiedBy': tenant._id },
      {
        $set: {
          'floors.$[].rooms.$[].beds.$[bed].status': 'vacant',
          'floors.$[].rooms.$[].beds.$[bed].occupiedBy': null
        }
      },
      {
        arrayFilters: [{ 'bed.occupiedBy': tenant._id }]
      }
    );

    tenant.status = 'left';
    await tenant.save();

    res.json({ message: 'Tenant removed' });

  } catch {
    res.status(500).json({ message: "Error removing tenant" });
  }
});

/* ================= UPDATE RENT ================= */

router.put('/beds/rent', async (req, res) => {
  try {
    const { propertyId, floorName, roomNumber, bedLabel, rent } = req.body;

    await Property.updateOne(
      {
        _id: propertyId,
        'floors.name': floorName,
        'floors.rooms.number': roomNumber,
        'floors.rooms.beds.label': bedLabel
      },
      {
        $set: {
          'floors.$[floor].rooms.$[room].beds.$[bed].monthlyRent': Number(rent) || 0
        }
      },
      {
        arrayFilters: [
          { 'floor.name': floorName },
          { 'room.number': roomNumber },
          { 'bed.label': bedLabel }
        ]
      }
    );

    res.json({ message: 'Rent updated' });

  } catch {
    res.status(500).json({ message: "Error updating rent" });
  }
});

/* ================= MONTHLY REPORT ================= */

router.get('/reports/monthly', async (_req, res) => {
  try {
    const month = dayjs().format('YYYY-MM');

    res.json({
      month,
      income: 0,
      expenses: 0,
      net: 0
    });

  } catch {
    res.status(500).json({ message: "Report error" });
  }
});

export default router;