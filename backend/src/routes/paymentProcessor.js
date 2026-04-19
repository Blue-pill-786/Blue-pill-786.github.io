/**
 * Payment Processor Routes - Stripe & Razorpay Integration
 */

import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import * as paymentProcessorController from '../controllers/paymentProcessorController.js';

const router = express.Router();

/* ================= STRIPE ROUTES ================= */

// Create Stripe payment intent
router.post(
  '/stripe/intent',
  protect,
  [
    body('invoiceId').notEmpty().withMessage('Invoice ID required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  ],
  paymentProcessorController.createPaymentIntent
);

// Get payment status
router.get(
  '/stripe/status/:paymentIntentId',
  protect,
  paymentProcessorController.getPaymentStatus
);

/* ================= RAZORPAY ROUTES ================= */

// Create Razorpay payment order
router.post(
  '/razorpay/order',
  protect,
  [
    body('invoiceId').notEmpty().withMessage('Invoice ID required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  ],
  paymentProcessorController.createRazorpayOrder
);

// Verify Razorpay payment signature
router.post(
  '/razorpay/verify',
  protect,
  [
    body('orderId').notEmpty(),
    body('paymentId').notEmpty(),
    body('signature').notEmpty(),
  ],
  paymentProcessorController.verifyRazorpaySignature
);

/* ================= WEBHOOK ROUTES ================= */

// Stripe webhook (no auth required)
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  paymentProcessorController.handleStripeWebhook
);

// Razorpay webhook (no auth required)
router.post(
  '/webhook/razorpay',
  paymentProcessorController.handleStripeWebhook // Reuse same handler pattern
);

/* ================= PAYMENT MANAGEMENT ================= */

// List organization payments
router.get(
  '/list',
  protect,
  paymentProcessorController.getOrganizationPayments
);

// Refund payment
router.post(
  '/refund',
  protect,
  [
    body('invoiceId').notEmpty().withMessage('Invoice ID required'),
    body('reason').optional().isString(),
  ],
  paymentProcessorController.refundPayment
);

export default router;
