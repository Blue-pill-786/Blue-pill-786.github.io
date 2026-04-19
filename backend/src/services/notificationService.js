import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { env } from '../config/env.js';

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailPort === 465,
    auth: {
      user: env.emailUser,
      pass: env.emailPass
    }
  });
};

export const sendNotification = async ({ to, subject, message, channel = 'email' }) => {
  if (env.notificationProvider === 'console' || !env.emailHost || !env.emailUser) {
    console.log(`[${channel}] To: ${to} | ${subject} | ${message}`);
    return { success: true };
  }

  if (env.notificationProvider === 'email') {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      text: message,
      html: `<p>${message}</p>`
    });
    return { success: true };
  }

  if (env.notificationProvider === 'twilio') {
    const client = twilio(env.twilioSid, env.twilioAuthToken);
    await client.messages.create({
      body: `${subject}: ${message}`,
      from: env.twilioFrom,
      to
    });
    return { success: true };
  }

  console.log(`[${channel}] To: ${to} | ${subject} | ${message}`);
  return { success: true };
};
