import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config(); // ✅ LOAD FIRST (IMPORTANT)

import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenant.js';
import paymentRoutes from './routes/payments.js';
import paymentProcessorRoutes from './routes/paymentProcessor.js';
import saasRoutes from './routes/saas.js';
import adminRoutes from './routes/admin/index.js';
import advancedSearchRoutes from './routes/advancedSearch.js';
import reportRoutes from './routes/reports.js';

import { initCronJobs } from './jobs/cron.js';

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(helmet());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173']; // Default for local development

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-request-id'
  ],
}));
app.use(express.json({ limit: '10mb' }));

/* ================= HEALTH ================= */

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/* ================= ROUTES ================= */

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-processor', paymentProcessorRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/search', advancedSearchRoutes);
app.use('/api/admin/reports', reportRoutes);

app.use('/api/admin', adminRoutes);

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

/* ================= ERROR ================= */

app.use(errorHandler);

/* ================= START ================= */

const PORT = process.env.PORT || 4000; // ✅ SAFE FALLBACK

const start = async () => {
  try {
    await connectDB();

    if (process.env.ENABLE_CRON === 'true') {
      initCronJobs();
      console.log('⏰ Cron jobs enabled');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};



start();