import mongoose from 'mongoose';

/* ================= BED ================= */
const bedSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  occupiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  monthlyRent: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['vacant', 'occupied', 'blocked', 'maintenance'], default: 'vacant' },
  lastOccupiedDate: Date,
  nextAvailableDate: Date,
}, { _id: false });

/* ================= ROOM ================= */
const roomSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  beds: { type: [bedSchema], default: [] },
  amenities: [String],
  type: { type: String, enum: ['single', 'double', 'triple', 'quad'], default: 'single' },
  squareFeet: Number,
  features: [String],
  maintenanceStatus: { type: String, enum: ['good', 'fair', 'needs_repair'], default: 'good' },
}, { _id: false });

/* ================= FLOOR ================= */
const floorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  number: Number,
  rooms: { type: [roomSchema], default: [] },
  commonAreas: [String],
}, { _id: false });

/* ================= PROPERTY ================= */
const propertySchema = new mongoose.Schema({
  // Relations
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Basic Info
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  description: String,
  type: { type: String, enum: ['pg', 'hostel', 'apartment', 'villa'], default: 'pg' },

  // Address
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: String,
  pincode: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },

  // Infrastructure
  floors: { type: [floorSchema], default: [] },
  totalRooms: { type: Number, default: 0 },
  totalBeds: { type: Number, default: 0 },
  commonAmenities: [String], // WiFi, parking, gym, laundry, etc.
  buildingAmenities: [String],

  // Financial
  propertyValue: Number,
  maintenanceCharges: { type: Number, default: 0 },
  securityDeposit: Number,
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String,
  },

  // Policies
  noticePeriod: { type: Number, default: 30 }, // in days
  visitorPolicy: String,
  petPolicy: String,
  smokingPolicy: { type: String, enum: ['allowed', 'prohibited', 'restricted'] },
  rulesAndRegulations: String,

  // Status & Tracking
  isActive: { type: Boolean, default: true },
  operationalStatus: { type: String, enum: ['operational', 'maintenance', 'closed'], default: 'operational' },
  
  // Automation
  autoInvoicingEnabled: { type: Boolean, default: true },
  autoLateFeesEnabled: { type: Boolean, default: true },
  autoRemindersEnabled: { type: Boolean, default: true },
  autoComplaintRouting: { type: Boolean, default: true },

  // Statistics
  occupancyStats: {
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    vacantBeds: { type: Number, default: 0 },
    blockedBeds: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 }, // percentage
    lastUpdated: { type: Date, default: Date.now },
  },
  
  financialStats: {
    totalMonthlyRent: { type: Number, default: 0 },
    expectedRevenue: { type: Number, default: 0 },
    actualRevenue: { type: Number, default: 0 },
    totalMaintenance: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },

  // Documents
  documents: [
    {
      type: { type: String, enum: ['registration', 'tax_registration', 'insurance', 'compliance'] },
      url: String,
      expiryDate: Date,
      uploadedAt: { type: Date, default: Date.now },
    }
  ],

  // Media
  photos: [String],
  videoTour: String,

  // Audit
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

/* ================= INDEX ================= */
propertySchema.index({ organization: 1, code: 1 }, { unique: true });
propertySchema.index({ organization: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ manager: 1 });
propertySchema.index({ city: 1 });
propertySchema.index({ isActive: 1 });

// Methods
propertySchema.methods.getOccupancyPercentage = function() {
  if (this.occupancyStats.totalBeds === 0) return 0;
  return Math.round((this.occupancyStats.occupiedBeds / this.occupancyStats.totalBeds) * 100);
};

propertySchema.methods.updateOccupancyStats = async function() {
  let occupied = 0, vacant = 0, blocked = 0;
  
  this.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.beds.forEach(bed => {
        if (bed.status === 'occupied') occupied++;
        else if (bed.status === 'vacant') vacant++;
        else if (bed.status === 'blocked') blocked++;
      });
    });
  });

  this.occupancyStats.occupiedBeds = occupied;
  this.occupancyStats.vacantBeds = vacant;
  this.occupancyStats.blockedBeds = blocked;
  this.occupancyStats.occupancyRate = this.getOccupancyPercentage();
  this.occupancyStats.lastUpdated = new Date();
  
  return this.save();
};

/**
 * Get vacant beds with details
 */
propertySchema.methods.getVacantBeds = function() {
  const vacant = [];
  this.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.beds.forEach(bed => {
        if (bed.status === 'vacant') {
          vacant.push({
            floorName: floor.name,
            roomNumber: room.number,
            bedLabel: bed.label,
            monthlyRent: bed.monthlyRent,
            nextAvailableDate: bed.nextAvailableDate,
          });
        }
      });
    });
  });
  return vacant;
};

/**
 * Get monthly revenue (occupied beds * rent)
 */
propertySchema.methods.calculateMonthlyRevenue = function() {
  let revenue = 0;
  this.floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.beds.forEach(bed => {
        if (bed.status === 'occupied') {
          revenue += bed.monthlyRent;
        }
      });
    });
  });
  return revenue;
};

/**
 * Get bed by label
 */
propertySchema.methods.findBed = function(floorName, roomNumber, bedLabel) {
  const floor = this.floors.find(f => f.name === floorName);
  if (!floor) return null;
  
  const room = floor.rooms.find(r => r.number === roomNumber);
  if (!room) return null;
  
  return room.beds.find(b => b.label === bedLabel);
};

/**
 * Update bed status
 */
propertySchema.methods.updateBedStatus = function(floorName, roomNumber, bedLabel, status) {
  const bed = this.findBed(floorName, roomNumber, bedLabel);
  if (!bed) throw new Error('Bed not found');
  
  bed.status = status;
  if (status === 'vacant') bed.occupiedBy = null;
  
  return this.save();
};

/**
 * Statics - Get by city and code
 */
propertySchema.statics.getByCity = function(city) {
  return this.find({ city, status: 'active' });
};

/**
 * Statics - Get by manager
 */
propertySchema.statics.getByManager = function(managerId) {
  return this.find({ manager: managerId });
};

export const Property = mongoose.model('Property', propertySchema);