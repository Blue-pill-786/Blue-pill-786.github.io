import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true
    },

    // Billing cycle
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },

    // Tier at time of subscription
    tier: {
      type: String,
      enum: ['starter', 'professional', 'enterprise', 'trial'],
      required: true
    },

    // Payment status
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'unpaid'],
      default: 'active'
    },

    // Pricing
    pricing: {
      monthlyAmount: { type: Number, required: true },
      annualAmount: { type: Number },
      currency: { type: String, default: 'USD' }
    },

    // Current period
    currentPeriodStart: {
      type: Date,
      required: true,
      default: () => new Date()
    },

    currentPeriodEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },

    // Auto-renew settings
    autoRenew: {
      type: Boolean,
      default: true
    },

    // Payment method
    paymentMethod: {
      type: String, // Stripe payment method ID
      required: true
    },

    // Invoice tracking
    latestInvoiceId: String,
    upcomingInvoiceId: String,

    // Trial info
    trialPeriod: {
      isTrialActive: { type: Boolean, default: true },
      trialStartDate: Date,
      trialEndDate: Date,
      daysRemaining: Number
    },

    // Discounts/Promotions
    couponCode: String,
    discountPercentage: { type: Number, default: 0 },
    discountEndDate: Date,

    // Cancellation info
    cancelledAt: Date,
    cancellationReason: String,
    cancellationFeedback: String,

    // Usage tracking for current period
    usage: {
      apiCallsUsed: { type: Number, default: 0 },
      apiCallsLimit: { type: Number, default: 10000 }
    },

    // Metadata
    notes: String,
    tags: [String]
  },
  { timestamps: true }
);

// Index for performance
subscriptionSchema.index({ organization: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

/* ================= METHODS ================= */

/**
 * Check if subscription is active
 */
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.currentPeriodEnd;
};

/**
 * Check if trial is active
 */
subscriptionSchema.methods.isTrialActive = function() {
  return this.trialPeriod.isTrialActive && 
         new Date() < this.trialPeriod.trialEndDate;
};

/**
 * Get days remaining in trial
 */
subscriptionSchema.methods.getDaysRemainingInTrial = function() {
  if (!this.isTrialActive()) return 0;
  const diff = this.trialPeriod.trialEndDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Get days until renewal
 */
subscriptionSchema.methods.getDaysUntilRenewal = function() {
  const diff = this.currentPeriodEnd - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check if API limit exceeded
 */
subscriptionSchema.methods.hasExceededAPILimit = function() {
  return this.usage.apiCallsUsed >= this.usage.apiCallsLimit;
};

/**
 * Get API usage percentage
 */
subscriptionSchema.methods.getAPIUsagePercentage = function() {
  return Math.round((this.usage.apiCallsUsed / this.usage.apiCallsLimit) * 100);
};

/**
 * Apply coupon code
 */
subscriptionSchema.methods.applyCoupon = function(couponCode, discountPercentage, endDate) {
  this.couponCode = couponCode;
  this.discountPercentage = discountPercentage;
  this.discountEndDate = endDate;
  return this.save();
};

/**
 * Cancel subscription
 */
subscriptionSchema.methods.cancel = function(reason, feedback = '') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancellationFeedback = feedback;
  return this.save();
};

/**
 * Renew subscription
 */
subscriptionSchema.methods.renew = function() {
  const newStart = this.currentPeriodEnd;
  const newEnd = new Date(newStart);
  
  if (this.billingCycle === 'monthly') {
    newEnd.setMonth(newEnd.getMonth() + 1);
  } else if (this.billingCycle === 'annual') {
    newEnd.setFullYear(newEnd.getFullYear() + 1);
  }
  
  this.currentPeriodStart = newStart;
  this.currentPeriodEnd = newEnd;
  this.status = 'active';
  this.usage.apiCallsUsed = 0; // Reset usage
  
  return this.save();
};

/**
 * Record API call usage
 */
subscriptionSchema.methods.recordAPICall = function(count = 1) {
  this.usage.apiCallsUsed += count;
  return this.save();
};

/**
 * Statics - Get active subscriptions
 */
subscriptionSchema.statics.getActive = function() {
  return this.find({
    status: 'active',
    currentPeriodEnd: { $gt: new Date() },
  });
};

/**
 * Statics - Get expiring soon
 */
subscriptionSchema.statics.getExpiringSoon = function(daysUntilExpiry = 7) {
  const expiryDate = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    currentPeriodEnd: { $lte: expiryDate, $gt: new Date() },
  });
};

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
