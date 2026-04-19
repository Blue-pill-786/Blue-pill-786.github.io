import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    tax: {
      type: Number,
      default: 0,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    finalAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },

    dueDate: {
      type: Date,
    },

    notes: String,
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

invoiceSchema.index({ tenant: 1 });
invoiceSchema.index({ property: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
// Composite indexes for common queries
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ property: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 }); // For overdue invoices query
invoiceSchema.index({ createdAt: 1, status: 1 });

/* ================= AUTO LOGIC ================= */

invoiceSchema.pre("validate", function (next) {
  // Generate invoice number safely
  if (this.isNew && !this.invoiceNumber) {
    this.invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  // Calculate final amount safely
  const base = Number(this.amount || 0);
  const tax = Number(this.tax || 0);

  this.finalAmount = Number((base + tax).toFixed(2));

  next();
});

export const Invoice = mongoose.model("Invoice", invoiceSchema);