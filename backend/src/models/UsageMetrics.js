import mongoose from 'mongoose';

const usageMetricsSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },

    // Date of the metrics
    date: {
      type: Date,
      required: true,
      default: () => new Date()
    },

    // Properties count
    propertiesCount: {
      type: Number,
      default: 0
    },

    // Tenants count
    tenantsCount: {
      type: Number,
      default: 0
    },

    // Total beds (sum of all bed counts across properties)
    totalBeds: {
      type: Number,
      default: 0
    },

    // Occupied beds
    occupiedBeds: {
      type: Number,
      default: 0
    },

    // Invoices generated
    invoicesGenerated: {
      type: Number,
      default: 0
    },

    // Invoices paid
    invoicesPaid: {
      type: Number,
      default: 0
    },

    // Invoices overdue
    invoicesOverdue: {
      type: Number,
      default: 0
    },

    // Payments processed
    paymentsProcessed: {
      type: Number,
      default: 0
    },

    // Total revenue
    totalRevenue: {
      type: Number,
      default: 0
    },

    // API calls made
    apiCallsMade: {
      type: Number,
      default: 0
    },

    // Active staff members
    activeStaff: {
      type: Number,
      default: 0
    },

    // Support tickets
    supportTickets: {
      type: Number,
      default: 0
    },

    // Average payment time (days)
    avgPaymentTime: {
      type: Number,
      default: 0
    },

    // Occupancy rate percentage
    occupancyRate: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for querying metrics
usageMetricsSchema.index({ organization: 1, date: -1 });

/* ================= METHODS ================= */

/**
 * Calculate collection rate
 */
usageMetricsSchema.methods.getCollectionRate = function() {
  if (this.invoicesGenerated === 0) return 0;
  return Math.round((this.invoicesPaid / this.invoicesGenerated) * 100);
};

/**
 * Get revenue per property
 */
usageMetricsSchema.methods.getRevenuePerProperty = function() {
  if (this.propertiesCount === 0) return 0;
  return Math.round(this.totalRevenue / this.propertiesCount);
};

/**
 * Get revenue per tenant
 */
usageMetricsSchema.methods.getRevenuePerTenant = function() {
  if (this.tenantsCount === 0) return 0;
  return Math.round(this.totalRevenue / this.tenantsCount);
};

/**
 * Check if metrics are healthy
 */
usageMetricsSchema.methods.isHealthy = function() {
  return this.occupancyRate >= 70 && this.getCollectionRate() >= 90;
};

/**
 * Get metrics trend (comparing with previous metrics)
 */
usageMetricsSchema.methods.getTrend = async function() {
  const previousMetrics = await this.constructor.findOne({
    organization: this.organization,
    date: { $lt: this.date },
  }).sort({ date: -1 });

  if (!previousMetrics) return null;

  return {
    occupancyTrend: this.occupancyRate - previousMetrics.occupancyRate,
    revenueTrend: this.totalRevenue - previousMetrics.totalRevenue,
    collectionRateTrend: this.getCollectionRate() - previousMetrics.getCollectionRate(),
    tenantGrowth: this.tenantsCount - previousMetrics.tenantsCount,
  };
};

/**
 * Statics - Get latest metrics for organization
 */
usageMetricsSchema.statics.getLatest = function(organizationId) {
  return this.findOne({ organization: organizationId }).sort({ date: -1 });
};

/**
 * Statics - Get metrics for date range
 */
usageMetricsSchema.statics.getForDateRange = function(organizationId, startDate, endDate) {
  return this.find({
    organization: organizationId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: -1 });
};

/**
 * Statics - Get monthly metrics
 */
usageMetricsSchema.statics.getMonthlyMetrics = function(organizationId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.getForDateRange(organizationId, startDate, endDate);
};

export const UsageMetrics = mongoose.model('UsageMetrics', usageMetricsSchema);
