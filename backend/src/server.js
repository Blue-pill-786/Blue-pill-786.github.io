import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import tenantRoutes from './routes/tenant.js';
import paymentRoutes from './routes/payments.js';

import adminDashboardRoutes from './routes/admin/dashboard.js';
import adminPropertyRoutes from './routes/admin/property.js';
import adminTenantRoutes from './routes/admin/tenant.js';
import adminReportRoutes from './routes/admin/report.js';

import { initCronJobs } from './jobs/cron.js';

const app = express();

/* ================= MIDDLEWARE ================= */

// Security
app.use(helmet());

// Logging (dev only)
if (env.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// CORS
app.use(cors({
  origin: env.frontendUrl,
  credentials: true
}));

// Body parser
app.use(express.json());

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

/* ================= ADMIN ================= */

app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/properties', adminPropertyRoutes);
app.use('/api/admin/tenants', adminTenantRoutes);
app.use('/api/admin/reports', adminReportRoutes);

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

const start = async () => {
  try {
    await connectDB();

    if (env.enableCronJobs) {
      initCronJobs();
      console.log('⏰ Cron jobs enabled');
    }

    app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port}`);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();