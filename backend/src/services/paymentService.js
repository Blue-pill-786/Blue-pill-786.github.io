import { Invoice } from '../models/Invoice.js';

export const markPaymentSuccess = async ({ invoiceId, method, transactionId, metadata = {} }) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  invoice.status = 'paid';
  invoice.paidAt = new Date();
  invoice.paymentMethod = method;
  invoice.metadata = { ...invoice.metadata, transactionId, ...metadata };
  await invoice.save();

  return invoice;
};
