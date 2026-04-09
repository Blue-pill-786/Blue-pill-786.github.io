import cron from 'node-cron';
import dayjs from 'dayjs';
import { applyLateFees, generateMonthlyRent, sendDueReminders } from '../services/rentScheduler.js';

export const initCronJobs = () => {
  // 1st of every month at 00:05 UTC
  cron.schedule('5 0 1 * *', async () => {
    await generateMonthlyRent(dayjs());
  });

  // Daily late fee calculation at 01:00 UTC
  cron.schedule('0 1 * * *', async () => {
    await applyLateFees(dayjs());
  });

  // Daily reminders at 09:00 UTC (2 days before due)
  cron.schedule('0 9 * * *', async () => {
    await sendDueReminders(2, dayjs());
  });
};
