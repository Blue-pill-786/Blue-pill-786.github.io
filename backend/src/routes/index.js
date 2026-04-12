import authRoutes from './auth.js';
import tenantRoutes from './tenant.js';
import paymentRoutes from './payments.js';

import adminDashboard from './admin/dashboard.js';
import adminProperty from './admin/property.js';
import adminTenant from './admin/tenant.js';
import adminReport from './admin/report.js';

export const registerRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/payments', paymentRoutes);

  app.use('/api/admin/dashboard', adminDashboard);
  app.use('/api/admin/property', adminProperty);
  app.use('/api/admin/tenant', adminTenant);
  app.use('/api/admin/report', adminReport);
};