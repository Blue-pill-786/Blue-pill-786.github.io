/**
 * Production-Ready Property Controller
 */

import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { Invoice } from '../models/Invoice.js';
import { Organization } from '../models/Organization.js';

import ResponseFormatter from '../utils/responseFormatter.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError
} from '../utils/errors.js';

const getPropertyStats = (floors = []) => {
  let totalRooms = 0;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let blockedBeds = 0;
  let totalMonthlyRent = 0;

  floors.forEach((floor) => {
    (floor.rooms || []).forEach((room) => {
      totalRooms += 1;

      (room.beds || []).forEach((bed) => {
        totalBeds += 1;
        totalMonthlyRent += Number(bed.monthlyRent) || 0;

        if (bed.status === 'occupied') {
          occupiedBeds += 1;
        } else if (bed.status === 'blocked') {
          blockedBeds += 1;
        }
      });
    });
  });

  const vacantBeds = Math.max(0, totalBeds - occupiedBeds - blockedBeds);
  const occupancyRate = totalBeds
    ? Math.round((occupiedBeds / totalBeds) * 100)
    : 0;

  return {
    totalRooms,
    totalBeds,
    occupancyStats: {
      totalBeds,
      occupiedBeds,
      vacantBeds,
      blockedBeds,
      occupancyRate,
      lastUpdated: new Date()
    },
    financialStats: {
      totalMonthlyRent,
      expectedRevenue: totalMonthlyRent,
      actualRevenue: 0,
      totalMaintenance: 0,
      lastUpdated: new Date()
    }
  };
};

/* ================= PROPERTY CRUD ================= */

export const getAllProperties = async (req, res, next) => {
  try {
    const { city, status, page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organization;

    const query = organizationId ? { organization: organizationId } : {};
    if (city) query.city = city;
    if (status) query.status = status;

    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    return res.json(
      ResponseFormatter.paginated(properties, page, limit, total, 'Properties retrieved')
    );
  } catch (err) {
    next(err);
  }
};

export const getProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) throw new NotFoundError('Property', req.params.id);

    return res.json(ResponseFormatter.success(property));
  } catch (err) {
    next(err);
  }
};

export const createProperty = async (req, res, next) => {
  try {
    const { name, code, city, address } = req.body;

    if (!name || !code || !city || !address) {
      throw new ValidationError('Missing required fields', []);
    }

    const normalizedCode = code.trim().toUpperCase();
    const floors = Array.isArray(req.body.floors) ? req.body.floors : [];
    const stats = getPropertyStats(floors);

    const exists = await Property.findOne({
      code: normalizedCode,
      ...(req.user.organization ? { organization: req.user.organization } : {})
    });
    if (exists) throw new ConflictError('Property code already exists');

    let ownerId = req.user._id;

    if (req.user.organization) {
      const organization = await Organization.findById(req.user.organization)
        .select('owner')
        .lean();

      ownerId = organization?.owner?.userId || ownerId;
    }

    const property = await Property.create({
      ...req.body,
      floors,
      code: normalizedCode,
      totalRooms: stats.totalRooms,
      totalBeds: stats.totalBeds,
      owner: ownerId,
      ...(req.user.role === 'manager' && !req.body.manager
        ? { manager: req.user._id }
        : {}),
      organization: req.user.organization,
      createdBy: req.user._id,
      occupancyStats: stats.occupancyStats,
      financialStats: stats.financialStats
    });

    return res.json(ResponseFormatter.created(property));
  } catch (err) {
    next(err);
  }
};

export const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) throw new NotFoundError('Property', req.params.id);

    if (req.body.code) {
      throw new BadRequestError('Cannot change property code');
    }

    Object.assign(property, req.body);
    await property.save();

    return res.json(ResponseFormatter.updated(property));
  } catch (err) {
    next(err);
  }
};

export const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) throw new NotFoundError('Property', req.params.id);

    property.status = 'inactive';
    await property.save();

    return res.json(ResponseFormatter.updated(property, 'Property deactivated'));
  } catch (err) {
    next(err);
  }
};

/* ================= BED MANAGEMENT ================= */

export const getVacantBeds = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) throw new NotFoundError('Property', req.params.id);

    const vacantBeds = [];

    (property.floors || []).forEach(floor => {
      (floor.rooms || []).forEach(room => {
        (room.beds || []).forEach(bed => {
          if (bed.status === 'vacant') {
            vacantBeds.push(bed);
          }
        });
      });
    });

    return res.json(ResponseFormatter.success(vacantBeds));
  } catch (err) {
    next(err);
  }
};

export const updateBedStatus = async (req, res, next) => {
  try {
    const { id, bedId } = req.params;
    const { status } = req.body;

    const property = await Property.findById(id);
    if (!property) throw new NotFoundError('Property', id);

    let found = false;

    property.floors?.forEach(floor => {
      floor.rooms?.forEach(room => {
        room.beds?.forEach(bed => {
          if (bed._id.toString() === bedId) {
            bed.status = status;
            found = true;
          }
        });
      });
    });

    if (!found) throw new NotFoundError('Bed', bedId);

    await property.save();

    return res.json(ResponseFormatter.updated(property));
  } catch (err) {
    next(err);
  }
};

/* ================= FINANCIAL ================= */

export const getMonthlyRevenue = async (req, res, next) => {
  try {
    const { id } = req.params;

    const match = { status: 'paid' };
    if (id) match.property = new mongoose.Types.ObjectId(id);

    const data = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' }
        }
      }
    ]);

    return res.json(ResponseFormatter.success(data[0] || { total: 0 }));
  } catch (err) {
    next(err);
  }
};

/* ================= SEARCH ================= */

export const getPropertiesByCity = async (req, res, next) => {
  try {
    const { city } = req.query;
    if (!city) throw new BadRequestError('City required');

    const properties = await Property.find({
      city: { $regex: city, $options: 'i' }
    }).lean();

    return res.json(ResponseFormatter.success(properties));
  } catch (err) {
    next(err);
  }
};

export const getPropertiesByManager = async (req, res, next) => {
  try {
    const properties = await Property.find({
      manager: req.user._id
    }).lean();

    return res.json(ResponseFormatter.success(properties));
  } catch (err) {
    next(err);
  }
};
