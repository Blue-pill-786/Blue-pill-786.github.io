import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true
    },

    floorName: {
      type: String,
      required: true,
      trim: true
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true
    },

    bedLabel: {
      type: String,
      required: true,
      trim: true
    },

    monthlyRent: {
      type: Number,
      required: true,
      min: 0
    },

    dueDayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: 5
    },

    lateFeePerDay: {
      type: Number,
      min: 0,
      default: 50
    },

    autoAssigned: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["active", "left"],
      default: "active"
    },

    /* ✅ FUTURE READY */
    complaints: [
      {
        title: String,
        description: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

/* ================= INDEX ================= */

// ✅ Prevent duplicate active tenants
tenantSchema.index(
  { user: 1, property: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);

export const Tenant = mongoose.model("Tenant", tenantSchema);