import crypto from 'crypto';
import dayjs from 'dayjs';
import { Invoice } from '../models/Invoice.js';
import { Tenant } from '../models/Tenant.js';
import mongoose from 'mongoose';
import { sendNotification } from './notificationService.js';

const buildInvoiceNumber = (tenantId, billingMonth) => {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `INV-${billingMonth}-${tenantId.toString().slice(-6).toUpperCase()}-${suffix}`;
};

export const getPaymentsByUser = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('Invalid user ID');
    err.statusCode = 400;
    throw err;
  }

  return Invoice.find()
    .populate({
      path: 'tenant',
      match: { user: userId },
      populate: { path: 'user', select: 'name email' }
    })
    .lean()
    .then(invoices => invoices.filter(invoice => invoice.tenant !== null));
};

export const getInvoiceById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid invoice ID');
    err.statusCode = 400;
    throw err;
  }

  const invoice = await Invoice.findById(id)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } })
    .populate('property')
    .lean();

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  return invoice;
};

export const getAllPayments = async (filters = {}) => {
  const query = {};
  const { tenantId, propertyId, status } = filters;

  if (tenantId) {
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      const err = new Error('Invalid tenant ID');
      err.statusCode = 400;
      throw err;
    }
    query.tenant = tenantId;
  }

  if (propertyId) {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      const err = new Error('Invalid property ID');
      err.statusCode = 400;
      throw err;
    }
    query.property = propertyId;
  }

  if (status) {
    const validStatuses = ['paid', 'pending', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const err = new Error('Invalid invoice status');
      err.statusCode = 400;
      throw err;
    }
    query.status = status;
  }

  return Invoice.find(query)
    .populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } })
    .populate('property')
    .lean();
};

export const createManualInvoice = async ({ tenantId, propertyId, billingMonth, baseAmount, dueDate, lateFee = 0, metadata = {} }) => {
  if (!tenantId || !billingMonth || baseAmount === undefined) {
    const err = new Error('Tenant ID, billing month and base amount are required');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    const err = new Error('Invalid tenant ID');
    err.statusCode = 400;
    throw err;
  }

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.statusCode = 404;
    throw err;
  }

  const property = propertyId || tenant.property;
  if (!mongoose.Types.ObjectId.isValid(property)) {
    const err = new Error('Invalid property ID');
    err.statusCode = 400;
    throw err;
  }

  const amount = Number(baseAmount);
  const fee = Number(lateFee);
  if (Number.isNaN(amount) || amount < 0 || Number.isNaN(fee) || fee < 0) {
    const err = new Error('Invalid amount values');
    err.statusCode = 400;
    throw err;
  }

  if (await Invoice.exists({ tenant: tenantId, billingMonth })) {
    const err = new Error('Invoice already exists for this tenant and billing month');
    err.statusCode = 409;
    throw err;
  }

  const normalizedDueDate = dueDate ? dayjs(dueDate) : dayjs(`${billingMonth}-05`);
  if (!normalizedDueDate.isValid()) {
    const err = new Error('Invalid due date');
    err.statusCode = 400;
    throw err;
  }

  const invoiceNumber = buildInvoiceNumber(tenantId, billingMonth);

  return Invoice.create({
    tenant: tenantId,
    property,
    invoiceNumber,
    billingMonth,
    baseAmount: amount,
    lateFee: fee,
    totalAmount: amount + fee,
    dueDate: normalizedDueDate.toDate(),
    status: 'pending',
    metadata
  });
};

export const adjustInvoice = async ({ invoiceId, baseAmount, lateFee, dueDate, metadata = {} }) => {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    const err = new Error('Invalid invoice ID');
    err.statusCode = 400;
    throw err;
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (['paid', 'cancelled'].includes(invoice.status)) {
    const err = new Error('Cannot adjust a paid or cancelled invoice');
    err.statusCode = 400;
    throw err;
  }

  if (baseAmount !== undefined) {
    const amount = Number(baseAmount);
    if (Number.isNaN(amount) || amount < 0) {
      const err = new Error('Invalid base amount');
      err.statusCode = 400;
      throw err;
    }
    invoice.baseAmount = amount;
  }

  if (lateFee !== undefined) {
    const fee = Number(lateFee);
    if (Number.isNaN(fee) || fee < 0) {
      const err = new Error('Invalid late fee');
      err.statusCode = 400;
      throw err;
    }
    invoice.lateFee = fee;
  }

  if (dueDate) {
    const normalizedDueDate = dayjs(dueDate);
    if (!normalizedDueDate.isValid()) {
      const err = new Error('Invalid due date');
      err.statusCode = 400;
      throw err;
    }
    invoice.dueDate = normalizedDueDate.toDate();
  }

  invoice.totalAmount = invoice.baseAmount + invoice.lateFee;
  invoice.metadata = { ...invoice.metadata, ...metadata, adjustedAt: new Date().toISOString() };

  await invoice.save();
  return invoice;
};

export const cancelInvoice = async ({ invoiceId, reason = 'Cancelled by admin' }) => {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    const err = new Error('Invalid invoice ID');
    err.statusCode = 400;
    throw err;
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (invoice.status === 'paid') {
    const err = new Error('Cannot cancel a paid invoice');
    err.statusCode = 400;
    throw err;
  }

  invoice.status = 'cancelled';
  invoice.cancelReason = reason;
  invoice.canceledAt = new Date();
  invoice.metadata = {
    ...invoice.metadata,
    cancelledBy: reason,
    cancelledAt: new Date().toISOString()
  };

  await invoice.save();

  const tenant = await Tenant.findById(invoice.tenant).populate('user', 'name email');
  if (tenant?.user?.email) {
    await sendNotification({
      to: tenant.user.email,
      subject: `Invoice ${invoice.invoiceNumber} cancelled`,
      message: `Your invoice ${invoice.invoiceNumber} has been cancelled. Reason: ${reason}.`
    });
  }

  return invoice;
};

export const markInvoiceAsPaid = async ({ invoiceId, method, transactionId, metadata = {} }) => {
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    const err = new Error('Invalid invoice ID');
    err.statusCode = 400;
    throw err;
  }

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (invoice.status === 'cancelled') {
    const err = new Error('Cannot pay a cancelled invoice');
    err.statusCode = 400;
    throw err;
  }

  invoice.status = 'paid';
  invoice.paidAt = new Date();
  invoice.paymentMethod = method;
  invoice.metadata = { ...invoice.metadata, transactionId, ...metadata };

  await invoice.save();

  const tenant = await Tenant.findById(invoice.tenant).populate('user', 'name email');
  if (tenant?.user?.email) {
    await sendNotification({
      to: tenant.user.email,
      subject: `Payment received for ${invoice.invoiceNumber}`,
      message: `Your payment of ₹${invoice.totalAmount} has been recorded for invoice ${invoice.invoiceNumber}. Thank you!`
    });
  }

  return invoice;
};
