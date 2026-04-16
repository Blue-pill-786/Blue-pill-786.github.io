/**
 * API Endpoints - Maps frontend requests to backend controllers
 * All endpoints use the centralized apiService with interceptors and error handling
 */

import apiService from './apiService.js';

/**
 * ====================== AUTH ENDPOINTS ======================
 */
export const authAPI = {
  register: (data) => apiService.post('/auth/register', data),
  login: (data) => apiService.post('/auth/login', data),
  logout: () => apiService.post('/auth/logout'),
  getMe: () => apiService.get('/auth/me'),
  updateProfile: (data) => apiService.put('/auth/profile', data),
  changePassword: (data) => apiService.post('/auth/password', data),
  enable2FA: () => apiService.post('/auth/2fa/enable'),
  verify2FA: (code) => apiService.post('/auth/2fa/verify', { code }),
};

/**
 * ====================== TENANT ENDPOINTS ======================
 */
export const tenantAPI = {
  // Dashboard
  getDashboard: () => apiService.get('/tenant/dashboard'),
  
  // Invoices
  getInvoices: (params = {}) => apiService.get('/tenant/invoices', { params }),
  getInvoiceDetail: (invoiceId) => apiService.get(`/tenant/invoices/${invoiceId}`),
  payInvoice: (invoiceId, data) => apiService.post(`/tenant/invoices/${invoiceId}/pay`, data),
  
  // Complaints
  submitComplaint: (data) => apiService.post('/tenant/complaints', data),
  
  // Profile
  getProfile: () => apiService.get('/tenant/profile'),
  updateProfile: (data) => apiService.put('/tenant/profile', data),
};

/**
 * ====================== ADMIN - DASHBOARD ENDPOINTS ======================
 */
export const adminDashboardAPI = {
  getAdminDashboard: () => apiService.get('/admin/dashboard/admin'),
  getTenantDashboard: () => apiService.get('/admin/dashboard/tenant'),
  getStats: () => apiService.get('/admin/dashboard/stats'),
};

/**
 * ====================== ADMIN - TENANT ENDPOINTS ======================
 */
export const adminTenantAPI = {
  getAllTenants: (params = {}) => apiService.get('/admin/tenants', { params }),
  getTenantStats: () => apiService.get('/admin/tenants/stats'),
  createTenant: (data) => apiService.post('/admin/tenants', data),
  updateTenant: (tenantId, data) => apiService.put(`/admin/tenants/${tenantId}`, data),
  deactivateTenant: (tenantId, data) => apiService.delete(`/admin/tenants/${tenantId}`, { data }),
};

/**
 * ====================== ADMIN - PROPERTY ENDPOINTS ======================
 */
export const adminPropertyAPI = {
  getAllProperties: (params = {}) => apiService.get('/admin/properties', { params }),
  getProperty: (propertyId) => apiService.get(`/admin/properties/${propertyId}`),
  createProperty: (data) => apiService.post('/admin/properties', data),
  updateProperty: (propertyId, data) => apiService.put(`/admin/properties/${propertyId}`, data),
  deleteProperty: (propertyId) => apiService.delete(`/admin/properties/${propertyId}`),
  getPropertyStats: (propertyId) => apiService.get(`/admin/properties/${propertyId}/stats`),
  updateOccupancyStats: (propertyId) => apiService.patch(`/admin/properties/${propertyId}/occupancy`),
  getFinancialSummary: (propertyId, params) => 
    apiService.get(`/admin/properties/${propertyId}/financial`, { params }),
  getOrganizationStats: () => apiService.get('/admin/properties/stats/organization'),
};

/**
 * ====================== PAYMENT ENDPOINTS ======================
 */
export const paymentAPI = {
  // Tenant payments
  getMyPayments: (params = {}) => apiService.get('/payments/my', { params }),
  getInvoice: (invoiceId) => apiService.get(`/payments/${invoiceId}`),
  markAsPaid: (data) => apiService.post('/payments/pay', data),
  
  // Admin - Invoice management
  createInvoice: (data) => apiService.post('/payments/admin', data),
  adjustInvoice: (invoiceId, data) => apiService.patch(`/payments/admin/${invoiceId}`, data),
  cancelInvoice: (invoiceId, data) => apiService.delete(`/payments/admin/${invoiceId}`, { data }),
  
  // Admin - Collection
  getAllPayments: (params = {}) => apiService.get('/payments/all', { params }),
  getPaymentStats: () => apiService.get('/payments/stats'),
};

/**
 * ====================== REPORT ENDPOINTS ======================
 */
export const reportAPI = {
  getMonthlyReport: (params = {}) => apiService.get('/admin/reports/monthly', { params }),
  getQuarterlyReport: (params = {}) => apiService.get('/admin/reports/quarterly', { params }),
  getOccupancyReport: () => apiService.get('/admin/reports/occupancy'),
  getCollectionReport: (params = {}) => apiService.get('/admin/reports/collection', { params }),
};

/**
 * ====================== PAYMENT PROCESSOR ENDPOINTS (Stripe/Razorpay) ======================
 */
export const paymentProcessorAPI = {
  // Stripe
  createPaymentIntent: (data) => apiService.post('/payment-processor/stripe/intent', data),
  getStripePaymentStatus: (paymentIntentId) => 
    apiService.get(`/payment-processor/stripe/status/${paymentIntentId}`),

  // Razorpay
  createRazorpayOrder: (data) => apiService.post('/payment-processor/razorpay/order', data),
  verifyRazorpaySignature: (data) => apiService.post('/payment-processor/razorpay/verify', data),

  // Payment Management
  listPayments: (params = {}) => apiService.get('/payment-processor/list', { params }),
  refundPayment: (data) => apiService.post('/payment-processor/refund', data),
};

/**
 * ====================== SAAS ENDPOINTS ======================
 */
export const saasAPI = {
  // Organization
  signupOrganization: (data) => apiService.post('/saas/signup', data),
  getOrganization: () => apiService.get('/saas/details'),
  updateOrganization: (data) => apiService.put('/saas/update', data),
  
  // Pricing & Tiers
  getPricing: () => apiService.get('/saas/pricing'),
  upgradeTier: (data) => apiService.post('/saas/upgrade', data),
  downgradeTier: (data) => apiService.post('/saas/downgrade', data),
  
  // Billing & Usage
  getUsage: () => apiService.get('/saas/usage'),
  getBillingHistory: (params = {}) => apiService.get('/saas/billing-history', { params }),
  cancelSubscription: (data) => apiService.post('/saas/cancel', data),
};

/**
 * ====================== COMBINED API OBJECT ======================
 * Usage: import { api } from '@/lib/endpoints'
 * api.tenant.getDashboard()
 * api.admin.tenant.getAllTenants()
 * api.payments.getMyPayments()
 * api.saas.getOrganization()
 * api.paymentProcessor.createPaymentIntent()
 */
export const api = {
  auth: authAPI,
  tenant: tenantAPI,
  admin: {
    dashboard: adminDashboardAPI,
    tenant: adminTenantAPI,
    property: adminPropertyAPI,
  },
  payments: paymentAPI,
  reports: reportAPI,
  saas: saasAPI,
  paymentProcessor: paymentProcessorAPI,
};

export default api;
