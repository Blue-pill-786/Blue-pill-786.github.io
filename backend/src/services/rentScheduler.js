import dayjs from 'dayjs';
import { env } from '../config/env.js';
import { Tenant } from '../models/Tenant.js';
import { Property } from '../models/Property.js';
import { Invoice } from '../models/Invoice.js';
import { sendNotification } from './notificationService.js';

const buildInvoiceNumber = (tenantId, month) => {
  const suffix = Math.random().toString(36).slice(-4).toUpperCase();
  return `INV-${month}-${tenantId.toString().slice(-6).toUpperCase()}-${suffix}`;
};

const normalizeDueDate = (dayOfMonth, referenceDate = dayjs()) => {
  const safeDay = Math.min(Math.max(Number(dayOfMonth) || 5, 1), referenceDate.daysInMonth());
  let dueDate = referenceDate.date(safeDay).endOf('day');
  if (dueDate.isBefore(referenceDate, 'day')) {
    const nextMonth = referenceDate.add(1, 'month');
    dueDate = nextMonth.date(Math.min(safeDay, nextMonth.daysInMonth())).endOf('day');
  }
  return dueDate.toDate();
};

export const generateMonthlyRent = async (referenceDate = dayjs()) => {
  const billingMonth = referenceDate.format('YYYY-MM');

  const properties = await Property.find({
    isActive: true,
    autoInvoicingEnabled: true
  }).lean();

  if (!properties.length) {
    console.log(`📋 No active properties with auto-invoicing for ${billingMonth}`);
    return { billingMonth, created: 0 };
  }

  const propertyIds = properties.map(p => p._id);
  const tenants = await Tenant.find({
    property: { $in: propertyIds },
    status: 'active'
  }).populate('user property');

  let created = 0;
  const notificationTargets = [];

  for (const tenant of tenants) {
    if (!tenant.property || !tenant.user) continue;

    const exists = await Invoice.exists({ tenant: tenant._id, billingMonth });
    if (exists) continue;

    const dueDate = normalizeDueDate(tenant.dueDayOfMonth, referenceDate);
    const invoice = await Invoice.create({
      tenant: tenant._id,
      property: tenant.property._id,
      billingMonth,
      invoiceNumber: buildInvoiceNumber(tenant._id, billingMonth),
      baseAmount: tenant.monthlyRent,
      lateFee: 0,
      totalAmount: tenant.monthlyRent,
      dueDate,
      status: 'pending'
    });

    created += 1;
    if (tenant.user?.email) {
      notificationTargets.push({
        to: tenant.user.email,
        subject: `Rent invoice generated for ${billingMonth}`,
        message: `Invoice ${invoice.invoiceNumber} has been created for ₹${invoice.totalAmount} and is due on ${dayjs(dueDate).format('DD MMM YYYY')}.`
      });
    }
  }

  for (const notification of notificationTargets) {
    await sendNotification(notification);
  }

  if (env.adminEmail) {
    await sendNotification({
      to: env.adminEmail,
      subject: `Monthly rent invoices generated: ${billingMonth}`,
      message: `${created} invoices were generated for active tenants today.`
    });
  }

  return { billingMonth, created };
};

export const applyLateFees = async (referenceDate = dayjs()) => {
  const properties = await Property.find({
    isActive: true,
    autoLateFeesEnabled: true
  }).lean();

  if (!properties.length) {
    console.log(`💰 No properties with auto-late-fees enabled`);
    return { checked: 0, updated: 0 };
  }

  const propertyIds = properties.map(p => p._id);
  const overdueInvoices = await Invoice.find({
    property: { $in: propertyIds },
    status: { $in: ['pending', 'overdue'] }
  }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });

  let updated = 0;

  for (const invoice of overdueInvoices) {
    if (!invoice.tenant) continue;
    const dueDate = dayjs(invoice.dueDate);
    if (referenceDate.isAfter(dueDate, 'day')) {
      const daysLate = referenceDate.diff(dueDate, 'day');
      const lateFeePerDay = invoice.tenant?.lateFeePerDay ?? 0;
      const lateFee = daysLate * lateFeePerDay;

      if (invoice.lateFee !== lateFee || invoice.status !== 'overdue') {
        invoice.lateFee = lateFee;
        invoice.totalAmount = invoice.baseAmount + lateFee;
        invoice.status = 'overdue';
        await invoice.save();
        updated += 1;
      }
    }
  }

  return { checked: overdueInvoices.length, updated };
};

