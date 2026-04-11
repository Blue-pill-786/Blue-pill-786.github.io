import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import tenantRoutes from './routes/tenant.js';
import paymentRoutes from './routes/payments.js';
import { initCronJobs } from './jobs/cron.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(err.statusCode || 500).json({ message: err.message || 'Internal server error' });
});

const start = async () => {
  await connectDB();
  // initCronJobs();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on port ${env.port}`);
  });
};

start();
