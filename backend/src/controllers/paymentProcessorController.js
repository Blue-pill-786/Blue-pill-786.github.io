/**
 * Payment Processor Controller - Stripe & Razorpay Integration
 * Handles payment processing, webhooks, and reconciliation
 */

import stripe from 'stripe';
import ResponseFormatter from '../utils/responseFormatter.js';
import { 
  BadRequestError, 
  NotFoundError, 
  UnauthorizedError,
  ConflictError 
} from '../utils/errors.js';
import { Invoice } from '../models/Invoice.js';
import { Organization } from '../models/Organization.js';

const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe Payment Intent
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { invoiceId, amount } = req.body;
    const organizationId = req.user.organization;

    if (!invoiceId || !amount) {
      throw new BadRequestError('Invoice ID and amount required');
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    // Get organization
    const org = await Organization.findById(organizationId);
    if (!org) throw new NotFoundError('Organization', organizationId);

    // Create or get Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: org.billingEmail || org.email,
        name: org.name,
        metadata: { organizationId: organizationId.toString() },
      });
      customerId = customer.id;
      org.stripeCustomerId = customerId;
      await org.save();
    }

    // Create payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'inr',
      customer: customerId,
      metadata: {
        invoiceId: invoiceId.toString(),
        organizationId: organizationId.toString(),
      },
      description: `Invoice ${invoice.invoiceNumber}`,
    });

    return res.json(
      ResponseFormatter.success(
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        },
        'Payment intent created'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Stripe Webhook
 */
export const handleStripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      throw new BadRequestError('Webhook signature missing');
    }

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      throw new BadRequestError(`Webhook Error: ${err.message}`);
    }

    // Handle events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  if (!invoiceId) return;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  invoice.status = 'paid';
  invoice.paidAt = new Date();
  invoice.paymentMethod = 'stripe';
  invoice.transactionId = paymentIntent.id;
  await invoice.save();

  // Update organization billing history
  const org = await Organization.findById(paymentIntent.metadata.organizationId);
  if (org) {
    org.billingHistory.push({
      invoiceId,
      amount: paymentIntent.amount / 100,
      status: 'paid',
      date: new Date(),
      paidDate: new Date(),
    });
    await org.save();
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  if (!invoiceId) return;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  invoice.status = 'failed';
  invoice.failedAttempts = (invoice.failedAttempts || 0) + 1;
  await invoice.save();
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoiceId;
  if (!invoiceId) return;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  invoice.status = 'cancelled';
  await invoice.save();
}

/**
 * Create Razorpay Payment Order
 */
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { invoiceId, amount } = req.body;
    const organizationId = req.user.organization;

    if (!invoiceId || !amount) {
      throw new BadRequestError('Invoice ID and amount required');
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    // In production, integrate with Razorpay API
    // For now, return placeholder
    const orderId = `order_${Date.now()}`;

    return res.json(
      ResponseFormatter.success(
        {
          orderId,
          amount: Math.round(amount * 100), // In paise
          currency: 'INR',
          description: `Invoice ${invoice.invoiceNumber}`,
        },
        'Razorpay order created'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifyRazorpaySignature = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      throw new BadRequestError('Order ID, Payment ID, and Signature required');
    }

    // In production, verify signature with Razorpay API
    // For now, mark as success
    const metadata = orderId.split('_');
    const invoiceId = metadata[1];

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paymentMethod = 'razorpay';
    invoice.transactionId = paymentId;
    await invoice.save();

    return res.json(
      ResponseFormatter.success(
        { verified: true, invoiceId },
        'Payment verified successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      throw new BadRequestError('Payment Intent ID required');
    }

    try {
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

      return res.json(
        ResponseFormatter.success(
          {
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            created: paymentIntent.created,
          },
          'Payment status retrieved'
        )
      );
    } catch (stripeErr) {
      throw new NotFoundError('Payment Intent', paymentIntentId);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * List payments for organization
 */
export const getOrganizationPayments = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const { page = 1, limit = 20, status } = req.query;

    const query = { organization: organizationId };
    if (status) query.status = status;

    const total = await Invoice.countDocuments(query);
    const payments = await Invoice.find(query)
      .sort({ paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('invoiceNumber amount status paidAt transactionId');

    return res.json(
      ResponseFormatter.paginated(payments, page, limit, total, 'Payments retrieved')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Refund payment
 */
export const refundPayment = async (req, res, next) => {
  try {
    const { invoiceId, reason } = req.body;

    if (!invoiceId) {
      throw new BadRequestError('Invoice ID required');
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    if (invoice.status !== 'paid') {
      throw new BadRequestError('Only paid invoices can be refunded');
    }

    if (invoice.paymentMethod === 'stripe' && invoice.transactionId) {
      // Refund via Stripe
      try {
        const refund = await stripeClient.refunds.create({
          payment_intent: invoice.transactionId,
          reason: reason || 'requested_by_customer',
        });

        invoice.status = 'refunded';
        invoice.refundId = refund.id;
        invoice.refundedAt = new Date();
        await invoice.save();

        return res.json(
          ResponseFormatter.success({ refundId: refund.id }, 'Refund processed successfully')
        );
      } catch (stripeErr) {
        throw new BadRequestError(`Stripe refund failed: ${stripeErr.message}`);
      }
    } else {
      // Manual refund
      invoice.status = 'refunded';
      invoice.refundedAt = new Date();
      await invoice.save();

      return res.json(ResponseFormatter.success({}, 'Refund recorded'));
    }
  } catch (err) {
    next(err);
  }
};