export const sendDueReminders = async (daysBeforeDue = 2, referenceDate = dayjs()) => {
  const properties = await Property.find({
    isActive: true,
    autoRemindersEnabled: true
  }).lean();

  if (!properties.length) {
    console.log(`📧 No properties with auto-reminders enabled`);
    return { remindersSent: 0 };
  }

  const propertyIds = properties.map(p => p._id);
  const targetDate = referenceDate.add(daysBeforeDue, 'day').startOf('day');
  const nextDate = targetDate.add(1, 'day');
  const invoices = await Invoice.find({
    property: { $in: propertyIds },
    status: 'pending',
    dueDate: { $gte: targetDate.toDate(), $lt: nextDate.toDate() }
  }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });

  for (const invoice of invoices) {
    if (!invoice.tenant?.user?.email) continue;
    await sendNotification({
      to: invoice.tenant.user.email,
      subject: 'Rent due reminder',
      message: `Your invoice ${invoice.invoiceNumber} for ${invoice.billingMonth} is due on ${dayjs(invoice.dueDate).format('DD MMM YYYY')}. Please pay ₹${invoice.totalAmount} before the due date.`
    });
  }

  return { remindersSent: invoices.length };
};

export const sendOverdueAlerts = async (referenceDate = dayjs()) => {
  const overdueInvoices = await Invoice.find({ status: 'overdue' }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });
  let escalations = 0;

  for (const invoice of overdueInvoices) {
    if (!invoice.tenant?.user?.email) continue;
    const daysLate = referenceDate.diff(dayjs(invoice.dueDate), 'day');

    await sendNotification({
      to: invoice.tenant.user.email,
      subject: `Overdue rent invoice ${invoice.invoiceNumber}`,
      message: `Your invoice ${invoice.invoiceNumber} is ${daysLate} day(s) overdue. Current amount due: ₹${invoice.totalAmount}. Please settle immediately.`
    });

    if (daysLate >= 7 && env.adminEmail) {
      escalations += 1;
    }
  }

  if (env.adminEmail && escalations > 0) {
    await sendNotification({
      to: env.adminEmail,
      subject: 'Overdue rent escalations',
      message: `${escalations} overdue invoices have been outstanding for 7 or more days. Review and follow up with tenants.`
    });
  }

  return { overdueAlertsSent: overdueInvoices.length, escalations };
};

export const sendOccupancySummary = async () => {
  const properties = await Property.find().populate({ path: 'manager', select: 'name email' }).lean();

  let totalBeds = 0;
  let occupiedBeds = 0;

  const lines = properties.map((property) => {
    const propertyTotalBeds = property.floors.reduce(
      (floorSum, floor) => floorSum + floor.rooms.reduce(
        (roomSum, room) => roomSum + room.beds.length,
        0
      ),
      0
    );
    const propertyOccupiedBeds = property.floors.reduce(
      (floorSum, floor) => floorSum + floor.rooms.reduce(
        (roomSum, room) => roomSum + room.beds.filter((bed) => bed.status === 'occupied').length,
        0
      ),
      0
    );

    totalBeds += propertyTotalBeds;
    occupiedBeds += propertyOccupiedBeds;

    const managerNote = property.manager?.email ? `Manager: ${property.manager.email}` : 'Manager: N/A';
    return `${property.name} — ${propertyOccupiedBeds}/${propertyTotalBeds} occupied (${managerNote})`;
  });

  const message = `Occupancy summary:\nTotal properties: ${properties.length}\nTotal beds: ${totalBeds}\nOccupied beds: ${occupiedBeds}\nVacant beds: ${totalBeds - occupiedBeds}\n\n${lines.join('\n')}`;

  const recipients = [];
  if (env.adminEmail) recipients.push(env.adminEmail);
  properties.forEach((property) => {
    if (property.manager?.email) recipients.push(property.manager.email);
  });

  const uniqueRecipients = Array.from(new Set(recipients));

  for (const recipient of uniqueRecipients) {
    await sendNotification({
      to: recipient,
      subject: 'Daily occupancy summary',
      message
    });
  }

  return { totalProperties: properties.length, totalBeds, occupiedBeds, recipients: uniqueRecipients.length };
};
