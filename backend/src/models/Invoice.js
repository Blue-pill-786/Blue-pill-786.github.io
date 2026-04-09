import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    month: { type: String, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    baseAmount: { type: Number, required: true },
    lateFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date },
    paymentMethod: { type: String, enum: ['stripe', 'razorpay', 'cash', 'bank_transfer'] },
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

invoiceSchema.index({ tenant: 1, month: 1 }, { unique: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
