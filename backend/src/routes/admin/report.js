/**
 * Admin Report Routes
 * Clean, safe, production-ready
 */

import express from 'express';
import { query, validationResult } from 'express-validator';

import {
  getRevenueAnalytics,
  getCollectionReport,
  getPropertyAnalytics,
  getTenantAnalytics,
  getHealthMetrics
} from '../../controllers/reportController.js';

import { protect, authorize } from '../../middleware/auth.js';
import ResponseFormatter from '../../utils/responseFormatter.js';

const router = express.Router();

/* ================= MIDDLEWARE ================= */

router.use(protect, authorize('admin', 'manager', 'owner'));

/* ================= VALIDATION HANDLER ================= */

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ResponseFormatter.error('Validation failed', errors.array())
    );
  }
  next();
};

/* ================= FINANCIAL ================= */

/**
 * GET /api/admin/reports/monthly
 */
router.get(
  '/monthly',
  [query('month').optional().matches(/^\d{4}-\d{2}$/)],
  validate,
  getRevenueAnalytics
);

/**
 * GET /api/admin/reports/revenue
 */
router.get(
  '/revenue',
  [query('year').optional().isInt()],
  validate,
  getRevenueAnalytics
);

/**
 * GET /api/admin/reports/collection
 */
router.get(
  '/collection',
  [query('month').optional().matches(/^\d{4}-\d{2}$/)],
  validate,
  getCollectionReport
);

/* ================= OPERATIONAL ================= */

/**
 * GET /api/admin/reports/occupancy
 */
router.get('/occupancy', getPropertyAnalytics);

/**
 * GET /api/admin/reports/properties/analytics
 */
router.get('/properties/analytics', getPropertyAnalytics);

/**
 * GET /api/admin/reports/tenants/analytics
 */
router.get('/tenants/analytics', getTenantAnalytics);

/**
 * GET /api/admin/reports/health
 */
router.get('/health', getHealthMetrics);

/* ================= EXPORT ================= */

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;

    return res.json(
      ResponseFormatter.success(
        {
          type,
          data: []
        },
        'Export not implemented yet'
      )
    );
  } catch (err) {
    next(err);
  }
});

export default router;