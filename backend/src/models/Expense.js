import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },

    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'maintenance',
        'electricity',
        'water',
        'internet',
        'salary',
        'misc'
      ]
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    note: {
      type: String,
      trim: true
    },

    expenseDate: {
      type: Date,
      required: true
    },

    // ✅ NEW: for reports
    month: {
      type: String, // "2026-04"
      required: true
    }
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

expenseSchema.index({ property: 1 });
expenseSchema.index({ month: 1 });
expenseSchema.index({ expenseDate: 1 });

/* ================= VALIDATION ================= */

expenseSchema.pre('validate', function (next) {

  // ❌ prevent future expenses
  if (this.expenseDate > new Date()) {
    return next(new Error('Expense date cannot be in the future'));
  }

  // ✅ auto-generate month
  const date = new Date(this.expenseDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  this.month = `${year}-${month}`;

  next();
});

export const Expense = mongoose.model('Expense', expenseSchema);