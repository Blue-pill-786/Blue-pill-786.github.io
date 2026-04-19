import dotenv from 'dotenv';

dotenv.config();

// Validate critical environment variables
const validateEnv = () => {
  const requiredInProduction = ['JWT_SECRET', 'MONGO_URI'];
  if (process.env.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter(key => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || '',
  mongoTlsAllowInvalidCertificates: process.env.MONGO_TLS_ALLOW_INVALID_CERTS === 'true',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL || '',
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
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

// Validate on startup
validateEnv();
