import dayjs from 'dayjs';
import { Tenant } from '../models/Tenant.js';
import { Invoice } from '../models/Invoice.js';
import { sendNotification } from './notificationService.js';

const buildInvoiceNumber = (tenantId, month) => `INV-${month}-${tenantId.toString().slice(-6).toUpperCase()}`;

export const generateMonthlyRent = async (referenceDate = dayjs()) => {
  const month = referenceDate.format('YYYY-MM');
  const tenants = await Tenant.find({ status: 'active' }).populate('user property');

  let created = 0;
  for (const tenant of tenants) {
    const dueDate = referenceDate.date(tenant.dueDayOfMonth).endOf('day').toDate();
    const exists = await Invoice.exists({ tenant: tenant._id, month });
    if (exists) continue;

    const invoice = await Invoice.create({
      tenant: tenant._id,
      property: tenant.property._id,
      month,
      invoiceNumber: buildInvoiceNumber(tenant._id, month),
      baseAmount: tenant.monthlyRent,
      totalAmount: tenant.monthlyRent,
      dueDate,
      status: 'pending'
    });
    created += 1;

    await sendNotification({
      to: tenant.user.email,
      subject: `Rent invoice for ${month}`,
      message: `Invoice ${invoice.invoiceNumber} generated for ${tenant.monthlyRent}.`
    });
  }

  return { month, created };
};

export const applyLateFees = async (referenceDate = dayjs()) => {
  const overdueInvoices = await Invoice.find({ status: { $in: ['pending', 'overdue'] } }).populate('tenant');
  let updated = 0;

  for (const invoice of overdueInvoices) {
    const dueDate = dayjs(invoice.dueDate);
    if (referenceDate.isAfter(dueDate, 'day')) {
      const daysLate = referenceDate.diff(dueDate, 'day');
      const lateFee = daysLate * (invoice.tenant?.lateFeePerDay || 0);
      invoice.lateFee = lateFee;
      invoice.totalAmount = invoice.baseAmount + lateFee;
      invoice.status = 'overdue';
      await invoice.save();
      updated += 1;
    }
  }

  return { checked: overdueInvoices.length, updated };
};

export const sendDueReminders = async (daysBeforeDue = 2, referenceDate = dayjs()) => {
  const targetDate = referenceDate.add(daysBeforeDue, 'day').startOf('day');
  const nextDate = targetDate.add(1, 'day');
  const invoices = await Invoice.find({
    status: 'pending',
    dueDate: { $gte: targetDate.toDate(), $lt: nextDate.toDate() }
  }).populate({ path: 'tenant', populate: { path: 'user' } });

  for (const invoice of invoices) {
    await sendNotification({
      to: invoice.tenant.user.email,
      subject: 'Rent due reminder',
      message: `Invoice ${invoice.invoiceNumber} is due on ${dayjs(invoice.dueDate).format('DD MMM YYYY')}.`
    });
  }

  return { remindersSent: invoices.length };
};
