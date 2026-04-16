/**
 * Production-Ready Tenant Controller with Advanced Error Handling
 */

import { Tenant } from '../models/Tenant.js';
import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { NotFoundError, BadRequestError, ValidationError, ConflictError } from '../utils/errors.js';
import dayjs from 'dayjs';

/**
 * Get Tenant Dashboard with all relevant data
 */
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find tenant profile
    const tenant = await Tenant.findOne({ user: userId, status: 'active' })
      .populate('user', 'name email phone avatar')
      .populate('property', 'name code address city')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant Profile', userId);
    }

    // Get invoices for this tenant
    const invoices = await Invoice.find({ tenant: tenant._id })
      .sort({ dueDate: -1 })
      .limit(10)
      .lean();

    // Calculate summary
    const summary = {
      monthlyRent: tenant.monthlyRent,
      totalPaid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.finalAmount, 0),
      totalPending: invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.finalAmount, 0),
      totalOverdue: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.finalAmount, 0),
      overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
      lastPaymentDate: invoices.find(inv => inv.status === 'paid')?.paidAt,
      nextDueDate: invoices.find(inv => inv.status === 'pending')?.dueDate,
    };

    // Get recent complaints
    const recentComplaints = tenant.complaints?.slice(0, 5) || [];

    return res.json(
      ResponseFormatter.success(
        {
          tenant,
          invoices,
          summary,
          recentComplaints,
        },
        'Dashboard data retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get all invoices for a tenant
 */
export const getInvoices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, sort = '-dueDate', page = 1, limit = 10 } = req.query;

    // Find tenant
    const tenant = await Tenant.findOne({ user: userId })
      .select('_id')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant Profile', userId);
    }

    // Build query
    const query = { tenant: tenant._id };
    if (status) query.status = status;

    // Get total count
    const total = await Invoice.countDocuments(query);

    // Get paginated invoices
    const invoices = await Invoice.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('invoiceNumber billingMonth baseAmount lateFee finalAmount dueDate status paidAt')
      .lean();

    return res.json(
      ResponseFormatter.paginated(invoices, page, limit, total, 'Invoices retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get invoice details
 */
export const getInvoiceDetail = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { invoiceId } = req.params;

    // Find tenant
    const tenant = await Tenant.findOne({ user: userId })
      .select('_id')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant Profile', userId);
    }

    // Get invoice
    const invoice = await Invoice.findOne({ _id: invoiceId, tenant: tenant._id })
      .populate('tenant', 'user property monthlyRent')
      .populate('property', 'name code address city')
      .lean();

    if (!invoice) {
      throw new NotFoundError('Invoice', invoiceId);
    }

    return res.json(ResponseFormatter.success(invoice, 'Invoice retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Pay invoice (initiate payment)
 */
export const payInvoice = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { invoiceId, amount, method } = req.body;

    // Validation
    if (!invoiceId || !amount || !method) {
      throw new ValidationError('Missing required fields', []);
    }

    if (amount <= 0) {
      throw new BadRequestError('Amount must be greater than 0');
    }

    // Find tenant
    const tenant = await Tenant.findOne({ user: userId }).select('_id');
    if (!tenant) throw new NotFoundError('Tenant Profile', userId);

    // Get invoice
    const invoice = await Invoice.findOne({ _id: invoiceId, tenant: tenant._id });
    if (!invoice) throw new NotFoundError('Invoice', invoiceId);

    if (invoice.status === 'paid') {
      throw new ConflictError('Invoice already paid');
    }

    if (amount > invoice.outstandingAmount) {
      throw new BadRequestError(`Amount exceeds outstanding amount of ₹${invoice.outstandingAmount}`);
    }

    // Mark as paid (in production, integrate with Stripe/Razorpay)
    await invoice.markAsPaid(amount, method, `ref_${Date.now()}`);

    return res.json(
      ResponseFormatter.created(invoice, 'Payment processed successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Submit complaint
 */
export const submitComplaint = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title, description, category, attachments } = req.body;

    // Validation
    if (!title || !description) {
      throw new ValidationError('Title and description are required', []);
    }

    if (title.length < 5 || title.length > 100) {
      throw new BadRequestError('Title must be between 5 and 100 characters');
    }

    // Find tenant
    const tenant = await Tenant.findOne({ user: userId, status: 'active' });
    if (!tenant) throw new NotFoundError('Tenant Profile', userId);

    // Create complaint
    const complaint = {
      title,
      description,
      category: category || 'other',
      status: 'open',
      priority: 'medium',
      createdAt: new Date(),
      attachments: attachments || [],
    };

    tenant.complaints.push(complaint);
    await tenant.save();

    return res.json(
      ResponseFormatter.created(complaint, 'Complaint submitted successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const tenant = await Tenant.findOne({ user: userId, status: 'active' })
      .populate('user', '-password')
      .select('-complaints')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant Profile', userId);
    }

    return res.json(ResponseFormatter.success(tenant, 'Profile retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Update profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { emergencyContact, alternatePhone, notifications } = req.body;

    const tenant = await Tenant.findOne({ user: userId, status: 'active' });
    if (!tenant) throw new NotFoundError('Tenant Profile', userId);

    // Update fields
    if (emergencyContact) tenant.emergencyContact = emergencyContact;
    if (alternatePhone) tenant.alternatePhone = alternatePhone;
    if (notifications) tenant.notifications = { ...tenant.notifications, ...notifications };

    await tenant.save();

    return res.json(ResponseFormatter.updated(tenant, 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get all tenants
 */
export const getAllTenants = async (req, res, next) => {
  try {
    const { status, property, page = 1, limit = 20 } = req.query;
    const organizationId = req.user.organization;

    // Build query
    const query = organizationId ? { organization: organizationId } : {};
    if (status) query.status = status;
    if (property) query.property = property;

    // Get total count
    const total = await Tenant.countDocuments(query);

    // Get tenants
    const tenants = await Tenant.find(query)
      .populate('user', 'name email phone')
      .populate('property', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    return res.json(
      ResponseFormatter.paginated(tenants, page, limit, total, 'Tenants retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Create tenant
 */
export const createTenant = async (req, res, next) => {
  try {
    const { userId, propertyId, monthlyRent, leaseStartDate, leaseEndDate, emergencyContact } = req.body;

    // Validation
    if (!userId || !propertyId || !monthlyRent || !leaseStartDate) {
      throw new ValidationError('Missing required fields', []);
    }

    if (monthlyRent <= 0) {
      throw new BadRequestError('Monthly rent must be greater than 0');
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    // Check property exists
    const property = await Property.findById(propertyId);
    if (!property) throw new NotFoundError('Property', propertyId);

    // Create tenant
    const tenant = new Tenant({
      user: userId,
      property: propertyId,
      organization: req.user.organization,
      monthlyRent,
      leaseStartDate: new Date(leaseStartDate),
      leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null,
      emergencyContact,
      status: 'active',
      checkInDate: new Date(),
    });

    await tenant.save();
    await tenant.populate('user property');

    return res.json(
      ResponseFormatter.created(tenant, 'Tenant created successfully')
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update tenant
 */
export const updateTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { ...updates, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('user property');

    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    return res.json(ResponseFormatter.updated(tenant, 'Tenant updated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Delete/Deactivate tenant
 */
export const deactivateTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new NotFoundError('Tenant', tenantId);

    tenant.status = 'left';
    tenant.checkOutDate = new Date();
    tenant.notes = reason || 'Tenant deactivated';

    await tenant.save();

    return res.json(ResponseFormatter.updated(tenant, 'Tenant deactivated successfully'));
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get tenant statistics
 */
export const getTenantStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;

    const query = organizationId ? { organization: organizationId } : {};

    const stats = {
      totalTenants: await Tenant.countDocuments({ ...query, status: 'active' }),
      totalLeft: await Tenant.countDocuments({ ...query, status: 'left' }),
      totalSuspended: await Tenant.countDocuments({ ...query, status: 'suspended' }),
      averageRent: await Tenant.aggregate([
        { $match: { ...query, status: 'active' } },
        { $group: { _id: null, average: { $avg: '$monthlyRent' } } },
      ]),
    };

    return res.json(ResponseFormatter.success(stats, 'Tenant statistics retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Check if tenant is eligible for renewal
 */
export const checkRenewalEligibility = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findById(tenantId)
      .select('status leaseEndDate monthlyRent')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }

    // Basic rules
    const now = new Date();

    const isActive = tenant.status === 'active';
    const hasLease = !!tenant.leaseEndDate;

    let daysRemaining = null;
    if (hasLease) {
      daysRemaining = Math.ceil(
        (new Date(tenant.leaseEndDate) - now) / (1000 * 60 * 60 * 24)
      );
    }

    const eligible =
      isActive &&
      hasLease &&
      daysRemaining !== null &&
      daysRemaining <= 30; // allow renewal in last 30 days

    return res.json(
      ResponseFormatter.success(
        {
          eligible,
          status: tenant.status,
          leaseEndDate: tenant.leaseEndDate,
          daysRemaining,
        },
        eligible
          ? 'Tenant eligible for renewal'
          : 'Tenant not eligible for renewal yet'
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get tenants with expiring leases
 */
export const getExpiringLeases = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const organizationId = req.user.organization;

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + Number(days));

    const query = {
      status: 'active',
      leaseEndDate: { $gte: now, $lte: futureDate }
    };

    if (organizationId) {
      query.organization = organizationId;
    }

    const tenants = await Tenant.find(query)
      .populate('user', 'name email phone')
      .populate('property', 'name code city')
      .sort({ leaseEndDate: 1 })
      .lean();

    return res.json(
      ResponseFormatter.success(
        {
          count: tenants.length,
          days: Number(days),
          tenants
        },
        'Expiring leases retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};


/**
 * Admin: Get single tenant by ID
 */
export const getTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const tenant = await Tenant.findById(tenantId)
      .populate('user', 'name email phone')
      .populate('property', 'name code address city')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }

    // Optional: attach invoice summary
    const invoices = await Invoice.find({ tenant: tenantId })
      .select('finalAmount status')
      .lean();

    const summary = {
      totalInvoices: invoices.length,
      totalPaid: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + i.finalAmount, 0),
      totalPending: invoices
        .filter(i => i.status === 'pending')
        .reduce((sum, i) => sum + i.finalAmount, 0),
      totalOverdue: invoices
        .filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + i.finalAmount, 0),
    };

    return res.json(
      ResponseFormatter.success(
        {
          tenant,
          financialSummary: summary,
        },
        'Tenant retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};


/**
 * Admin: Get tenant complaints
 */
export const getTenantComplaints = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const tenant = await Tenant.findById(tenantId)
      .select('complaints user property')
      .populate('user', 'name email')
      .populate('property', 'name code')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant', tenantId);
    }

    let complaints = tenant.complaints || [];

    // Optional filter
    if (status) {
      complaints = complaints.filter(c => c.status === status);
    }

    // Sort latest first
    complaints = complaints.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Pagination (manual since it's embedded)
    const start = (page - 1) * limit;
    const paginated = complaints.slice(start, start + Number(limit));

    return res.json(
      ResponseFormatter.paginated(
        paginated,
        page,
        limit,
        complaints.length,
        'Tenant complaints retrieved'
      )
    );
  } catch (err) {
    next(err);
  }
};