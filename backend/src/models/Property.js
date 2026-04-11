import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  label: { type: String, required: true },
  occupiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  monthlyRent: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['vacant', 'occupied', 'blocked'], default: 'vacant' }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true },
  beds: { type: [bedSchema], default: [] },
  amenities: { type: [String], default: [] }
}, { _id: false });

const floorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rooms: { type: [roomSchema], default: [] }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  name: String,
  code: { type: String, unique: true },
  address: String,
  city: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  floors: { type: [floorSchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Property = mongoose.model('Property', propertySchema);