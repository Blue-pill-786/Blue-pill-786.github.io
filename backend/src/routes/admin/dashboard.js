/**
 * Dashboard Routes
 * Handles dashboard views for both admin and tenant
 */

import express from 'express';
import { query } from 'express-validator';

import {
  getAdminDashboard,
  getTenantDashboard,
  getStats,
  getQuickStats,
  getHealthCheckStatus
} from '../../controllers/dashboardController.js';

import { protect, authorize } from '../../middleware/auth.js';
import ResponseFormatter from '../../utils/responseFormatter.js';

// ✅ REQUIRED (for alerts)
import { Tenant } from '../../models/Tenant.js';
import { Invoice } from '../../models/Invoice.js';

const router = express.Router();

/* ================= MIDDLEWARE ================= */

router.use(protect);

/* ================= ADMIN DASHBOARD ================= */

/**
 * GET /api/admin/dashboard
 */
router.get(
  '/',
  authorize('admin', 'owner'),
  getAdminDashboard
);

/**
 * GET /api/admin/dashboard/quick-stats
 */
router.get(
  '/quick-stats',
  authorize('admin', 'manager', 'owner'),
  [query('month').optional().matches(/^\d{4}-\d{2}$/)],
  getQuickStats
);

/**
 * GET /api/admin/dashboard/stats
 */
router.get(
  '/stats',
  authorize('admin', 'manager', 'owner'),
  [query('period').optional().isIn(['month', 'quarter', 'year', 'all'])],
  getStats
);

/**
 * GET /api/admin/dashboard/health
 */
router.get(
  '/health',
  authorize('admin', 'owner'),
  getHealthCheckStatus
);

/* ================= TENANT DASHBOARD ================= */

/**
 * GET /api/admin/dashboard/tenant
 */
router.get(
  '/tenant',
  authorize('tenant'),
  getTenantDashboard
);

/* ================= ALERTS ================= */

/**
 * GET /api/admin/dashboard/alerts
 */
router.get(
  '/alerts',
  authorize('admin', 'manager', 'owner'),
  async (req, res, next) => {
    try {
      const organizationId = req.user.organization;

      const now = new Date();
      const next30Days = new Date();
      next30Days.setDate(now.getDate() + 30);

      // Parallel queries (because we are civilized now)
      const [expiringLeases, overdueInvoices] = await Promise.all([
        Tenant.countDocuments({
          organization: organizationId,
          leaseEndDate: { $gte: now, $lte: next30Days },
          status: 'active'
        }),

        Invoice.countDocuments({
          organization: organizationId,
          status: 'overdue'
        })
      ]);

      return res.json(
        ResponseFormatter.success(
          {
            expiringLeases,
            overdueInvoices
          },
          'Alerts retrieved successfully'
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

export default router;