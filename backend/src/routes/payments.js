/**
 * Payment & Invoice Routes
 * Handles invoice management, payments, and payment tracking
 */

import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import * as paymentController from '../controllers/paymentController.js';
import ResponseFormatter from '../utils/responseFormatter.js';

const router = express.Router();

/* ================= PROTECTED ROUTES ================= */

router.use(protect);

/* ================= TENANT PAYMENT ROUTES ================= */

/**
 * Get all payments for current tenant
 * GET /api/payments/my?page=1&limit=10
 */
router.get(
  '/my',
  authorize('tenant'),
  paymentController.getMyPayments
);

/**
 * Get payment statistics for tenant
 * GET /api/payments/my/stats
 */
router.get(
  '/my/stats',
  authorize('tenant'),
  paymentController.getPaymentStats
);

/* ================= ADMIN PAYMENT ROUTES ================= */

/**
 * Get all payments in organization (admin only)
 * GET /api/payments/all?month=2024-01&status=paid
 */
router.get(
  '/all',
  authorize('admin', 'manager', 'staff'),
  paymentController.getAllPayments
);

/**
 * Get payment statistics dashboard
 * GET /api/payments/stats
 */
router.get(
  '/stats',
  authorize('admin', 'manager', 'staff'),
  paymentController.getPaymentStats
);

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
router.get('/:id', paymentController.getInvoice);

/* ================= PAYMENT PROCESSING ================= */

/**
 * Record payment for invoice
 * POST /api/payments/pay
 * Body: { invoiceId, method, amount, reference }
 */
router.post(
  '/pay',
  [
    body('invoiceId').notEmpty().isMongoId(),
    body('method').isIn(['stripe', 'razorpay', 'cash', 'bank_transfer']),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('reference').optional().isString()
  ],
  paymentController.markAsPaid
);

/* ================= ADMIN INVOICE MANAGEMENT ================= */

/**
 * Create invoice for tenant
 * POST /api/payments/admin (frontend alias)
 * POST /api/payments/admin/create (internal)
 * Body: { tenantId, billingMonth, baseAmount, charges }
 */
router.post(
  '/admin',
  authorize('admin', 'manager', 'staff'),
  [
    body('tenantId').notEmpty().isMongoId(),
    body('billingMonth').notEmpty().matches(/^\d{4}-\d{2}$/),
    body('baseAmount').isFloat({ min: 0 }),
    body('charges').optional().isArray()
  ],
  paymentController.createInvoice
);

/**
 * Create invoice for tenant (legacy route)
 * POST /api/payments/admin/create
 * Body: { tenantId, billingMonth, baseAmount, charges }
 */
router.post(
  '/admin/create',
  authorize('admin', 'manager', 'staff'),
  [
    body('tenantId').notEmpty().isMongoId(),
    body('billingMonth').notEmpty().matches(/^\d{4}-\d{2}$/),
    body('baseAmount').isFloat({ min: 0 }),
    body('charges').optional().isArray()
  ],
  paymentController.createInvoice
);

/**
 * Update/Adjust invoice
 * PATCH /api/payments/admin/:id
 * Body: { status, notes, adjustments }
 */
router.patch(
  '/admin/:id',
  authorize('admin', 'manager', 'staff'),
  [
    body('status').optional().isIn(['pending', 'paid', 'overdue', 'cancelled']),
    body('notes').optional().isString()
  ],
  paymentController.adjustInvoice
);

/**
 * Cancel invoice
 * DELETE /api/payments/admin/:id
 */
router.delete(
  '/admin/:id',
  authorize('admin', 'manager', 'staff'),
  paymentController.cancelInvoice
);

/**
 * Get overdue invoices report
 * GET /api/payments/admin/overdue
 */
router.get(
  '/admin/overdue',
  authorize('admin', 'manager', 'staff'),
  paymentController.getOverdueInvoices
);

/**
 * Get payment collection report
 * GET /api/payments/admin/collection?month=2024-01
 */
router.get(
  '/admin/collection',
  authorize('admin', 'manager', 'staff'),
  paymentController.getCollectionReport
);

/* ================= WEBHOOK ROUTES ================= */

/**
 * Handle payment provider webhooks
 * POST /api/payments/webhook/:provider
 * Supported: stripe, razorpay
 */
router.post(
  '/webhook/:provider',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

export default router;
