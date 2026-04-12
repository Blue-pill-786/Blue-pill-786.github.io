import cron from 'node-cron';
import dayjs from 'dayjs';
import { env } from '../config/env.js';
import { applyLateFees, generateMonthlyRent, sendDueReminders, sendOverdueAlerts, sendOccupancySummary } from '../services/rentScheduler.js';

export const initCronJobs = () => {
  const execute = async (jobName, fn) => {
    try {
      await fn();
      console.log(`✅ Cron job completed: ${jobName}`);
    } catch (err) {
      console.error(`❌ Cron job error (${jobName}):`, err);
    }
  };

  // 1st of every month at 00:05
  cron.schedule('5 0 1 * *', () => {
    execute('generateMonthlyRent', async () => await generateMonthlyRent(dayjs()));
  }, { timezone: env.cronTimezone });

  // Daily late fee calculation at 01:00
  cron.schedule('0 1 * * *', () => {
    execute('applyLateFees', async () => await applyLateFees(dayjs()));
  }, { timezone: env.cronTimezone });

  // Daily reminders at 09:00 (2 days before due)
  cron.schedule('0 9 * * *', () => {
    execute('sendDueReminders', async () => await sendDueReminders(2, dayjs()));
  }, { timezone: env.cronTimezone });

  // Daily overdue alerts at 09:15
  cron.schedule('15 9 * * *', () => {
    execute('sendOverdueAlerts', async () => await sendOverdueAlerts(dayjs()));
  }, { timezone: env.cronTimezone });

  // Daily occupancy summary at 10:00
  cron.schedule('0 10 * * *', () => {
    execute('sendOccupancySummary', async () => await sendOccupancySummary(dayjs()));
  }, { timezone: env.cronTimezone });
};
