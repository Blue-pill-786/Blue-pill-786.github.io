/**
 * Production-Ready Payment Controller
 * Handles invoice payments, collection, and reconciliation
 */

import { Invoice } from '../models/Invoice.js';
import { Tenant } from '../models/Tenant.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { NotFoundError, BadRequestError, ValidationError, ForbiddenError, ConflictError } from '../utils/errors.js';
import dayjs from 'dayjs';

/**
 * Get invoices for current tenant
 */
export const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    // Find tenant
    const tenant = await Tenant.findOne({ user: userId }).select('_id').lean();
    if (!tenant) throw new NotFoundError('Tenant', userId);

    // Build query
    const query = { tenant: tenant._id };
    if (status) query.status = status;

    // Get total count
    const total = await Invoice.countDocuments(query);

    // Get paginated invoices
    const invoices = await Invoice.find(query)
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('invoiceNumber billingMonth baseAmount finalAmount dueDate status paidAt')
      .lean();

    return res.json(
      ResponseFormatter.paginated(invoices, page, limit, total, 'Payments retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get invoice details
 */
export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id)
      .populate('tenant', 'user monthlyRent')
      .populate('property', 'name code address')
      .lean();

    if (!invoice) throw new NotFoundError('Invoice', id);

    // Check access for tenants
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ user: req.user._id, _id: invoice.tenant._id });
      if (!tenant) throw new ForbiddenError('Cannot access this invoice');
    }

    return res.json(ResponseFormatter.success(invoice, 'Invoice retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Process payment for invoice
 */
export const markAsPaid = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { invoiceId, amount, method, transactionId } = req.body;

    // Validation
    if (!invoiceId || !amount || !method) {
      throw new ValidationError('Missing required fields', []);
    }

    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    // Check access for tenants
    if (req.user.role === 'tenant') {
      const tenant = await Tenant.findOne({ user: userId, _id: invoice.tenant._id });
      if (!tenant) throw new ForbiddenError('Cannot pay this invoice');
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      throw new ConflictError('Invoice already paid');
    }

    // Check amount
    if (amount > invoice.outstandingAmount) {
      throw new BadRequestError(
        `Amount exceeds outstanding balance of ₹${invoice.outstandingAmount}`
      );
    }

    // Mark as paid (in production, integrate with Razorpay/Stripe)
    await invoice.markAsPaid(amount, method, transactionId || `PAY_${Date.now()}`);

    return res.json(
      ResponseFormatter.success(invoice, 'Payment processed successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Create invoice
 */
export const createInvoice = async (req, res, next) => {
  try {
    const { tenantId, billingMonth, baseAmount, dueDate, maintenance, utilities, tax, lateFee } = req.body;

    // Validation
    if (!tenantId || !billingMonth || baseAmount === undefined) {
      throw new ValidationError('tenantId, billingMonth, and baseAmount are required', []);
    }

    if (baseAmount < 0) {
      throw new BadRequestError('baseAmount cannot be negative');
    }

    // Check tenant exists
    const tenant = await Tenant.findById(tenantId).select('_id property monthlyRent');
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    // Create invoice
    const invoice = new Invoice({
      tenant: tenantId,
      property: tenant.property,
      billingMonth: new Date(billingMonth),
      amount: {
        base: baseAmount,
        maintenance: maintenance || 0,
        utilities: utilities || 0,
        lateFee: lateFee || 0,
        tax: tax || 0,
      },
      dueDate: dueDate ? new Date(dueDate) : dayjs().add(15, 'day').toDate(),
      status: 'issued',
      createdBy: req.user._id,
    });

    await invoice.save();
    await invoice.populate('tenant property');

    return res.json(
      ResponseFormatter.created(invoice, 'Invoice created successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update invoice
 */
export const adjustInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { baseAmount, maintenance, utilities, lateFee, tax, dueDate } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) throw new NotFoundError('Invoice', id);

    if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
      throw new ConflictError('Cannot modify paid invoices');
    }

    // Update amounts
    if (baseAmount !== undefined) invoice.amount.base = baseAmount;
    if (maintenance !== undefined) invoice.amount.maintenance = maintenance;
    if (utilities !== undefined) invoice.amount.utilities = utilities;
    if (lateFee !== undefined) invoice.amount.lateFee = lateFee;
    if (tax !== undefined) invoice.amount.tax = tax;
    if (dueDate) invoice.dueDate = new Date(dueDate);

    invoice.updatedBy = req.user._id;
    await invoice.save();

    return res.json(ResponseFormatter.updated(invoice, 'Invoice updated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Cancel invoice
 */
export const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) throw new NotFoundError('Invoice', id);

    if (invoice.status === 'paid') {
      throw new ConflictError('Cannot cancel paid invoices');
    }

    invoice.status = 'cancelled';
    invoice.reason = reason || 'Cancelled by admin';
    invoice.updatedBy = req.user._id;
    await invoice.save();

    return res.json(ResponseFormatter.updated(invoice, 'Invoice cancelled successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get all invoices with filters
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const { status, tenantId, propertyId, page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organization;

    // Build query
    const query = organizationId ? { organization: organizationId } : {};
    if (status) query.status = status;
    if (tenantId) query.tenant = tenantId;
    if (propertyId) query.property = propertyId;

    // Get total count
    const total = await Invoice.countDocuments(query);

    // Get paginated invoices
    const invoices = await Invoice.find(query)
      .populate('tenant', 'user monthlyRent')
      .populate('property', 'name code')
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    return res.json(
      ResponseFormatter.paginated(invoices, page, limit, total, 'Invoices retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const query = organizationId ? { organization: organizationId } : {};

    const stats = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = { total: stat.total, count: stat.count };
    });

    return res.json(ResponseFormatter.success(statsMap, 'Payment statistics retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Webhook handler for payment gateway (Razorpay/Stripe)
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const { invoiceId, success, transactionId, amount, method } = req.body;
    const { provider } = req.params;

    if (!success) {
      return res.status(202).json({ message: 'Payment event ignored' });
    }

    if (!invoiceId || !transactionId) {
      throw new ValidationError('Missing required fields', []);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    // Mark as paid
    await invoice.markAsPaid(amount || invoice.finalAmount, method || provider, transactionId);

    return res.json(ResponseFormatter.updated(invoice, 'Payment processed via webhook'));
  } catch (err) {
    next(err);
  }
};

export const getOverdueInvoices = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const query = {
      status: 'overdue'
    };

    if (organizationId) {
      query.organization = organizationId;
    }

    const invoices = await Invoice.find(query)
      .populate('tenant', 'user')
      .populate('property', 'name code')
      .sort({ dueDate: 1 })
      .lean();

    return res.json(
      ResponseFormatter.success(invoices, 'Overdue invoices retrieved')
    );
  } catch (err) {
    next(err);
  }
};

export const getCollectionReport = async (req, res, next) => {
  try {
    const { month } = req.query;
    const organizationId = req.user.organization;

    let start, end;

    if (month) {
      start = new Date(`${month}-01`);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
    }

    const match = {
      status: 'paid'
    };

    if (organizationId) {
      match.organization = organizationId;
    }

    if (start && end) {
      match.paidAt = { $gte: start, $lt: end };
    }

    const data = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalCollection: { $sum: '$finalAmount' },
          totalInvoices: { $sum: 1 }
        }
      }
    ]);

    return res.json(
      ResponseFormatter.success(
        {
          totalCollection: data[0]?.totalCollection || 0,
          totalInvoices: data[0]?.totalInvoices || 0,
          month: month || 'all'
        },
        'Collection report generated'
      )
    );
  } catch (err) {
    next(err);
  }
};
