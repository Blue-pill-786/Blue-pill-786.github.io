import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    // Relations
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization"
    },
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

    // Room Assignment
    floorNumber: { type: Number, required: true },
    floorName: { type: String, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    bedLabel: { type: String, required: true, trim: true },

    // Rental Terms
    monthlyRent: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, min: 0, default: 0 },
    depositPaid: { type: Number, min: 0, default: 0 },
    depositRefunded: { type: Number, min: 0, default: 0 },
    dueDayOfMonth: { type: Number, min: 1, max: 31, default: 5 },
    lateFeePerDay: { type: Number, min: 0, default: 50 },
    securityDeposit: { type: Number, min: 0 },

    // Lease Information
    leaseStartDate: { type: Date, required: true },
    leaseEndDate: { type: Date },
    renewalDate: Date,
    leaseDuration: { type: Number }, // in months
    leaseTerms: String,

    // Status
    status: {
      type: String,
      enum: ["active", "left", "suspended", "pending"],
      default: "active"
    },
    checkInDate: Date,
    checkOutDate: Date,

    // Contact Information
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
      email: String,
    },
    alternatePhone: String,

    // Personal Details
    dateOfBirth: Date,
    idProofType: { type: String, enum: ["aadhar", "pan", "passport", "driving_license"] },
    idProofNumber: String,
    occupation: String,
    company: String,

    // Verification & Documents
    isVerified: { type: Boolean, default: false },
    documents: [
      {
        type: { type: String, enum: ["id_proof", "address_proof", "income_proof", "guarantee"] },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
      }
    ],

    // Payment Configuration
    autoInvoicing: { type: Boolean, default: true },
    advancePaymentAllowed: { type: Boolean, default: true },
    partialPaymentAllowed: { type: Boolean, default: false },

    // Complaints & Maintenance
    complaints: [
      {
        title: String,
        description: String,
        category: { type: String, enum: ["maintenance", "noise", "amenities", "other"] },
        status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
        priority: { type: String, enum: ["low", "medium", "high"] },
        createdAt: { type: Date, default: Date.now },
        resolvedAt: Date,
        attachments: [String],
      }
    ],

    // Preferences
    notifications: {
      emailInvoice: { type: Boolean, default: true },
      emailReminder: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },

    // Occupancy
    occupancyStatus: {
      occupied: { type: Boolean, default: true },
      occupancyStartDate: Date,
      numberOfOccupants: { type: Number, default: 1 },
    },

    // Audit
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for performance
tenantSchema.index({ organization: 1 });
tenantSchema.index({ user: 1 });
tenantSchema.index({ property: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ leaseStartDate: 1 });
tenantSchema.index({ leaseEndDate: 1 });
tenantSchema.index({ createdAt: -1 });
tenantSchema.index(
  { organization: 1, user: 1, property: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
// Composite indexes for common queries
tenantSchema.index({ organization: 1, status: 1, leaseEndDate: 1 });
tenantSchema.index({ property: 1, status: 1 });
tenantSchema.index({ user: 1, status: 1 });

// Virtual for days remaining in lease
tenantSchema.virtual('daysRemainingInLease').get(function() {
  if (!this.leaseEndDate) return null;
  const now = new Date();
  const diff = this.leaseEndDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Methods
tenantSchema.methods.isLeaseExpired = function() {
  return this.leaseEndDate && this.leaseEndDate < new Date();
};

tenantSchema.methods.getDaysInCurrentLease = function() {
  const now = new Date();
  const diff = now - this.leaseStartDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Calculate remaining deposit
 */
tenantSchema.methods.getRemainingDeposit = function() {
  return this.depositAmount - this.depositRefunded;
};

/**
 * Check if tenant is eligible for renewal
 */
tenantSchema.methods.isEligibleForRenewal = function() {
  return this.status === 'active' && this.leaseEndDate && 
         ((this.leaseEndDate - Date.now()) / (1000 * 60 * 60 * 24)) <= 30;
};

/**
 * Mark tenant as check-out
 */
tenantSchema.methods.markAsCheckout = function(checkoutDate = new Date()) {
  this.status = 'left';
  this.checkOutDate = checkoutDate;
  return this.save();
};

/**
 * Submit complaint
 */
tenantSchema.methods.submitComplaint = function(complaintData) {
  this.complaints.push({
    ...complaintData,
    createdAt: new Date(),
  });
  return this.save();
};

/**
 * Get active complaints
 */
tenantSchema.methods.getActiveComplaints = function() {
  return this.complaints.filter(c => c.status !== 'resolved');
};

/**
 * Statics - Get tenants by property
 */
tenantSchema.statics.getByProperty = function(propertyId) {
  return this.find({ property: propertyId, status: 'active' });
};

/**
 * Statics - Get expiring leases
 */
tenantSchema.statics.getExpiringLeases = function(daysUntilExpiry = 30) {
  const futureDate = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  return this.find({
    leaseEndDate: { $lte: futureDate },
    status: 'active',
  });
};

export const Tenant = mongoose.model("Tenant", tenantSchema);