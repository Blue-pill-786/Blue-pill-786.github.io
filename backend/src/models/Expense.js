import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization'
    },

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

// ✅ Organization-scoped indexes
expenseSchema.index({ organization: 1, property: 1 });
expenseSchema.index({ organization: 1, month: 1 });
expenseSchema.index({ organization: 1 });

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

/* ================= METHODS ================= */

/**
 * Get category display name
 */
expenseSchema.methods.getCategoryName = function() {
  const categoryNames = {
    maintenance: 'Maintenance & Repairs',
    electricity: 'Electricity Bills',
    water: 'Water Bills',
    internet: 'Internet & WiFi',
    salary: 'Staff Salary',
    misc: 'Miscellaneous',
  };
  return categoryNames[this.category] || this.category;
};

/**
 * Statics - Get expenses for period
 */
expenseSchema.statics.getForPeriod = function(organizationId, propertyId, month) {
  return this.find({
    organization: organizationId,
    property: propertyId,
    month,
  });
};

/**
 * Statics - Get total expenses for month
 */
expenseSchema.statics.getTotalForMonth = async function(organizationId, month) {
  const result = await this.aggregate([
    { $match: { organization: organizationId, month } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

/**
 * Statics - Get by category
 */
expenseSchema.statics.getByCategory = function(organizationId, category) {
  return this.find({
    organization: organizationId,
    category,
  });
};

export const Expense = mongoose.model('Expense', expenseSchema);