/**
 * Admin Tenant Management Routes
 * Handles tenant CRUD, lease management, and expiry tracking
 */

import express from 'express';
import { body } from 'express-validator';
import {
  getAllTenants,
  createTenant,
  getTenant,
  updateTenant,
  deactivateTenant,
  getTenantStats,
  getExpiringLeases,
  getTenantComplaints,
  checkRenewalEligibility
} from '../../controllers/tenantController.js';
import { protect, authorize } from '../../middleware/auth.js';
import ResponseFormatter from '../../utils/responseFormatter.js';

const router = express.Router();

/**
 * All admin tenant routes require authentication and staff+ role
 */
router.use(protect, authorize('admin', 'manager', 'staff'));

/* ================= TENANT MANAGEMENT ================= */

/**
 * Get all tenants (paginated)
 * GET /api/admin/tenants?page=1&limit=20&property=<id>&status=active
 */
router.get('/', getAllTenants);

/**
 * Get tenant statistics dashboard
 * GET /api/admin/tenants/stats
 */
router.get('/stats', getTenantStats);

/**
 * Create new tenant
 * POST /api/admin/tenants
 * Body: { userId, propertyId, bedId, monthlyRent, leaseStartDate, leaseEndDate }
 */
router.post(
  '/',
  [
    body('userId').notEmpty().isMongoId(),
    body('propertyId').notEmpty().isMongoId(),
    body('bedId').notEmpty().isMongoId(),
    body('monthlyRent').isFloat({ min: 0 }),
    body('leaseStartDate').isISO8601(),
    body('leaseEndDate').isISO8601(),
    body('deposit').optional().isFloat({ min: 0 })
  ],
  createTenant
);

/**
 * Get specific tenant
 * GET /api/admin/tenants/:tenantId
 */
router.get('/:tenantId', getTenant);

/**
 * Update tenant details
 * PUT /api/admin/tenants/:tenantId
 * Body: { monthlyRent, leaseEndDate, status }
 */
router.put(
  '/:tenantId',
  [
    body('monthlyRent').optional().isFloat({ min: 0 }),
    body('leaseEndDate').optional().isISO8601(),
    body('status').optional().isIn(['active', 'notice', 'checkout', 'inactive'])
  ],
  updateTenant
);

/**
 * Deactivate/Checkout tenant
 * DELETE /api/admin/tenants/:tenantId or PATCH with status=inactive
 */
router.delete('/:tenantId', deactivateTenant);

/* ================= LEASE MANAGEMENT ================= */

/**
 * Get expiring leases (within X days)
 * GET /api/admin/tenants/expiring?days=30
 */
router.get('/expiring/leases', getExpiringLeases);

/**
 * Check if tenant is eligible for renewal
 * GET /api/admin/tenants/:tenantId/renewal/check
 */
router.get('/:tenantId/renewal/check', checkRenewalEligibility);

/* ================= COMPLAINTS & MAINTENANCE ================= */

/**
 * Get all complaints for tenant
 * GET /api/admin/tenants/:tenantId/complaints
 */
router.get('/:tenantId/complaints', getTenantComplaints);

/**
 * Get complaints by status
 * GET /api/admin/tenants/complaints?status=open&priority=high
 */
router.get('/complaints/filter', async (req, res, next) => {
  try {
    // Implementation in controller
    getTenantComplaints(req, res, next);
  } catch (err) {
    next(err);
  }
});

/**
 * Bulk operations endpoint
 */
router.post(
  '/bulk/send-notice',
  authorize('admin', 'owner'),
  [body('tenantIds').isArray()],
  async (req, res, next) => {
    try {
      // Send lease expiry notices to multiple tenants
      // Implementation in controller
    } catch (err) {
      next(err);
    }
  }
);

export default router;