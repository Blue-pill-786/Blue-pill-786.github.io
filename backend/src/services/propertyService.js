import mongoose from 'mongoose';
import { Property } from '../models/Property.js';

/* ================= GET ALL ================= */

export const getAll = async () => {
  try {
    const properties = await Property.find().lean();
    return properties;
  } catch (err) {
    console.error('GET PROPERTIES ERROR:', err);
    throw err;
  }
};

/* ================= CREATE ================= */

export const create = async (data) => {
  const { name, code, city, address, floors } = data;

  if (!name || !code || !city || !address) {
    const err = new Error('Missing required property fields');
    err.statusCode = 400;
    throw err;
  }

  try {
    const property = await Property.create({
      name: name.trim(),
      code: code.trim(),
      city: city.trim(),
      address: address.trim(),
      floors: Array.isArray(floors) ? floors : []
    });

    return property;

  } catch (err) {

    // ✅ Handle duplicate key
    if (err.code === 11000) {
      const e = new Error('Property code already exists');
      e.statusCode = 409;
      throw e;
    }

    console.error('CREATE PROPERTY ERROR:', err);
    throw err;
  }
};

/* ================= GET BY ID ================= */

export const getById = async (id) => {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid property ID');
    err.statusCode = 400;
    throw err;
  }

  const property = await Property.findById(id)
    .populate({
      path: 'floors.rooms.beds.occupiedBy',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .lean();

  if (!property) {
    const err = new Error('Property not found');
    err.statusCode = 404;
    throw err;
  }

  return property;
};

export const updateById = async (id, data) => {
  return await Property.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};