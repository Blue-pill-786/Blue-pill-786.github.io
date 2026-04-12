import mongoose from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import * as paymentService from '../services/paymentService.js';

/* ================= GET MY PAYMENTS ================= */

export const getMyPayments = catchAsync(async (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  console.log(`💳 [${req.user.role}] Fetching payments`);

  const payments = await paymentService.getPaymentsByUser(req.user._id);

  res.json({
    success: true,
    data: payments || []
  });
});

/* ================= GET INVOICE BY ID ================= */

export const getInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID'
    });
  }

  const invoice = await paymentService.getInvoiceById(id);

  if (req.user.role === 'tenant' && invoice.tenant?.user?._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden invoice access'
    });
  }

  res.json({
    success: true,
    data: invoice
  });
});

/* ================= MARK AS PAID ================= */

export const markAsPaid = catchAsync(async (req, res) => {
  const { invoiceId, method } = req.body;

  if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid invoice ID is required'
    });
  }

  if (!method) {
    return res.status(400).json({
      success: false,
      message: 'Payment method is required'
    });
  }

  const invoice = await paymentService.getInvoiceById(invoiceId);
  if (req.user.role === 'tenant' && invoice.tenant?.user?._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden invoice access'
    });
  }

  console.log(`💰 [${req.user.role}] Paying invoice: ${invoiceId}`);

  const result = await paymentService.markInvoiceAsPaid({
    invoiceId,
    method,
    transactionId: `TXN-${Date.now()}`,
    metadata: { source: 'manual-api', user: req.user._id.toString() }
  });

  res.json({
    success: true,
    data: result,
    message: 'Payment successful'
  });
});

/* ================= ADMIN INVOICES ================= */

export const createInvoice = catchAsync(async (req, res) => {
  const { tenantId, propertyId, billingMonth, baseAmount, dueDate, lateFee, metadata } = req.body;

  if (!tenantId || !billingMonth || baseAmount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'tenantId, billingMonth and baseAmount are required'
    });
  }

  const invoice = await paymentService.createManualInvoice({
    tenantId,
    propertyId,
    billingMonth,
    baseAmount,
    dueDate,
    lateFee,
    metadata
  });

  res.status(201).json({
    success: true,
    data: invoice,
    message: 'Invoice created successfully'
  });
});

export const adjustInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { baseAmount, lateFee, dueDate, metadata } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID'
    });
  }

  const invoice = await paymentService.adjustInvoice({
    invoiceId: id,
    baseAmount,
    lateFee,
    dueDate,
    metadata
  });

  res.json({
    success: true,
    data: invoice,
    message: 'Invoice updated successfully'
  });
});

export const cancelInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid invoice ID'
    });
  }

  const invoice = await paymentService.cancelInvoice({ invoiceId: id, reason });

  res.json({
    success: true,
    data: invoice,
    message: 'Invoice cancelled successfully'
  });
});

export const getAllPayments = catchAsync(async (req, res) => {
  const { tenantId, propertyId, status } = req.query;
  const payments = await paymentService.getAllPayments({ tenantId, propertyId, status });

  res.json({
    success: true,
    data: payments || []
  });
});

/* ================= WEBHOOK ================= */

export const handleWebhook = catchAsync(async (req, res) => {
  const { invoiceId, success, transactionId } = req.body;
  const { provider } = req.params;

  if (!success) {
    return res.status(202).json({ message: 'Payment event ignored' });
  }

  await paymentService.markInvoiceAsPaid({
    invoiceId,
    method: provider,
    transactionId: transactionId || `WEBHOOK-${Date.now()}`,
    metadata: { webhook: true }
  });

  return res.json({ message: 'Payment updated from webhook' });
});