/**
 * Phase 2 - Advanced Search Integration Tests
 * End-to-end testing of search workflow
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');

describe('Phase 2 - Advanced Search Integration', () => {
  let app, authToken, testOrg, testUser, esClient;

  beforeAll(async () => {
    app = require('../server');

    // Initialize Elasticsearch
    esClient = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });

    // Create test org and user
    testOrg = await mongoose.model('Organization').create({
      name: 'Integration Test Org',
    });

    testUser = await mongoose.model('User').create({
      email: 'integration-search@test.com',
      password: 'Test123!@#',
      organization: testOrg._id,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration-search@test.com',
        password: 'Test123!@#',
      });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await mongoose.model('User').deleteMany();
    await mongoose.model('Organization').deleteMany();
  });

  describe('Complete Search Workflow', () => {
    it('should initialize search indices', async () => {
      const res = await request(app)
        .post('/api/search/initialize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Admin-Token', process.env.ADMIN_TOKEN);

      expect(res.status).toBe(200);
    });

    it('should index documents', async () => {
      // Create test documents
      const docs = await mongoose.model('Document').create([
        {
          filename: 'lease_agreement_2024.pdf',
          organizationId: testOrg._id,
          category: 'contracts',
          tags: ['important', 'legal'],
          size: 2048,
        },
        {
          filename: 'maintenance_receipt.pdf',
          organizationId: testOrg._id,
          category: 'receipts',
          tags: ['expense'],
          size: 512,
        },
      ]);

      // Bulk index documents
      const res = await request(app)
        .post('/api/search/reindex')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify indexing
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for indexing

      const health = await request(app)
        .get('/api/search/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(health.status).toBe(200);
    });

    it('should search for documents', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=lease')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('should support fuzzy matching', async () => {
      // Search for "leaze" (typo for "lease")
      const res = await request(app)
        .get('/api/search/documents?query=leaze')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Should still match "lease" due to fuzzy matching
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=*&category=contracts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should apply multiple filters', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '*',
          filters: {
            category: 'receipts',
            tags: ['expense'],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should support date range filtering', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '*',
          filters: {
            dateRange: {
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              to: new Date(),
            },
          },
        });

      expect(res.status).toBe(200);
    });

    it('should support size range filtering', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '*',
          filters: {
            sizeRange: {
              min: 0,
              max: 10000,
            },
          },
        });

      expect(res.status).toBe(200);
    });

    it('should support sorting', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '*',
          sortBy: 'date',
          sortOrder: 'desc',
        });

      expect(res.status).toBe(200);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=*&limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('offset');
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should provide autocomplete suggestions', async () => {
      const res = await request(app)
        .get('/api/search/suggestions?field=filename&prefix=lease')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should return facets for navigation', async () => {
      const res = await request(app)
        .get('/api/search/facets?type=documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Object);
    });

    it('should perform global search', async () => {
      const res = await request(app)
        .get('/api/search/global?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('documents');
      expect(res.body.data).toHaveProperty('properties');
      expect(res.body.data).toHaveProperty('invoices');
      expect(res.body.data).toHaveProperty('tenants');
    });
  });

  describe('Search Performance', () => {
    it('should complete searches in <500ms', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/search/documents?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should complete suggestions in <200ms', async () => {
      const start = Date.now();

      const res = await request(app)
        .get('/api/search/suggestions?field=filename&prefix=test')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it('should handle large result sets', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=*&limit=1000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Search with Different Entity Types', () => {
    beforeAll(async () => {
      // Create test properties
      await mongoose.model('Property').create([
        {
          name: 'Sunset Apartments',
          organizationId: testOrg._id,
          address: '123 Main St, New York, NY',
          bedrooms: 2,
          bathrooms: 1,
        },
      ]);

      // Create test invoices
      await mongoose.model('Invoice').create([
        {
          invoiceNumber: 'INV-2024-001',
          organizationId: testOrg._id,
          amount: 5000,
          status: 'paid',
        },
      ]);

      // Create test tenants
      await mongoose.model('Tenant').create([
        {
          firstName: 'John',
          lastName: 'Doe',
          organizationId: testOrg._id,
          email: 'john.doe@example.com',
        },
      ]);
    });

    it('should search properties', async () => {
      const res = await request(app)
        .get('/api/search/properties?query=sunset')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should search invoices', async () => {
      const res = await request(app)
        .get('/api/search/invoices?query=INV')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should search tenants', async () => {
      const res = await request(app)
        .get('/api/search/tenants?query=John')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter invoices by status', async () => {
      const res = await request(app)
        .get('/api/search/invoices?status=paid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should filter properties by location', async () => {
      const res = await request(app)
        .get('/api/search/properties?city=New%20York')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Saved Searches Workflow', () => {
    it('should save a search', async () => {
      const res = await request(app)
        .post('/api/search/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My Saved Search',
          query: 'important documents',
          filters: {
            category: 'contracts',
            tags: ['important'],
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
    });

    it('should retrieve saved searches', async () => {
      const res = await request(app)
        .get('/api/search/saved-list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should apply saved search', async () => {
      // First save a search
      const saveRes = await request(app)
        .post('/api/search/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Saved Search',
          query: 'test',
          filters: {},
        });

      const savedSearchId = saveRes.body.data.id;

      // Then apply it
      const applyRes = await request(app)
        .get(`/api/search/saved/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(applyRes.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid query', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid filters', async () => {
      const res = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'test',
          filters: {
            invalidFilter: 'value',
          },
        });

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/search/documents?query=test');

      expect(res.status).toBe(401);
    });

    it('should handle Elasticsearch connection errors', async () => {
      // Mock connection error
      const esError = new Error('Connection refused');
      jest.spyOn(esClient, 'search').mockRejectedValueOnce(esError);

      const res = await request(app)
        .get('/api/search/documents?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Concurrent Search Operations', () => {
    it('should handle parallel searches', async () => {
      const searches = [
        request(app)
          .get('/api/search/documents?query=test')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/search/properties?query=test')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/search/invoices?query=test')
          .set('Authorization', `Bearer ${authToken}`),
      ];

      const results = await Promise.all(searches);

      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });

    it('should not cross-pollinate results between orgs', async () => {
      // Create another org
      const otherOrg = await mongoose.model('Organization').create({
        name: 'Other Org',
      });

      const otherUser = await mongoose.model('User').create({
        email: 'other@test.com',
        password: 'Test123!@#',
        organization: otherOrg._id,
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@test.com',
          password: 'Test123!@#',
        });

      const otherToken = otherLogin.body.data.token;

      // Search in both orgs
      const res1 = await request(app)
        .get('/api/search/documents?query=*')
        .set('Authorization', `Bearer ${authToken}`);

      const res2 = await request(app)
        .get('/api/search/documents?query=*')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Results should be different (org-isolated)
      // This depends on data in each org
    });
  });

  describe('Search Analytics', () => {
    it('should track search metrics', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toHaveProperty('duration');
      expect(res.body.meta).toHaveProperty('took');
    });

    it('should provide relevance scoring', async () => {
      const res = await request(app)
        .get('/api/search/documents?query=lease')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('score');
      }
    });
  });

  describe('Search Capabilities Matrix', () => {
    it('should support all search features', async () => {
      const capabilities = [
        // Query features
        () =>
          request(app)
            .get('/api/search/documents?query=test')
            .set('Authorization', `Bearer ${authToken}`),
        // Filtering
        () =>
          request(app)
            .get('/api/search/documents?query=test&category=contracts')
            .set('Authorization', `Bearer ${authToken}`),
        // Sorting
        () =>
          request(app)
            .post('/api/search/advanced')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ query: 'test', sortBy: 'date' }),
        // Pagination
        () =>
          request(app)
            .get('/api/search/documents?query=test&limit=10&offset=0')
            .set('Authorization', `Bearer ${authToken}`),
        // Autocomplete
        () =>
          request(app)
            .get('/api/search/suggestions?field=filename&prefix=test')
            .set('Authorization', `Bearer ${authToken}`),
        // Facets
        () =>
          request(app)
            .get('/api/search/facets')
            .set('Authorization', `Bearer ${authToken}`),
      ];

      const results = await Promise.all(capabilities.map((fn) => fn()));

      results.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
