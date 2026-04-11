import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },

  floorName: String,
  roomNumber: String,
  bedLabel: String,

  monthlyRent: Number,
  dueDayOfMonth: Number,
  lateFeePerDay: Number,

  status: {
    type: String,
    enum: ["active", "left"],
    default: "active"
  }
}, { timestamps: true });

export const Tenant = mongoose.model("Tenant", tenantSchema);