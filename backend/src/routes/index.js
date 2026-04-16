import authRoutes from './auth.js';
import tenantRoutes from './tenant.js';
import paymentRoutes from './payments.js';
import expenseRoutes from './expenses.js';
import paymentProcessorRoutes from './paymentProcessor.js';
import saasRoutes from './saas.js';
import adminRoutes from './admin/index.js';

/**
 * Register all API routes
 * All admin routes auto-protected with /api/admin middleware
 */
export const registerRoutes = (app) => {
  // Public routes
  app.use('/api/auth', authRoutes);
  
  // Tenant routes (protected)
  app.use('/api/tenant', tenantRoutes);
  
  // Payment routes (protected)
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payment-processor', paymentProcessorRoutes);
  
  // Expense routes (protected)
  app.use('/api/expenses', expenseRoutes);
  
  // SaaS routes (protected)
  app.use('/api/saas', saasRoutes);
  
  // Admin routes (auto-protected + authorized with admin/manager/owner)
  app.use('/api/admin', adminRoutes);
};