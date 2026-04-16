import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://ubair:L0lfy5sxTYOZVEjW@cluster0.sgmna1f.mongodb.net/?appName=Cluster0',
  mongoTlsAllowInvalidCertificates: process.env.MONGO_TLS_ALLOW_INVALID_CERTS === 'true',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || '',
  stripeKey: process.env.STRIPE_SECRET_KEY || 'sk_test_51PoxfPP3XKTw9xnDMD2jrq0JOGBixTnvnmfN6vhFWL4lEyNFYHZr7XG00FZ3U7saS9lbxxy6F84Bf7zrkGMr6FdY00C1zUaWcP',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  enableCronJobs: process.env.ENABLE_CRON_JOBS !== 'false',
  emailFrom: process.env.EMAIL_FROM || 'noreply@pgmanager.app',
  emailHost: process.env.EMAIL_HOST || '',
  emailPort: Number(process.env.EMAIL_PORT || 587),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  twilioSid: process.env.TWILIO_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',
  notificationProvider: process.env.NOTIFICATION_PROVIDER || 'console',
  adminEmail: process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || '',
  cronTimezone: process.env.CRON_TIMEZONE || 'UTC'
};
