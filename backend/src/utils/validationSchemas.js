import Joi from 'joi';

/**
 * Advanced Validation Schemas for Backend API Requests
 */

// Auth Schemas
export const authSchemas = {
  register: Joi.object({
    name: Joi.string().required().min(2).max(100).trim(),
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string()
      .required()
      .min(6)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .message('Password must contain uppercase, lowercase, and numbers'),
    phone: Joi.string().optional().pattern(/^[6-9]\d{9}$/),
  }),

  login: Joi.object({
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().required(),
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required().lowercase(),
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .required()
      .min(6)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  }),
};

// Tenant Schemas
export const tenantSchemas = {
  create: Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required().lowercase(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/),
    property: Joi.string().required(),
    room: Joi.string().required(),
    monthlyRent: Joi.number().required().positive(),
    depositAmount: Joi.number().positive(),
    emergencyContact: Joi.string(),
    documents: Joi.array().items(Joi.string()),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email().lowercase(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/),
    monthlyRent: Joi.number().positive(),
    depositAmount: Joi.number().positive(),
    emergencyContact: Joi.string(),
    status: Joi.string().valid('active', 'inactive', 'terminated'),
  }),

  submitComplaint: Joi.object({
    title: Joi.string().required().min(5).max(100),
    description: Joi.string().required().min(10).max(500),
    category: Joi.string().valid('maintenance', 'noise', 'amenities', 'other'),
    attachments: Joi.array().items(Joi.string()),
  }),
};

// Invoice Schemas
export const invoiceSchemas = {
  create: Joi.object({
    tenant: Joi.string().required(),
    property: Joi.string().required(),
    amount: Joi.number().required().positive(),
    dueDate: Joi.date().required().min('now'),
    billingMonth: Joi.string().pattern(/^\d{4}-\d{2}$/),
    description: Joi.string(),
  }),

  update: Joi.object({
    amount: Joi.number().positive(),
    dueDate: Joi.date(),
    status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled'),
  }),

  applyLateFee: Joi.object({
    lateFeeAmount: Joi.number().required().positive(),
    reason: Joi.string(),
  }),
};

// Payment Schemas
export const paymentSchemas = {
  create: Joi.object({
    invoice: Joi.string().required(),
    amount: Joi.number().required().positive(),
    method: Joi.string().valid('razorpay', 'bank_transfer', 'card', 'cash').required(),
    reference: Joi.string(),
    notes: Joi.string(),
  }),

  refund: Joi.object({
    payment: Joi.string().required(),
    amount: Joi.number().positive(),
    reason: Joi.string().required(),
  }),
};

// Property Schemas
export const propertySchemas = {
  create: Joi.object({
    name: Joi.string().required().min(3).max(100),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string().pattern(/^\d{6}$/),
    }),
    totalRooms: Joi.number().required().positive(),
    totalBeds: Joi.number().required().positive(),
    manager: Joi.string(),
    amenities: Joi.array().items(Joi.string()),
    monthlyRate: Joi.number().positive(),
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(100),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      pincode: Joi.string().pattern(/^\d{6}$/),
    }),
    manager: Joi.string(),
    amenities: Joi.array().items(Joi.string()),
    monthlyRate: Joi.number().positive(),
    isActive: Joi.boolean(),
  }),
};

// Query Parameter Schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().default(1).min(1),
    limit: Joi.number().default(10).min(1).max(100),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  dateFilter: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),

  invoiceFilter: Joi.object({
    status: Joi.string().valid('pending', 'paid', 'overdue', 'cancelled'),
    min: Joi.number(),
    max: Joi.number(),
    tenant: Joi.string(),
    property: Joi.string(),
  }),
};
