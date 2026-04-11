import { env } from '../config/env.js';

export const sendNotification = async ({ to, subject, message, channel = 'email' }) => {
  if (env.notificationProvider === 'console') {
    // eslint-disable-next-line no-console
    console.log(`[${channel}] To: ${to} | ${subject} | ${message}`);
    return { success: true };
  }

  // Plug in Twilio / Email providers here.
  return { success: true };
};
