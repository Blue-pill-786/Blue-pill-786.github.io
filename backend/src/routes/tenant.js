/**
 * Tenant Routes
 * Handles tenant-specific operations: dashboard, invoices, complaints, profile
 */

import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDashboard,
  getInvoices,
  getInvoiceDetail,
  payInvoice,
  submitComplaint,
  getProfile,
  updateProfile
} from '../controllers/tenantController.js';
import ResponseFormatter from '../utils/responseFormatter.js';

const router = express.Router();

/**
 * All tenant routes require authentication and tenant role
 */
router.use(protect, authorize('tenant'));

/* ================= DASHBOARD ================= */

/**
 * Get tenant dashboard with quick stats
 * GET /api/tenant/dashboard
 */
router.get('/dashboard', getDashboard);

/**
 * Get tenant profile info
 * GET /api/tenant/profile
 */
router.get('/profile', getProfile);

/**
 * Update tenant profile
 * PUT /api/tenant/profile
 * Body: { emergencyContactName, emergencyContactPhone, alternatePhone, notes }
 */
router.put(
  '/profile',
  [
    body('emergencyContactName').optional().trim().isLength({ min: 2 }),
    body('emergencyContactPhone').optional().trim().isLength({ min: 5 }),
    body('alternatePhone').optional().trim().isLength({ min: 5 }),
    body('notes').optional().isString()
  ],
  updateProfile
);

/* ================= INVOICES & PAYMENTS ================= */

/**
 * Get all invoices for tenant (paginated)
 * GET /api/tenant/invoices?page=1&limit=10
 */
router.get('/invoices', getInvoices);

/**
 * Get specific invoice details
 * GET /api/tenant/invoices/:invoiceId
 */
router.get('/invoices/:invoiceId', getInvoiceDetail);

/**
 * Pay invoice
 * POST /api/tenant/invoices/:invoiceId/pay
 * Body: { method, amount }
 */
router.post(
  '/invoices/:invoiceId/pay',
  [
    body('method').isIn(['stripe', 'razorpay', 'cash', 'bank_transfer']),
    body('amount').optional().isFloat({ min: 0 })
  ],
  payInvoice
);

/* ================= COMPLAINTS & MAINTENANCE ================= */

/**
 * Submit maintenance complaint
 * POST /api/tenant/complaints
 * Body: { title, description, category, priority }
 */
router.post(
  '/complaints',
  [
    body('title')
      .notEmpty()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be 5-100 characters'),
    body('description')
      .notEmpty()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('category')
      .optional()
      .isIn(['electrical', 'plumbing', 'appliance', 'furniture', 'cleaning', 'other']),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
  ],
  submitComplaint
);

export default router;
