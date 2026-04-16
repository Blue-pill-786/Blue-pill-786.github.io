/**
 * Production-Ready Dashboard Controller
 * Serves both tenant and admin dashboards with real KPIs
 */

import { Tenant } from '../models/Tenant.js';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import ResponseFormatter from '../utils/responseFormatter.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';
import dayjs from 'dayjs';

/**
 * Get Tenant Dashboard
 */
export const getTenantDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Find tenant profile
    const tenant = await Tenant.findOne({ user: userId, status: 'active' })
      .populate('property', 'name code address city')
      .lean();

    if (!tenant) {
      throw new NotFoundError('Tenant', userId);
    }

    // Get upcoming invoices
    const upcomingInvoices = await Invoice.find({
      tenant: tenant._id,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ dueDate: 1 }).limit(5).lean();

    // Calculate KPIs
    const totalInvoices = await Invoice.countDocuments({ tenant: tenant._id });
    const paidInvoices = await Invoice.countDocuments({ tenant: tenant._id, status: 'paid' });
    const overdueInvoices = await Invoice.countDocuments({ tenant: tenant._id, status: 'overdue' });

    // Get payment trends (last 6 months)
    const sixMonthsAgo = dayjs().subtract(6, 'month').toDate();
    const paymentTrends = await Invoice.aggregate([
      {
        $match: {
          tenant: tenant._id,
          paidAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          totalPaid: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const dashboard = {
      tenant: {
        id: tenant._id,
        property: tenant.property,
        monthlyRent: tenant.monthlyRent,
        leaseStartDate: tenant.leaseStartDate,
        leaseEndDate: tenant.leaseEndDate,
        daysInLease: tenant.getDaysInCurrentLease?.(),
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: totalInvoices - paidInvoices - overdueInvoices,
        overdue: overdueInvoices,
      },
      upcomingDue: upcomingInvoices.slice(0, 3),
      paymentTrends,
      lastUpdated: new Date(),
    };

    return res.json(ResponseFormatter.success(dashboard, 'Tenant dashboard retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get Admin Dashboard with full KPIs
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      throw new UnauthorizedError('Admin access required');
    }

    const organizationId = req.user.organization;
    const query = organizationId ? { organization: organizationId } : {};

    // Tenant stats
    const totalTenants = await Tenant.countDocuments({ ...query, status: 'active' });
    const totalLeft = await Tenant.countDocuments({ ...query, status: 'left' });

    // Property stats
    const totalProperties = await Property.countDocuments({ ...query, status: 'active' });

    // Financial stats
    const invoiceStats = await Invoice.aggregate([
      { $match: { ...query } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const invoiceMap = {};
    invoiceStats.forEach(stat => {
      invoiceMap[stat._id] = {
        total: stat.total,
        count: stat.count
      };
    });

    // Revenue trends (last 12 months)
    const oneYearAgo = dayjs().subtract(12, 'month').toDate();
    const revenueTrends = await Invoice.aggregate([
      {
        $match: {
          ...query,
          paidAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          revenue: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Occupancy stats
    const occupancy = await Property.aggregate([
      { $match: { ...query } },
      {
        $group: {
          _id: null,
          totalBeds: { $sum: '$totalBeds' },
          occupiedBeds: { $sum: '$occupiedBeds' }
        }
      }
    ]);

    const occupancyRate = occupancy[0] 
      ? ((occupancy[0].occupiedBeds / occupancy[0].totalBeds) * 100).toFixed(2)
      : 0;

    // Top properties by occupancy
    const topProperties = await Property.find(query)
      .select('name code totalBeds occupiedBeds city')
      .sort({ occupiedBeds: -1 })
      .limit(10)
      .lean();

    // Recent payments
    const recentPayments = await Invoice.find({ ...query, status: 'paid' })
      .populate('tenant', 'user')
      .populate('property', 'name')
      .select('invoiceNumber finalAmount paidAt')
      .sort({ paidAt: -1 })
      .limit(10)
      .lean();

    const dashboard = {
      summary: {
        totalTenants,
        totalLeft,
        totalProperties,
        occupancyRate: parseFloat(occupancyRate),
      },
      financials: {
        totalRevenue: invoiceMap.paid?.total || 0,
        pendingAmount: invoiceMap.pending?.total || 0,
        overdueAmount: invoiceMap.overdue?.total || 0,
        invoiceCounts: invoiceMap,
      },
      trends: {
        revenue: revenueTrends,
      },
      properties: topProperties,
      recentPayments,
      lastUpdated: new Date(),
    };

    return res.json(ResponseFormatter.success(dashboard, 'Admin dashboard retrieved'));
  } catch (err) {
    next(err);
  }
};

/**
 * Get organization statistics
 */
export const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const query = organizationId ? { organization: organizationId } : {};

    const stats = {
      tenants: await Tenant.countDocuments({ ...query, status: 'active' }),
      properties: await Property.countDocuments({ ...query, status: 'active' }),
      invoices: await Invoice.countDocuments(query),
      totalRevenue: (await Invoice.aggregate([
        { $match: { ...query, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]))[0]?.total || 0,
    };

    return res.json(ResponseFormatter.success(stats));
  } catch (err) {
    next(err);
  }
};




/**
 * Health Check Endpoint
 * Used to verify API + DB status
 */
export const getHealthCheckStatus = async (req, res, next) => {
  try {
    // Basic DB check
    const dbCheck = await Promise.all([
      Tenant.estimatedDocumentCount(),
      Property.estimatedDocumentCount(),
      Invoice.estimatedDocumentCount()
    ]);

    return res.json(
      ResponseFormatter.success(
        {
          status: "ok",
          services: {
            api: "running",
            database: "connected"
          },
          counts: {
            tenants: dbCheck[0],
            properties: dbCheck[1],
            invoices: dbCheck[2]
          },
          timestamp: new Date()
        },
        "Health check successful"
      )
    );
  } catch (err) {
    next(err);
  }
};


/**
 * Quick Stats (lightweight dashboard for cards)
 */
export const getQuickStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const query = organizationId ? { organization: organizationId } : {};

    const [tenants, properties, invoices, revenue] = await Promise.all([
      Tenant.countDocuments({ ...query, status: 'active' }),
      Property.countDocuments({ ...query, status: 'active' }),
      Invoice.countDocuments(query),
      Invoice.aggregate([
        { $match: { ...query, status: 'paid' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$finalAmount' }
          }
        }
      ])
    ]);

    return res.json(
      ResponseFormatter.success(
        {
          tenants,
          properties,
          invoices,
          revenue: revenue[0]?.total || 0
        },
        'Quick stats retrieved'
      )
    );
  } catch (err) {
    next(err);
  }
};