import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    expenseDate: { type: Date, required: true }
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
