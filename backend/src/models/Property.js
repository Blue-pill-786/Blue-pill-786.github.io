import mongoose from 'mongoose';

/* ================= BED ================= */

const bedSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },

  occupiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },

  monthlyRent: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ['vacant', 'occupied', 'blocked'],
    default: 'vacant'
  }
}, { _id: false });

/* ================= ROOM ================= */

const roomSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    trim: true
  },

  beds: {
    type: [bedSchema],
    default: []
  },

  amenities: {
    type: [String],
    default: []
  }
}, { _id: false });

/* ================= FLOOR ================= */

const floorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  rooms: {
    type: [roomSchema],
    default: []
  }
}, { _id: false });

/* ================= PROPERTY ================= */

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  city: {
    type: String,
    required: true,
    trim: true
  },

  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  floors: {
    type: [floorSchema],
    default: []
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /* ✅ AUTONOMOUS TRACKING */
  occupancyStats: {
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },

  autoInvoicingEnabled: {
    type: Boolean,
    default: true
  },

  autoLateFeesEnabled: {
    type: Boolean,
    default: true
  },

  autoRemindersEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

/* ================= INDEX ================= */

// ✅ Ensure unique property code
propertySchema.index({ code: 1 }, { unique: true });

export const Property = mongoose.model('Property', propertySchema);