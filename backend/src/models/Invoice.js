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