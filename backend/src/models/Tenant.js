import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const tenantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    floorName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    bedLabel: { type: String, required: true },
    monthlyRent: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, default: 0 },
    joiningDate: { type: Date, default: Date.now },
    dueDayOfMonth: { type: Number, min: 1, max: 28, default: 5 },
    lateFeePerDay: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'vacated'], default: 'active' },
    complaints: { type: [complaintSchema], default: [] }
  },
  { timestamps: true }
);

export const Tenant = mongoose.model('Tenant', tenantSchema);
