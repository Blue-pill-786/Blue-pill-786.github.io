import mongoose from "mongoose";
import * as propertyService from "../services/propertyService.js";
import { catchAsync } from "../utils/catchAsync.js";

/* ================= GET ALL ================= */

export const getAllProperties = catchAsync(async (_req, res) => {
  const properties = await propertyService.getAll();

  res.json({
    success: true,
    data: properties || [],
  });
});

/* ================= CREATE ================= */

export const createProperty = catchAsync(async (req, res) => {
  const { name, code, city, address, floors } = req.body;

  // ✅ Basic validation
  if (!name || !code || !city || !address) {
    return res.status(400).json({
      success: false,
      message: "Missing required property fields",
    });
  }

  // ✅ Nested validation
  if (floors && Array.isArray(floors)) {
    for (const floor of floors) {
      if (!floor.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Floor name is required",
        });
      }

      for (const room of floor.rooms || []) {
        if (!room.number?.trim()) {
          return res.status(400).json({
            success: false,
            message: "Room number is required",
          });
        }

        for (const bed of room.beds || []) {
          if (!bed.label?.trim()) {
            return res.status(400).json({
              success: false,
              message: "Bed label is required",
            });
          }

          if (bed.monthlyRent < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid bed rent",
            });
          }
        }
      }
    }
  }

  console.log("🏢 Creating property:", name);

  const property = await propertyService.create({
    name,
    code,
    city,
    address,
    floors,
  });

  res.status(201).json({
    success: true,
    data: property,
  });
});

/* ================= GET BY ID ================= */

export const getProperty = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid property ID",
    });
  }

  const property = await propertyService.getById(id);

  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  res.json({
    success: true,
    data: property,
  });
});

/* ================= UPDATE ================= */

export const updateProperty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, code, city, address, floors } = req.body;

  // ✅ Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid property ID",
    });
  }

  // ✅ Basic validation
  if (!name || !code || !city || !address) {
    return res.status(400).json({
      success: false,
      message: "Missing required property fields",
    });
  }

  // ✅ Nested validation (same as create)
  if (floors && Array.isArray(floors)) {
    for (const floor of floors) {
      if (!floor.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Floor name is required",
        });
      }

      for (const room of floor.rooms || []) {
        if (!room.number?.trim()) {
          return res.status(400).json({
            success: false,
            message: "Room number is required",
          });
        }

        for (const bed of room.beds || []) {
          if (!bed.label?.trim()) {
            return res.status(400).json({
              success: false,
              message: "Bed label is required",
            });
          }

          if (bed.monthlyRent < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid bed rent",
            });
          }
        }
      }
    }
  }

  // 🔥 Update logic
  const updatedProperty = await propertyService.updateById(id, {
    name,
    code,
    city,
    address,
    floors,
  });

  if (!updatedProperty) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  res.json({
    success: true,
    data: updatedProperty,
  });
});