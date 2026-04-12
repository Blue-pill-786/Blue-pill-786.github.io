import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const invoiceSchema = new Schema(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },

    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // ✅ NEW: track billing month
    billingMonth: {
      type: String, // "2026-04"
      required: true,
      trim: true
    },

    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },

    lateFee: {
      type: Number,
      default: 0,
      min: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    dueDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'cancelled'],
      default: 'pending'
    },

    paidAt: {
      type: Date,
      default: null
    },

    canceledAt: {
      type: Date,
      default: null
    },

    cancelReason: {
      type: String,
      trim: true,
      default: null
    },

    paymentMethod: {
      type: String,
      trim: true,
      enum: ['stripe', 'razorpay', 'cash', 'bank_transfer', 'other'],
      default: null
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

// ✅ Fast queries
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ property: 1 });
invoiceSchema.index({ billingMonth: 1 });
invoiceSchema.index({ tenant: 1, billingMonth: 1 }, { unique: true });

/* ================= CONSISTENCY ================= */

invoiceSchema.pre('save', function (next) {

  // ✅ Ensure paidAt and canceledAt stay consistent with status
  if (this.status === 'paid') {
    if (!this.paidAt) {
      this.paidAt = new Date();
    }
    this.canceledAt = null;
    this.cancelReason = null;
  } else if (this.status === 'cancelled') {
    if (!this.canceledAt) {
      this.canceledAt = new Date();
    }
    this.paidAt = null;
  } else {
    this.paidAt = null;
    this.canceledAt = null;
    this.cancelReason = null;
  }

  next();
});

export const Invoice = model('Invoice', invoiceSchema);