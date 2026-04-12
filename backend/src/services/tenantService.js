import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs'; // ✅ use bcryptjs (no install pain)

import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { Property } from '../models/Property.js';
import { Invoice } from '../models/Invoice.js';

/* ================= GET ALL TENANTS ================= */

export const getAllTenants = async () => {
  try {
    const tenants = await Tenant.find({ status: 'active' })
      .populate('user', 'name email')
      .populate('property', 'name city code')
      .lean();

    return tenants;
  } catch (err) {
    console.error("GET TENANTS ERROR:", err);
    throw err;
  }
};

/* ================= CREATE TENANT ================= */

export const createTenantWithAssignment = async (data) => {
  const {
    name,
    email,
    phone,
    propertyId,
    floorName,
    roomNumber,
    bedLabel,
    monthlyRent
  } = data;

  if (!name || !email || !propertyId) {
    throw new Error("Missing required fields");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const property = await Property.findById(propertyId).session(session);
    if (!property) throw new Error("Property not found");

    /* ===== USER ===== */
    let user = await User.findOne({ email }).session(session);

    let tempPassword = null;
    let isExistingUser = false;

    if (!user) {
      tempPassword = crypto.randomBytes(4).toString("hex");
      const hashed = await bcrypt.hash(tempPassword, 10);

      const created = await User.create([{
        name,
        email,
        phone,
        password: hashed,
        role: "tenant"
      }], { session });

      user = created[0];
    } else {
      isExistingUser = true;
    }

    /* ===== TENANT ===== */
    const createdTenant = await Tenant.create([{
      user: user._id,
      property: propertyId,
      floorName,
      roomNumber,
      bedLabel,
      monthlyRent
    }], { session });

    const tenant = createdTenant[0];

    /* ===== UPDATE BED ===== */
    const updateResult = await Property.updateOne(
      {
        _id: propertyId,
        "floors.name": floorName,
        "floors.rooms.number": roomNumber,
        "floors.rooms.beds.label": bedLabel
      },
      {
        $set: {
          "floors.$[floor].rooms.$[room].beds.$[bed].status": "occupied",
          "floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy": tenant._id
        }
      },
      {
        session,
        arrayFilters: [
          { "floor.name": floorName },
          { "room.number": roomNumber },
          { "bed.label": bedLabel }
        ]
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Bed assignment failed");
    }

    await session.commitTransaction();

    return {
      tenant,
      user,
      tempPassword,
      isExistingUser
    };

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/* ================= UPDATE TENANT ================= */

export const updateTenant = async (tenantId, data) => {
  const {
    name,
    email,
    phone,
    emergencyContact,
    dueDayOfMonth,
    lateFeePerDay,
    monthlyRent,
    floorName,
    roomNumber,
    bedLabel
  } = data;

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new Error("Invalid tenant ID");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get existing tenant
    const existingTenant = await Tenant.findById(tenantId)
      .populate('user')
      .populate('property')
      .session(session);

    if (!existingTenant) throw new Error("Tenant not found");

    // Update user info if provided
    if (name || email || phone) {
      await User.updateOne(
        { _id: existingTenant.user._id },
        {
          $set: {
            ...(name && { name }),
            ...(email && { email }),
            ...(phone && { phone })
          }
        },
        { session }
      );
    }

    // Update tenant billing info
    const tenantUpdates = {
      ...(dueDayOfMonth && { dueDayOfMonth: Number(dueDayOfMonth) }),
      ...(lateFeePerDay !== undefined && { lateFeePerDay: Number(lateFeePerDay) }),
      ...(monthlyRent !== undefined && { monthlyRent: Number(monthlyRent) }),
      ...(emergencyContact && { emergencyContact })
    };

    if (Object.keys(tenantUpdates).length > 0) {
      await Tenant.updateOne(
        { _id: tenantId },
        { $set: tenantUpdates },
        { session }
      );
    }

    // Handle bed reassignment if floor/room/bed changed
    if (floorName && roomNumber && bedLabel) {
      const oldFloor = existingTenant.floorName;
      const oldRoom = existingTenant.roomNumber;
      const oldBed = existingTenant.bedLabel;

      // Free old bed
      if (oldFloor && oldRoom && oldBed) {
        await Property.updateOne(
          {
            _id: existingTenant.property._id,
            "floors.name": oldFloor,
            "floors.rooms.number": oldRoom,
            "floors.rooms.beds.label": oldBed
          },
          {
            $set: {
              "floors.$[floor].rooms.$[room].beds.$[bed].status": "vacant",
              "floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy": null
            }
          },
          {
            session,
            arrayFilters: [
              { "floor.name": oldFloor },
              { "room.number": oldRoom },
              { "bed.label": oldBed }
            ]
          }
        );
      }

      // Occupy new bed
      const updateResult = await Property.updateOne(
        {
          _id: existingTenant.property._id,
          "floors.name": floorName,
          "floors.rooms.number": roomNumber,
          "floors.rooms.beds.label": bedLabel
        },
        {
          $set: {
            "floors.$[floor].rooms.$[room].beds.$[bed].status": "occupied",
            "floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy": tenantId
          }
        },
        {
          session,
          arrayFilters: [
            { "floor.name": floorName },
            { "room.number": roomNumber },
            { "bed.label": bedLabel }
          ]
        }
      );

      if (updateResult.modifiedCount === 0) {
        throw new Error("Bed assignment failed");
      }

      // Update tenant bed info
      await Tenant.updateOne(
        { _id: tenantId },
        {
          $set: {
            floorName,
            roomNumber,
            bedLabel
          }
        },
        { session }
      );
    }

    await session.commitTransaction();

    // Return updated tenant
    return await Tenant.findById(tenantId)
      .populate('user', 'name email phone')
      .populate('property', 'name code city');

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/* ================= GET DASHBOARD ================= */

export const getDashboard = async (userId) => {
  try {
    // Fetch tenant for this user
    const tenant = await Tenant.findOne({ user: userId, status: 'active' })
      .populate('user', 'name email phone')
      .populate('property', 'name code city address floors');

    if (!tenant) {
      throw new Error("Tenant profile not found");
    }

    // Fetch invoices
    const invoices = await Invoice.find({ tenant: tenant._id })
      .sort({ dueDate: -1 })
      .lean();

    // Calculate invoice summary
    const summary = {
      total: invoices.length,
      pending: invoices.filter(inv => inv.status === 'pending').length,
      overdue: invoices.filter(inv => inv.status === 'overdue').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      totalDue: invoices
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.totalAmount, 0)
    };

    return {
      tenant,
      invoices,
      summary
    };
  } catch (err) {
    console.error("GET DASHBOARD ERROR:", err);
    throw err;
  }
};

/* ================= GET INVOICES ================= */

export const getInvoices = async (userId) => {
  try {
    // Find tenant for this user
    const tenant = await Tenant.findOne({ user: userId, status: 'active' });

    if (!tenant) {
      throw new Error("Tenant profile not found");
    }

    // Fetch invoices
    const invoices = await Invoice.find({ tenant: tenant._id })
      .populate('tenant', 'monthlyRent dueDayOfMonth user')
      .sort({ dueDate: -1 });

    return invoices;
  } catch (err) {
    console.error("GET INVOICES ERROR:", err);
    throw err;
  }
};

/* ================= CREATE COMPLAINT ================= */

export const createComplaint = async (userId, { title, description }) => {
  try {
    if (!title || !description) {
      throw new Error("Title and description are required");
    }

    // Find tenant for this user
    const tenant = await Tenant.findOne({ user: userId, status: 'active' });

    if (!tenant) {
      throw new Error("Tenant profile not found");
    }

    // Add complaint to tenant
    const complaint = {
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date()
    };

    await Tenant.updateOne(
      { _id: tenant._id },
      { $push: { complaints: complaint } }
    );

    return complaint;
  } catch (err) {
    console.error("CREATE COMPLAINT ERROR:", err);
    throw err;
  }
};

/* ================= REMOVE TENANT ================= */

export const removeTenant = async (tenantId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      throw new Error("Invalid tenant ID");
    }

    // Get tenant with property info
    const tenant = await Tenant.findById(tenantId)
      .populate('property')
      .session(session);

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Mark tenant as left
    await Tenant.updateOne(
      { _id: tenantId },
      { $set: { status: 'left' } },
      { session }
    );

    // Free up the bed
    const freeResult = await Property.updateOne(
      {
        _id: tenant.property._id,
        "floors.name": tenant.floorName,
        "floors.rooms.number": tenant.roomNumber,
        "floors.rooms.beds.label": tenant.bedLabel
      },
      {
        $set: {
          "floors.$[floor].rooms.$[room].beds.$[bed].status": "vacant",
          "floors.$[floor].rooms.$[room].beds.$[bed].occupiedBy": null
        }
      },
      {
        session,
        arrayFilters: [
          { "floor.name": tenant.floorName },
          { "room.number": tenant.roomNumber },
          { "bed.label": tenant.bedLabel }
        ]
      }
    );

    if (freeResult.modifiedCount === 0) {
      console.warn(`Bed not found for tenant ${tenantId}, but continuing with removal`);
    }

    await session.commitTransaction();

    return {
      tenantId,
      status: 'left'
    };
  } catch (err) {
    await session.abortTransaction();
    console.error("REMOVE TENANT ERROR:", err);
    throw err;
  } finally {
    session.endSession();
  }
};

/* ================= UPDATE BED RENT ================= */

export const updateBedRent = async ({ propertyId, floorName, roomNumber, bedLabel, rent }) => {
  try {
    if (!propertyId || !floorName || !roomNumber || !bedLabel || rent === undefined) {
      throw new Error("Missing required fields");
    }

    const result = await Property.updateOne(
      {
        _id: propertyId,
        "floors.name": floorName,
        "floors.rooms.number": roomNumber,
        "floors.rooms.beds.label": bedLabel
      },
      {
        $set: {
          "floors.$[floor].rooms.$[room].beds.$[bed].monthlyRent": Number(rent)
        }
      },
      {
        arrayFilters: [
          { "floor.name": floorName },
          { "room.number": roomNumber },
          { "bed.label": bedLabel }
        ]
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error("Bed not found or rent update failed");
    }

    // Update all active tenants in this bed with new rent
    await Tenant.updateMany(
      {
        property: propertyId,
        floorName,
        roomNumber,
        bedLabel,
        status: 'active'
      },
      {
        $set: { monthlyRent: Number(rent) }
      }
    );

    return { success: true, updated: result.modifiedCount };
  } catch (err) {
    console.error("UPDATE BED RENT ERROR:", err);
    throw err;
  }
};