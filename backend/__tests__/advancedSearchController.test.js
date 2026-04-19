/**
 * Advanced Search Controller Tests - Phase 2
 * Tests for API endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const advancedSearchService = require('../services/advancedSearchService');

// Mock the search service
jest.mock('../services/advancedSearchService');

describe('Advanced Search Controller', () => {
  let app, authToken, testUser, testOrg;

  beforeAll(async () => {
    app = require('../server');

    testOrg = await mongoose.model('Organization').create({
      name: 'Controller Test Org',
    });

    testUser = await mongoose.model('User').create({
      email: 'search-ctrl@test.com',
      password: 'Test123!@#',
      organization: testOrg._id,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'search-ctrl@test.com', password: 'Test123!@#' });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await mongoose.model('User').deleteMany();
    await mongoose.model('Organization').deleteMany();
  });

  describe('Document Search Endpoint', () => {
    it('should return search results', async () => {
      advancedSearchService.advancedSearch.mockResolvedValueOnce({
        data: [{ id: '1', filename: 'test.pdf' }],
        total: 1,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/documents?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta.total).toBe(1);
    });

    it('should accept filters as query params', async () => {
      advancedSearchService.advancedSearch.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/documents?query=test&category=receipts&tags=important')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(advancedSearchService.advancedSearch).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      advancedSearchService.advancedSearch.mockResolvedValueOnce({
        data: [],
        total: 50,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/documents?query=test&limit=20&offset=20')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/search/documents?query=test');

      expect(res.status).toBe(401);
    });
  });

  describe('Properties Search Endpoint', () => {
    it('should search properties', async () => {
      advancedSearchService.searchProperties.mockResolvedValueOnce({
        data: [{ id: '1', name: 'Test Property' }],
        total: 1,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/properties?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should filter by location', async () => {
      advancedSearchService.searchProperties.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/properties?city=New%20York&state=NY')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by amenities', async () => {
      advancedSearchService.searchProperties.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/properties?amenities=wifi,parking')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Invoices Search Endpoint', () => {
    it('should search invoices', async () => {
      advancedSearchService.searchInvoices.mockResolvedValueOnce({
        data: [{ id: '1', invoiceNumber: 'INV-001' }],
        total: 1,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/invoices?query=INV')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by status', async () => {
      advancedSearchService.searchInvoices.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/invoices?status=overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by amount range', async () => {
      advancedSearchService.searchInvoices.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/invoices?minAmount=1000&maxAmount=5000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Tenants Search Endpoint', () => {
    it('should search tenants', async () => {
      advancedSearchService.searchTenants.mockResolvedValueOnce({
        data: [{ id: '1', name: 'John Doe' }],
        total: 1,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/tenants?query=John')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter by status', async () => {
      advancedSearchService.searchTenants.mockResolvedValueOnce({
        data: [],
        total: 0,
        facets: {},
      });

      const res = await request(app)
        .get('/api/search/tenants?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Global Search Endpoint', () => {
    it('should search all entities', async () => {
      advancedSearchService.globalSearch.mockResolvedValueOnce({
        documents: { data: [], total: 0 },
        properties: { data: [], total: 0 },
        invoices: { data: [], total: 0 },
        tenants: { data: [], total: 0 },
      });

      const res = await request(app)
        .get('/api/search/global?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should require query parameter', async () => {
      const res = await request(app)
        .get('/api/search/global')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Autocomplete Suggestions Endpoint', () => {
    it('should return suggestions', async () => {
      advancedSearchService.getAutocompleteSuggestions.mockResolvedValueOnce([
        { text: 'lease agreement', count: 5 },
        { text: 'lease renewal', count: 3 },
      ]);

      const res = await request(app)
        .get('/api/search/suggestions?field=filename&prefix=lease')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should validate required parameters', async () => {
      const res = await request(app)
        .get('/api/search/suggestions?field=filename')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should validate field parameter', async () => {
      const res = await request(app)
        .get('/api/search/suggestions?field=invalid&prefix=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Facets Endpoint', () => {
    it('should return facets for documents', async () => {
      const res = await request(app)
        .get('/api/search/facets?type=documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should return facets for properties', async () => {
      const res = await request(app)
        .get('/api/search/facets?type=properties')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should return default facets', async () => {
      const res = await request(app)
        .get('/api/search/facets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Advanced Search Endpoint', () => {
    it('should accept POST with filters', async () => {
      advancedSearchService.advancedSearch.mockResolvedValueOnce({
        documents: [],
        facets: {},
        total: 0,
      });

      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'lease',
          category: 'tenant_documents',
          tags: ['important'],
          sortBy: 'date',
          limit: 20,
        });

      expect(res.status).toBe(200);
    });

    it('should support sorting', async () => {
      advancedSearchService.advancedSearch.mockResolvedValueOnce({
        documents: [],
        facets: {},
        total: 0,
      });

      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test',
          sortBy: 'date',
          sortOrder: 'asc',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('Saved Searches Endpoints', () => {
    it('should save search', async () => {
      const res = await request(app)
        .post('/api/search/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My Search',
          query: 'important docs',
          filters: { category: 'receipts' },
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
    });

    it('should get saved searches', async () => {
      const res = await request(app)
        .get('/api/search/saved-list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Admin Endpoints', () => {
    it('should initialize search (admin only)', async () => {
      // Need admin user
      await mongoose.model('User').findByIdAndUpdate(testUser._id, { role: 'admin' });

      advancedSearchService.initializeIndices.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/search/initialize')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject non-admin for initialize', async () => {
      await mongoose.model('User').findByIdAndUpdate(testUser._id, { role: 'user' });

      const res = await request(app)
        .post('/api/search/initialize')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should reindex data (admin only)', async () => {
      await mongoose.model('User').findByIdAndUpdate(testUser._id, { role: 'admin' });

      advancedSearchService.client = {
        bulk: jest.fn().mockResolvedValue({}),
      };

      const res = await request(app)
        .post('/api/search/reindex')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      advancedSearchService.healthCheck.mockResolvedValueOnce({
        status: 'green',
        nodes: 1,
        dataNodes: 1,
      });

      const res = await request(app)
        .get('/api/search/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('status');
    });

    it('should detect unhealthy clusters', async () => {
      advancedSearchService.healthCheck.mockResolvedValueOnce({
        status: 'red',
        nodes: 0,
        error: 'Connection failed',
      });

      const res = await request(app)
        .get('/api/search/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('red');
    });
  });

  describe('Error Handling', () => {
    it('should handle search service errors', async () => {
      advancedSearchService.advancedSearch.mockRejectedValueOnce(
        new Error('Elasticsearch error'),
      );

      const res = await request(app)
        .get('/api/search/documents?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing parameters', async () => {
      const res = await request(app)
        .post('/api/search/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid JSON', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
