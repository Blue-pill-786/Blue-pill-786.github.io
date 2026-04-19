import cron from 'node-cron';
import dayjs from 'dayjs';
import { env } from '../config/env.js';
import { applyLateFees, generateMonthlyRent, sendDueReminders, sendOverdueAlerts, sendOccupancySummary } from '../services/rentScheduler.js';

/**
 * Cron job execution wrapper with comprehensive logging and error handling
 */
const execute = async (jobName, fn, retries = 1) => {
  const startTime = Date.now();
  let attempt = 0;

  while (attempt < retries) {
    attempt++;
    try {
      console.log(`\n⏳ [${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Starting cron job: ${jobName} (Attempt ${attempt}/${retries})`);
      
      const result = await fn();
      const duration = Date.now() - startTime;
      
      console.log(`✅ [${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Cron job completed: ${jobName}`);
      console.log(`   Result: ${JSON.stringify(result)}`);
      console.log(`   Duration: ${duration}ms\n`);
      
      return result;
    } catch (err) {
      console.error(`❌ [${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Error in cron job: ${jobName}`);
      console.error(`   Error: ${err.message}`);
      console.error(`   Stack: ${err.stack}`);
      
      if (attempt < retries) {
        const delayMs = Math.min(1000 * attempt * 2, 10000); // Exponential backoff, max 10s
        console.log(`⏳ Retrying in ${delayMs}ms...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error(`🔥 Max retries (${retries}) exceeded for ${jobName}\n`);
        return null;
      }
    }
  }
};

export const initCronJobs = () => {
  console.log(`🚀 Initializing cron jobs with timezone: ${env.cronTimezone}`);

  // 1st of every month at 00:05 - Generate monthly rent invoices
  cron.schedule('5 0 1 * *', () => {
    execute('generateMonthlyRent', async () => await generateMonthlyRent(dayjs()), 2);
  }, { timezone: env.cronTimezone });

  // Daily late fee calculation at 01:00
  cron.schedule('0 1 * * *', () => {
    execute('applyLateFees', async () => await applyLateFees(dayjs()), 2);
  }, { timezone: env.cronTimezone });

  // Daily reminders at 09:00 (2 days before due)
  cron.schedule('0 9 * * *', () => {
    execute('sendDueReminders', async () => await sendDueReminders(2, dayjs()), 1);
  }, { timezone: env.cronTimezone });

  // Daily overdue alerts at 09:15
  cron.schedule('15 9 * * *', () => {
    execute('sendOverdueAlerts', async () => await sendOverdueAlerts(dayjs()), 1);
  }, { timezone: env.cronTimezone });

  // Daily occupancy summary at 10:00
  cron.schedule('0 10 * * *', () => {
    execute('sendOccupancySummary', async () => await sendOccupancySummary(), 1);
  }, { timezone: env.cronTimezone });

  console.log(`✨ All cron jobs initialized successfully\n`);
};
