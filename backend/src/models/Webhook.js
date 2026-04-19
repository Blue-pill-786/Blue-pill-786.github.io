import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true
    },

    url: {
      type: String,
      required: true,
      trim: true
    },

    // Events this webhook listens to
    events: [
      {
        type: String,
        enum: [
          'tenant.created',
          'tenant.removed',
          'payment.received',
          'payment.failed',
          'payment.overdue',
          'invoice.generated',
          'invoice.paid',
          'property.created',
          'property.updated'
        ]
      }
    ],

    // Webhook enabled/disabled
    active: {
      type: Boolean,
      default: true
    },

    // Secret for validating webhook signature
    secret: {
      type: String,
      required: true
    },

    // Last delivery info
    lastDelivery: {
      timestamp: Date,
      statusCode: Number,
      response: String,
      success: Boolean
    },

    // Retry settings
    retryPolicy: {
      maxAttempts: { type: Number, default: 5 },
      retryDelayMs: { type: Number, default: 5000 }
    },

    // Stats
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Index
webhookSchema.index({ organization: 1 });

/* ================= METHODS ================= */

/**
 * Record delivery attempt
 */
webhookSchema.methods.recordDelivery = function(statusCode, response, success) {
  this.lastDelivery = {
    timestamp: new Date(),
    statusCode,
    response,
    success,
  };

  this.totalDeliveries += 1;
  if (success) {
    this.successfulDeliveries += 1;
  } else {
    this.failedDeliveries += 1;
  }

  return this.save();
};

/**
 * Get success rate
 */
webhookSchema.methods.getSuccessRate = function() {
  if (this.totalDeliveries === 0) return 0;
  return Math.round((this.successfulDeliveries / this.totalDeliveries) * 100);
};

/**
 * Check if webhook is healthy
 */
webhookSchema.methods.isHealthy = function() {
  if (this.totalDeliveries < 10) return true; // Need minimum data
  return this.getSuccessRate() >= 95;
};

/**
 * Disable webhook
 */
webhookSchema.methods.disable = function(reason = '') {
  this.active = false;
  return this.save();
};

/**
 * Statics - Get active webhooks for organization
 */
webhookSchema.statics.getActiveForOrganization = function(organizationId) {
  return this.find({ organization: organizationId, active: true });
};

/**
 * Statics - Get unhealthy webhooks
 */
webhookSchema.statics.getUnhealthy = function() {
  return this.find({ active: true }).then(webhooks => {
    return webhooks.filter(w => !w.isHealthy());
  });
};

export const Webhook = mongoose.model('Webhook', webhookSchema);
