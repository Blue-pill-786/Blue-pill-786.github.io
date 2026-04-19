import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    industry: {
      type: String,
      enum: ['real_estate', 'hospitality', 'education', 'healthcare', 'other'],
    },

    // Owner Information
    owner: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
      email: String,
    },

    // Subscription & Tier Management
    tier: {
      type: String,
      enum: ['trial', 'starter', 'professional', 'enterprise'],
      default: 'trial',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
    },

    // Trial Period
    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },

    // Subscription Dates
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    downgradedAt: Date,
    cancelledAt: Date,

    // Limits
    limits: {
      properties: { type: Number, default: 1 },
      beds: { type: Number, default: 50 },
      staff: { type: Number, default: 2 },
      apiCalls: { type: Number, default: 10000 },
      storageGB: { type: Number, default: 5 },
    },

    // Features
    features: {
      multiProperty: { type: Boolean, default: false },
      advancedReports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      webhooks: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      emailNotifications: { type: Boolean, default: true },
      support: {
        type: String,
        enum: ['community', 'email', 'priority', 'dedicated'],
        default: 'community',
      },
    },

    // Billing
    billingEmail: {
      type: String,
      lowercase: true,
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    razorpaySubscriptionId: String,

    paymentMethods: [
      {
        methodId: String,
        type: { type: String, enum: ['card', 'upi', 'bank', 'wallet'] },
        last4: String,
        expiryDate: String,
        isDefault: Boolean,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    defaultPaymentMethodId: String,

    billingHistory: [
      {
        invoiceId: String,
        amount: Number,
        currency: { type: String, default: 'INR' },
        date: { type: Date, default: Date.now },
        dueDate: Date,
        paidDate: Date,
        status: {
          type: String,
          enum: ['pending', 'paid', 'failed', 'refunded'],
          default: 'pending',
        },
        tier: String,
        items: [
          {
            description: String,
            quantity: Number,
            unitPrice: Number,
            total: Number,
          },
        ],
        taxAmount: { type: Number, default: 0 },
        totalAmount: Number,
        notes: String,
      },
    ],

    // Usage
    apiCallsThisMonth: { type: Number, default: 0 },
    storageBytesUsed: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },

    usage: {
      properties: { type: Number, default: 0 },
      beds: { type: Number, default: 0 },
      tenants: { type: Number, default: 0 },
      invoices: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
    },

    // Branding
    branding: {
      logoUrl: String,
      primaryColor: { type: String, default: '#3B82F6' },
      companyName: String,
      customDomain: String,
      isVerified: { type: Boolean, default: false },
    },

    // Integrations
    webhookUrl: String,
    webhookSecret: String,
    integrations: [
      {
        type: String,
        name: String,
        apiKey: String,
        isActive: Boolean,
      },
    ],

    // Team
    teamMembers: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        email: String,
        role: {
          type: String,
          enum: ['owner', 'admin', 'manager', 'staff'],
          default: 'staff',
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    downgradeReason: String,
    cancellationReason: String,
    notes: String,

    // Security
    twoFactorEnabled: { type: Boolean, default: false },
    ipWhitelist: [String],

    // Audit
    lastPaymentDate: Date,
    nextBillingDate: Date,
    deletedAt: Date,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ================= VIRTUAL ================= */

organizationSchema.virtual('isTrialExpired').get(function () {
  if (!this.trialEndDate) return false;
  return new Date() > this.trialEndDate;
});

/* ================= CONFIG ================= */

organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

/* ================= INDEXES ================= */

organizationSchema.index({ email: 1 }, { unique: true });
organizationSchema.index({ stripeCustomerId: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ tier: 1 });
organizationSchema.index({ createdAt: -1 });
organizationSchema.index({ owner: 1 });
// Composite indexes for common queries
organizationSchema.index({ status: 1, createdAt: -1 });
organizationSchema.index({ tier: 1, status: 1 });
organizationSchema.index({ isDeleted: 1, status: 1 });
organizationSchema.index({ 'owner.userId': 1 });

/* ================= METHODS ================= */

organizationSchema.methods.canCreateProperty = function () {
  return true;
};

organizationSchema.methods.hasFeature = function (feature) {
  return this.features[feature] || false;
};

organizationSchema.methods.addBillingRecord = function (invoice) {
  this.billingHistory.push(invoice);
  return this.save();
};

/* ================= STATICS ================= */

organizationSchema.statics.findByStripeId = function (stripeCustomerId) {
  return this.findOne({ stripeCustomerId });
};

export const Organization = mongoose.model('Organization', organizationSchema);