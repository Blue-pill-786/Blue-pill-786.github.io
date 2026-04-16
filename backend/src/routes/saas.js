/**
 * SaaS Organization & Billing Routes
 * Handles multi-tenant setup, subscriptions, billing, and usage tracking
 */

import express from 'express';
import { body, query } from 'express-validator';
import {
  signupOrganization,
  getOrganization,
  updateOrganization,
  getPricing,
  upgradeTier,
  downgradeTier,
  getUsage,
  getBillingHistory,
  cancelSubscription,
  getSubscriptionStatus,
  applyCoupon,
  renewSubscription,
  getAPIUsage
} from '../controllers/saasController.prod.js';
import { protect, authorize } from '../middleware/auth.js';
import ResponseFormatter from '../utils/responseFormatter.js';

const router = express.Router();

/* ================= PUBLIC ROUTES ================= */

/**
 * Sign up new organization
 * POST /api/saas/signup
 * Body: { organizationName, email, password, tier }
 */
router.post(
  '/signup',
  [
    body('organizationName').notEmpty().trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('tier').optional().isIn(['free', 'startup', 'professional', 'enterprise'])
  ],
  signupOrganization
);

/**
 * Get pricing information (public)
 * GET /api/saas/pricing
 */
router.get('/pricing', getPricing);

/* ================= PROTECTED ROUTES ================= */

router.use(protect);

/* ================= ORGANIZATION MANAGEMENT ================= */

/**
 * Get organization details
 * GET /api/saas/details
 */
router.get('/details', getOrganization);

/**
 * Update organization settings
 * PUT /api/saas/update
 * Body: { organizationName, email, phone, address }
 */
router.put(
  '/update',
  authorize('admin', 'owner'),
  [
    body('organizationName').optional().trim(),
    body('email').optional().isEmail(),
    body('phone').optional().isMobilePhone()
  ],
  updateOrganization
);

/* ================= SUBSCRIPTION MANAGEMENT ================= */

/**
 * Get subscription status and details
 * GET /api/saas/subscription/status
 */
router.get(
  '/subscription/status',
  getSubscriptionStatus
);

/**
 * Upgrade subscription tier
 * POST /api/saas/upgrade
 * Body: { targetTier, billingCycle }
 */
router.post(
  '/upgrade',
  authorize('admin', 'owner'),
  [
    body('targetTier').isIn(['startup', 'professional', 'enterprise']),
    body('billingCycle').optional().isIn(['monthly', 'yearly'])
  ],
  upgradeTier
);

/**
 * Downgrade subscription tier
 * POST /api/saas/downgrade
 * Body: { targetTier, effectiveDate }
 */
router.post(
  '/downgrade',
  authorize('admin', 'owner'),
  [
    body('targetTier').isIn(['free', 'startup', 'professional']),
    body('effectiveDate').optional().isISO8601()
  ],
  downgradeTier
);

/**
 * Renew subscription
 * POST /api/saas/renew
 * Body: { billingCycle }
 */
router.post(
  '/renew',
  authorize('admin', 'owner'),
  [body('billingCycle').optional().isIn(['monthly', 'yearly'])],
  renewSubscription
);

/**
 * Cancel subscription
 * POST /api/saas/cancel
 * Body: { reason, feedbackNote }
 */
router.post(
  '/cancel',
  authorize('admin', 'owner'),
  [
    body('reason').optional().isString(),
    body('feedbackNote').optional().isString()
  ],
  cancelSubscription
);

/**
 * Apply coupon/promo code
 * POST /api/saas/coupon
 * Body: { couponCode }
 */
router.post(
  '/coupon',
  authorize('admin', 'owner'),
  [body('couponCode').notEmpty().trim()],
  applyCoupon
);

/* ================= USAGE & BILLING ================= */

/**
 * Get current usage statistics
 * GET /api/saas/usage?month=2024-01
 */
router.get(
  '/usage',
  [query('month').optional().matches(/^\d{4}-\d{2}$/)],
  getUsage
);

/**
 * Get API usage metrics
 * GET /api/saas/api-usage?period=month|day
 */
router.get(
  '/api-usage',
  [query('period').optional().isIn(['hour', 'day', 'month', 'year'])],
  getAPIUsage
);

/**
 * Get billing history (invoices)
 * GET /api/saas/billing-history?page=1&limit=20
 */
router.get(
  '/billing-history',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  getBillingHistory
);

/* ================= ADMIN-ONLY ROUTES ================= */

/**
 * Get all organization invoices (admin view)
 * GET /api/saas/admin/invoices
 */
router.get(
  '/admin/invoices',
  authorize('admin', 'owner'),
  async (req, res, next) => {
    try {
      // Implementation in controller
      getBillingHistory(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
