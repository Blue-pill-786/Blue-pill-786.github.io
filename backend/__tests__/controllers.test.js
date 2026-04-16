/**
 * Production Test Suite - Validates all controllers with real data
 * Run: npm test (after configuring Jest in package.json)
 */

import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

const API_URL = process.env.API_TEST_URL || 'http://localhost:5000/api';

/**
 * Test data generators
 */
const generateTestData = {
  user: () => ({
    name: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '+919876543210',
    password: 'TestPassword123!',
    role: 'tenant',
  }),

  property: () => ({
    name: `Property ${Date.now()}`,
    code: `PROP${Date.now()}`,
    city: 'Delhi',
    address: 'Test Address, Delhi',
    latitude: 28.7041,
    longitude: 77.1025,
    totalFloors: 3,
    totalRooms: 12,
    totalBeds: 24,
  }),

  tenant: (userId, propertyId) => ({
    userId,
    propertyId,
    monthlyRent: 25000,
    leaseStartDate: new Date().toISOString(),
    leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    emergencyContact: {
      name: 'Emergency Contact',
      phone: '+919876543210',
      relation: 'Parent',
    },
  }),

  invoice: (tenantId) => ({
    tenantId,
    billingMonth: new Date().toISOString(),
    baseAmount: 25000,
    maintenance: 500,
    utilities: 300,
    tax: 1500,
  }),

  complaint: () => ({
    title: 'Test Complaint for Water Issue',
    description: 'Testing complaint submission for maintenance issues',
    category: 'maintenance',
  }),
};

/**
 * ====================== AUTH TESTS ======================
 */
