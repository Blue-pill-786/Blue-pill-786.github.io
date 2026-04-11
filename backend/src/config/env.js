import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://ubairwani_db_user:QDp5mqtq9q6rJjbx@cluster0.sgmna1f.mongodb.net/?appName=Cluster0',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  redisUrl: process.env.REDIS_URL || '',
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@pgmanager.app',
  notificationProvider: process.env.NOTIFICATION_PROVIDER || 'console'
};
