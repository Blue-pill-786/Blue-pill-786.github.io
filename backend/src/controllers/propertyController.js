/**
 * Production-Ready Property Controller
 */

import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { Invoice } from '../models/Invoice.js';

import ResponseFormatter from '../utils/responseFormatter.js';
import {
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError
} from '../utils/errors.js';

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
    const { name, code, city, address, totalBeds, totalRooms, totalFloors } = req.body;

    if (!name || !code || !city || !address) {
      throw new ValidationError('Missing required fields', []);
    }

    if (totalBeds <= 0 || totalRooms <= 0 || totalFloors <= 0) {
      throw new BadRequestError('Invalid infrastructure values');
    }

    const exists = await Property.findOne({ code: code.toUpperCase() });
    if (exists) throw new ConflictError('Property code already exists');

    const property = await Property.create({
      ...req.body,
      code: code.toUpperCase(),
      organization: req.user.organization,
      createdBy: req.user._id
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