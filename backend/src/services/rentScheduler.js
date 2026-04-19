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

/**
 * Generate monthly rent invoices for all active tenants
 * Includes validation and duplicate prevention
 */
export const generateMonthlyRent = async (referenceDate = dayjs()) => {
  try {
    const billingMonth = referenceDate.format('YYYY-MM');
    console.log(`📋 Starting monthly rent generation for ${billingMonth}`);

    // Fetch active properties with auto-invoicing enabled
    const properties = await Property.find({
      isActive: true,
      autoInvoicingEnabled: true
    }).lean();

    if (!properties.length) {
      console.log(`⚠️  No active properties with auto-invoicing enabled`);
      return { billingMonth, created: 0, properties: 0 };
    }

    console.log(`✓ Found ${properties.length} properties with auto-invoicing`);
    const propertyIds = properties.map(p => p._id);

    // Fetch active tenants in those properties
    const tenants = await Tenant.find({
      property: { $in: propertyIds },
      status: 'active'
    }).populate('user property');

    console.log(`✓ Found ${tenants.length} active tenants`);

    let created = 0;
    let skipped = 0;
    const notificationTargets = [];
    const errors = [];

    for (const tenant of tenants) {
      try {
        // Validate tenant data
        if (!tenant.property || !tenant.user) {
          console.warn(`⚠️  Skipping tenant ${tenant._id}: Missing property or user reference`);
          skipped += 1;
          continue;
        }

        if (!tenant.monthlyRent || tenant.monthlyRent <= 0) {
          console.warn(`⚠️  Skipping tenant ${tenant._id}: Invalid monthly rent (${tenant.monthlyRent})`);
          skipped += 1;
          continue;
        }

        // Check for duplicate invoice
        const exists = await Invoice.findOne({ tenant: tenant._id, billingMonth }).lean();
        if (exists) {
          console.log(`⏭️  Invoice already exists for tenant ${tenant._id} in ${billingMonth}`);
          skipped += 1;
          continue;
        }

        // Generate invoice
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
        console.log(`✓ Generated invoice ${invoice.invoiceNumber} for tenant ${tenant._id}`);

        // Queue notification
        if (tenant.user?.email) {
          notificationTargets.push({
            to: tenant.user.email,
            tenantName: tenant.user.name,
            subject: `Rent invoice generated for ${billingMonth}`,
            message: `Invoice ${invoice.invoiceNumber} has been created for ₹${invoice.totalAmount} and is due on ${dayjs(dueDate).format('DD MMM YYYY')}.`
          });
        }
      } catch (err) {
        const errorMsg = `Error creating invoice for tenant ${tenant._id}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Send notifications
    console.log(`📧 Sending ${notificationTargets.length} tenant notifications...`);
    for (const notification of notificationTargets) {
      try {
        await sendNotification(notification);
      } catch (err) {
        console.error(`❌ Failed to send notification to ${notification.to}: ${err.message}`);
      }
    }

    // Send admin summary
    if (env.adminEmail) {
      try {
        await sendNotification({
          to: env.adminEmail,
          subject: `Monthly rent invoices: ${billingMonth} (${created} created)`,
          message: `✓ ${created} invoices generated\n⏭️ ${skipped} skipped\n❌ ${errors.length} errors\n\n${errors.length > 0 ? 'Errors:\n' + errors.join('\n') : 'No errors'}`
        });
      } catch (err) {
        console.error(`❌ Failed to send admin notification: ${err.message}`);
      }
    }

    return { billingMonth, created, skipped, errors, notificationsSent: notificationTargets.length };
  } catch (err) {
    console.error('❌ Fatal error in generateMonthlyRent:', err);
    throw err;
  }
};

/**
 * Apply late fees to overdue invoices
 */
export const applyLateFees = async (referenceDate = dayjs()) => {
  try {
    console.log(`💰 Starting late fee calculation`);

    const properties = await Property.find({
      isActive: true,
      autoLateFeesEnabled: true
    }).lean();

    if (!properties.length) {
      console.log(`⚠️  No properties with auto-late-fees enabled`);
      return { checked: 0, updated: 0, errors: [] };
    }

    console.log(`✓ Found ${properties.length} properties with auto-late-fees`);
    const propertyIds = properties.map(p => p._id);

    const overdueInvoices = await Invoice.find({
      property: { $in: propertyIds },
      status: { $in: ['pending', 'overdue'] }
    }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });

    console.log(`✓ Found ${overdueInvoices.length} invoices to check`);

    let updated = 0;
    let errors = [];

    for (const invoice of overdueInvoices) {
      try {
        if (!invoice.tenant) continue;

        const dueDate = dayjs(invoice.dueDate);
        if (referenceDate.isAfter(dueDate, 'day')) {
          const daysLate = referenceDate.diff(dueDate, 'day');
          const lateFeePerDay = invoice.tenant?.lateFeePerDay ?? 0;
          const newLateFee = daysLate * lateFeePerDay;

          // Only update if fee changed or status needs update
          if (invoice.lateFee !== newLateFee || invoice.status !== 'overdue') {
            invoice.lateFee = newLateFee;
            invoice.totalAmount = invoice.baseAmount + newLateFee;
            invoice.status = 'overdue';
            await invoice.save();
            updated += 1;
            console.log(`✓ Updated late fees for invoice ${invoice.invoiceNumber}: ₹${newLateFee}`);
          }
        }
      } catch (err) {
        const errorMsg = `Error updating invoice ${invoice?.invoiceNumber}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return { checked: overdueInvoices.length, updated, errors };
  } catch (err) {
    console.error('❌ Fatal error in applyLateFees:', err);
    throw err;
  }
};

/**
 * Send payment reminders for invoices due in X days
 */
export const sendDueReminders = async (daysBeforeDue = 2, referenceDate = dayjs()) => {
  try {
    console.log(`📧 Starting due payment reminders (${daysBeforeDue} days before due)`);

    const properties = await Property.find({
      isActive: true,
      autoRemindersEnabled: true
    }).lean();

    if (!properties.length) {
      console.log(`⚠️  No properties with auto-reminders enabled`);
      return { remindersSent: 0, errors: [] };
    }

    const propertyIds = properties.map(p => p._id);

    const targetDate = referenceDate.add(daysBeforeDue, 'day').startOf('day');
    const nextDate = targetDate.add(1, 'day');

    const invoices = await Invoice.find({
      property: { $in: propertyIds },
      status: 'pending',
      dueDate: { $gte: targetDate.toDate(), $lt: nextDate.toDate() }
    }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });

    let remindersSent = 0;
    let errors = [];

    for (const invoice of invoices) {
      try {
        if (!invoice.tenant?.user?.email) {
          console.warn(`⚠️  Skipping reminder: No email for invoice ${invoice.invoiceNumber}`);
          continue;
        }

        await sendNotification({
          to: invoice.tenant.user.email,
          subject: 'Rent due reminder',
          message: `Your invoice ${invoice.invoiceNumber} for ${invoice.billingMonth} is due on ${dayjs(invoice.dueDate).format('DD MMM YYYY')}. Please pay ₹${invoice.totalAmount}.`
        });

        remindersSent++;
      } catch (err) {
        const errorMsg = `Failed reminder for ${invoice.invoiceNumber}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return { remindersSent, errors };
  } catch (err) {
    console.error('❌ Fatal error in sendDueReminders:', err);
    throw err;
  }
};
/**
 * Send overdue alerts and escalations
 */
export const sendOverdueAlerts = async (referenceDate = dayjs()) => {
  try {
    console.log(`🚨 Starting overdue alert notifications`);

    const overdueInvoices = await Invoice.find({ status: 'overdue' }).populate({ path: 'tenant', populate: { path: 'user', select: 'name email' } });

    console.log(`✓ Found ${overdueInvoices.length} overdue invoices`);

    let alertsSent = 0;
    let escalations = 0;
    let errors = [];

    for (const invoice of overdueInvoices) {
      try {
        if (!invoice.tenant?.user?.email) continue;

        const daysLate = referenceDate.diff(dayjs(invoice.dueDate), 'day');

        await sendNotification({
          to: invoice.tenant.user.email,
          subject: `Overdue rent invoice ${invoice.invoiceNumber}`,
          message: `Your invoice ${invoice.invoiceNumber} is ${daysLate} day(s) overdue. Current amount due: ₹${invoice.totalAmount}. Please settle immediately.`
        });

        alertsSent += 1;
        console.log(`✓ Overdue alert sent for invoice ${invoice.invoiceNumber} (${daysLate} days late)`);

        // Escalate if 7+ days overdue
        if (daysLate >= 7) {
          escalations += 1;
        }
      } catch (err) {
        const errorMsg = `Failed to send overdue alert for invoice ${invoice?.invoiceNumber}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Send escalation summary to admin
    if (env.adminEmail && escalations > 0) {
      try {
        await sendNotification({
          to: env.adminEmail,
          subject: `⚠️ Overdue rent escalations: ${escalations} invoices`,
          message: `${escalations} overdue invoices have been outstanding for 7 or more days. Review and follow up with tenants immediately.`
        });
        console.log(`✓ Escalation notification sent to admin`);
      } catch (err) {
        console.error(`❌ Failed to send escalation email: ${err.message}`);
      }
    }

    return { alertsSent, escalations, errors };
  } catch (err) {
    console.error('❌ Fatal error in sendOverdueAlerts:', err);
    throw err;
  }
};

/**
 * Send daily occupancy summary to managers and admin
 */
export const sendOccupancySummary = async () => {
  try {
    console.log(`📊 Starting occupancy summary report`);

    const properties = await Property.find().populate({ path: 'manager', select: 'name email' }).lean();

    console.log(`✓ Found ${properties.length} properties`);

    let totalBeds = 0;
    let occupiedBeds = 0;
    const lines = [];
    let errors = [];

    for (const property of properties) {
      try {
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

        const occupancyRate = propertyTotalBeds > 0 ? Math.round((propertyOccupiedBeds / propertyTotalBeds) * 100) : 0;
        const managerNote = property.manager?.email ? `Manager: ${property.manager.email}` : 'Manager: N/A';
        lines.push(`${property.name} — ${propertyOccupiedBeds}/${propertyTotalBeds} occupied (${occupancyRate}%) - ${managerNote}`);
      } catch (err) {
        const errorMsg = `Error calculating occupancy for property ${property.name}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const message = `Occupancy Summary:\n\nTotal Properties: ${properties.length}\nTotal Beds: ${totalBeds}\nOccupied: ${occupiedBeds}\nVacant: ${totalBeds - occupiedBeds}\nOccupancy Rate: ${occupancyRate}%\n\n${lines.join('\n')}`;

    // Collect recipients
    const recipients = [];
    if (env.adminEmail) recipients.push(env.adminEmail);
    properties.forEach((property) => {
      if (property.manager?.email) recipients.push(property.manager.email);
    });

    const uniqueRecipients = Array.from(new Set(recipients));
    console.log(`✓ Will send to ${uniqueRecipients.length} recipients`);

    let sentCount = 0;

    for (const recipient of uniqueRecipients) {
      try {
        await sendNotification({
          to: recipient,
          subject: 'Daily occupancy summary',
          message
        });
        sentCount += 1;
        console.log(`✓ Occupancy summary sent to ${recipient}`);
      } catch (err) {
        const errorMsg = `Failed to send occupancy summary to ${recipient}: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return { 
      totalProperties: properties.length, 
      totalBeds, 
      occupiedBeds, 
      occupancyRate,
      recipients: sentCount, 
      errors 
    };
  } catch (err) {
    console.error('❌ Fatal error in sendOccupancySummary:', err);
    throw err;
  }
};