describe('Authentication Endpoints', () => {
  let token = '';
  let userId = '';
  const testUser = generateTestData.user();

  it('POST /auth/register - Should register new user', async () => {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.token).toBeDefined();
    expect(response.data.data.user.email).toBe(testUser.email);

    token = response.data.data.token;
    userId = response.data.data.user._id;
  });

  it('POST /auth/login - Should login user', async () => {
    const loginData = {
      email: testUser.email,
      password: testUser.password,
    };

    const response = await axios.post(`${API_URL}/auth/login`, loginData);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.token).toBeDefined();
  });

  it('GET /auth/me - Should get current user profile', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data._id).toBe(userId);
  });

  it('PUT /auth/profile - Should update profile', async () => {
    const updateData = {
      name: 'Updated Name',
      phone: '+919876543211',
    };

    const response = await axios.put(`${API_URL}/auth/profile`, updateData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('POST /auth/password - Should change password', async () => {
    const passwordData = {
      currentPassword: testUser.password,
      newPassword: 'NewPassword123!',
      newPasswordConfirm: 'NewPassword123!',
    };

    const response = await axios.post(`${API_URL}/auth/password`, passwordData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

/**
 * ====================== PROPERTY TESTS ======================
 */
describe('Property Management Endpoints', () => {
  let adminToken = '';
  let adminUserId = '';
  let propertyId = '';

  beforeAll(async () => {
    // Create admin user
    const adminUser = generateTestData.user();
    adminUser.role = 'admin';

    const registerRes = await axios.post(`${API_URL}/auth/register`, adminUser);
    adminToken = registerRes.data.data.token;
    adminUserId = registerRes.data.data.user._id;
  });

  const testProperty = generateTestData.property();

  it('POST /admin/properties - Should create property', async () => {
    const response = await axios.post(`${API_URL}/admin/properties`, testProperty, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.name).toBe(testProperty.name);

    propertyId = response.data.data._id;
  });

  it('GET /admin/properties - Should list properties', async () => {
    const response = await axios.get(`${API_URL}/admin/properties`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('GET /admin/properties/:id - Should get property details', async () => {
    const response = await axios.get(`${API_URL}/admin/properties/${propertyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data._id).toBe(propertyId);
  });

  it('PUT /admin/properties/:id - Should update property', async () => {
    const updateData = { name: 'Updated Property Name' };

    const response = await axios.put(
      `${API_URL}/admin/properties/${propertyId}`,
      updateData,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('GET /admin/properties/stats/organization - Should get org stats', async () => {
    const response = await axios.get(`${API_URL}/admin/properties/stats/organization`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.totalProperties).toBeDefined();
  });
});

/**
 * ====================== TENANT TESTS ======================
 */
describe('Tenant Management Endpoints', () => {
  let tenantToken = '';
  let tenantUserId = '';
  let propertyId = '';
  let tenantId = '';

  beforeAll(async () => {
    // Create property first
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    const adminToken = adminRes.data.data.token;

    const propRes = await axios.post(
      `${API_URL}/admin/properties`,
      generateTestData.property(),
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    propertyId = propRes.data.data._id;

    // Create tenant user
    const tenantRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'tenant',
    });
    tenantToken = tenantRes.data.data.token;
    tenantUserId = tenantRes.data.data.user._id;
  });

  it('POST /admin/tenants - Should create tenant', async () => {
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    const tenantData = generateTestData.tenant(tenantUserId, propertyId);

    const response = await axios.post(`${API_URL}/admin/tenants`, tenantData, {
      headers: { Authorization: `Bearer ${adminRes.data.data.token}` },
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    tenantId = response.data.data._id;
  });

  it('GET /admin/tenants - Should list tenants', async () => {
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    const response = await axios.get(`${API_URL}/admin/tenants`, {
      headers: { Authorization: `Bearer ${adminRes.data.data.token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('GET /admin/tenants/stats - Should get tenant statistics', async () => {
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    const response = await axios.get(`${API_URL}/admin/tenants/stats`, {
      headers: { Authorization: `Bearer ${adminRes.data.data.token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.totalTenants).toBeDefined();
  });

  it('GET /tenant/profile - Should get tenant profile', async () => {
    const response = await axios.get(`${API_URL}/tenant/profile`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

/**
 * ====================== PAYMENT TESTS ======================
 */
describe('Payment Endpoints', () => {
  let token = '';

  beforeAll(async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'tenant',
    });
    token = res.data.data.token;
  });

  it('GET /payments/my - Should list tenant payments', async () => {
    const response = await axios.get(`${API_URL}/payments/my`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('GET /payments/stats - Should get payment statistics', async () => {
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    const response = await axios.get(`${API_URL}/payments/stats`, {
      headers: { Authorization: `Bearer ${adminRes.data.data.token}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

/**
 * ====================== DASHBOARD TESTS ======================
 */
describe('Dashboard Endpoints', () => {
  let tenantToken = '';
  let adminToken = '';

  beforeAll(async () => {
    const tenantRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'tenant',
    });
    tenantToken = tenantRes.data.data.token;

    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });
    adminToken = adminRes.data.data.token;
  });

  it('GET /admin/dashboard/tenant - Should get tenant dashboard', async () => {
    const response = await axios.get(`${API_URL}/admin/dashboard/tenant`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('GET /admin/dashboard - Should get admin dashboard', async () => {
    const response = await axios.get(`${API_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.summary).toBeDefined();
  });

  it('GET /admin/dashboard/stats - Should get organization stats', async () => {
    const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

/**
 * ====================== REPORT TESTS ======================
 */
describe('Report Endpoints', () => {
  let adminToken = '';

  beforeAll(async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });
    adminToken = res.data.data.token;
  });

  it('GET /admin/reports/monthly - Should get monthly report', async () => {
    const response = await axios.get(`${API_URL}/admin/reports/monthly`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.month).toBeDefined();
  });

  it('GET /admin/reports/occupancy - Should get occupancy report', async () => {
    const response = await axios.get(`${API_URL}/admin/reports/occupancy`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('GET /admin/reports/collection - Should get collection report', async () => {
    const response = await axios.get(`${API_URL}/admin/reports/collection`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

/**
 * ====================== ERROR HANDLING TESTS ======================
 */
describe('Error Handling', () => {
  it('Should return 401 for missing token', async () => {
    try {
      await axios.get(`${API_URL}/tenant/dashboard`);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it('Should return 400 for invalid registration data', async () => {
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'invalidemail',
        password: 'short',
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

  it('Should return 404 for non-existent resource', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, generateTestData.user());
    const token = res.data.data.token;

    try {
      await axios.get(`${API_URL}/admin/properties/nonexistentid`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });

  it('Should handle validation errors properly', async () => {
    const res = await axios.post(`${API_URL}/auth/register`, {
      ...generateTestData.user(),
      role: 'admin',
    });

    try {
      await axios.post(
        `${API_URL}/admin/properties`,
        { name: 'Test' }, // Missing required fields
        {
          headers: { Authorization: `Bearer ${res.data.data.token}` },
        }
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
});
