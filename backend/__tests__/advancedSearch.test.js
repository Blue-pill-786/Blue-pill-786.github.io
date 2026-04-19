/**
 * Advanced Search Service Tests - Phase 2
 * Comprehensive tests for Elasticsearch integration
 */

const advancedSearchService = require('../services/advancedSearchService');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Property = require('../models/Property');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const Organization = require('../models/Organization');
const User = require('../models/User');

describe('Advanced Search Service - Elasticsearch', () => {
  let testOrg, client;

  beforeAll(async () => {
    // Create test org
    testOrg = await Organization.create({
      name: 'Search Test Org',
      owner: new mongoose.Types.ObjectId(),
    });

    // Initialize Elasticsearch
    await advancedSearchService.initializeIndices();
    client = advancedSearchService.client;
  });

  afterAll(async () => {
    // Cleanup
    try {
      await advancedSearchService.deleteIndex(advancedSearchService.indices.documents);
      await advancedSearchService.deleteIndex(advancedSearchService.indices.properties);
      await advancedSearchService.deleteIndex(advancedSearchService.indices.invoices);
      await advancedSearchService.deleteIndex(advancedSearchService.indices.tenants);
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  describe('Index Initialization', () => {
    it('should create document index with proper mappings', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.documents,
      });

      expect(indexInfo[advancedSearchService.indices.documents]).toBeDefined();

      const mappings =
        indexInfo[advancedSearchService.indices.documents].mappings.properties;

      expect(mappings.filename).toBeDefined();
      expect(mappings.category).toBeDefined();
      expect(mappings.tags).toBeDefined();
    });

    it('should have text analyzer for search fields', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.documents,
      });

      const mappings =
        indexInfo[advancedSearchService.indices.documents].mappings.properties;

      expect(mappings.filename.type).toBe('text');
      expect(mappings.description.type).toBe('text');
    });

    it('should have keyword fields for filtering', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.documents,
      });

      const mappings =
        indexInfo[advancedSearchService.indices.documents].mappings.properties;

      expect(mappings.category.type).toBe('keyword');
      expect(mappings.tags.type).toBe('keyword');
      expect(mappings.owner.type).toBe('keyword');
    });

    it('should create properties index', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.properties,
      });

      expect(indexInfo[advancedSearchService.indices.properties]).toBeDefined();
    });

    it('should create invoices index', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.invoices,
      });

      expect(indexInfo[advancedSearchService.indices.invoices]).toBeDefined();
    });

    it('should create tenants index', async () => {
      const indexInfo = await client.indices.get({
        index: advancedSearchService.indices.tenants,
      });

      expect(indexInfo[advancedSearchService.indices.tenants]).toBeDefined();
    });
  });

  describe('Document Indexing', () => {
    beforeEach(async () => {
      // Clear index
      try {
        await client.deleteByQuery({
          index: advancedSearchService.indices.documents,
          body: { query: { match_all: {} } },
        });
      } catch (error) {
        console.log('Index clear warning:', error.message);
      }
    });

    it('should index documents successfully', async () => {
      const docs = [
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'lease_agreement.pdf',
          originalName: 'lease_agreement.pdf',
          category: 'tenant_documents',
          tags: ['legal', 'important'],
          fileType: 'application/pdf',
          size: 250000,
          uploadedAt: new Date(),
        },
      ];

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);

      // Small delay for indexing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const count = await client.count({
        index: advancedSearchService.indices.documents,
      });

      expect(count.count).toBeGreaterThan(0);
    });

    it('should handle bulk indexing of multiple documents', async () => {
      const docs = Array(10)
        .fill(null)
        .map((_, i) => ({
          _id: new mongoose.Types.ObjectId(),
          filename: `document_${i}.pdf`,
          originalName: `document_${i}.pdf`,
          category: i % 2 === 0 ? 'receipts' : 'tenant_documents',
          tags: ['test'],
          fileType: 'application/pdf',
          size: 100000 * (i + 1),
          uploadedAt: new Date(),
        }));

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const count = await client.count({
        index: advancedSearchService.indices.documents,
      });

      expect(count.count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Advanced Search - Fuzzy Matching', () => {
    beforeAll(async () => {
      const docs = [
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'lease_agreement.pdf',
          originalName: 'lease_agreement.pdf',
          description: 'Lease agreement for property 123',
          category: 'tenant_documents',
          tags: ['legal', 'important'],
          fileType: 'application/pdf',
          size: 250000,
          uploadedAt: new Date(),
          owner: 'user123',
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'payment_receipt.pdf',
          originalName: 'payment_receipt.pdf',
          description: 'Monthly rent receipt',
          category: 'receipts',
          tags: ['financial'],
          fileType: 'application/pdf',
          size: 150000,
          uploadedAt: new Date(),
          owner: 'user123',
          organization: testOrg._id.toString(),
        },
      ];

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should find exact matches', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: 'lease' },
      );

      expect(results.data.length).toBeGreaterThan(0);
      expect(results.data[0].filename.toLowerCase()).toContain('lease');
    });

    it('should find matches with typos (fuzzy)', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: 'leas' }, // typo: missing 'e'
      );

      expect(results.data.length).toBeGreaterThan(0);
    });

    it('should find partial matches', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: 'pay' },
      );

      expect(results.data.length).toBeGreaterThan(0);
    });

    it('should rank results by relevance', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: 'receipt' },
      );

      expect(results.data.length).toBeGreaterThan(0);
      expect(results.data[0].score).toBeDefined();
      expect(results.data[0].score > 0).toBe(true);
    });
  });

  describe('Advanced Search - Filtering', () => {
    beforeAll(async () => {
      const docs = [
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc1.pdf',
          originalName: 'doc1.pdf',
          category: 'tenant_documents',
          tags: ['important'],
          fileType: 'application/pdf',
          size: 100000,
          uploadedAt: new Date('2024-01-01'),
          owner: 'user123',
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc2.pdf',
          originalName: 'doc2.pdf',
          category: 'receipts',
          tags: ['financial'],
          fileType: 'application/pdf',
          size: 500000,
          uploadedAt: new Date('2024-03-15'),
          owner: 'user456',
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc3.docx',
          originalName: 'doc3.docx',
          category: 'reports',
          tags: ['important', 'annual'],
          fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 300000,
          uploadedAt: new Date('2024-06-20'),
          owner: 'user123',
          organization: testOrg._id.toString(),
        },
      ];

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should filter by category', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '', category: 'receipts' },
      );

      expect(results.data.length).toBeGreaterThan(0);
      expect(results.data.every((d) => d.category === 'receipts')).toBe(true);
    });

    it('should filter by date range', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        {
          query: '',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-07-01'),
        },
      );

      expect(results.data.length).toBeGreaterThan(0);
    });

    it('should filter by size range', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        {
          query: '',
          minSize: 250000,
          maxSize: 600000,
        },
      );

      expect(results.data.length).toBeGreaterThan(0);
      expect(results.data.every((d) => d.size >= 250000 && d.size <= 600000)).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '', tags: ['important'] },
      );

      expect(results.data.length).toBeGreaterThan(0);
    });

    it('should combine multiple filters', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        {
          query: '',
          category: 'receipts',
          minSize: 100000,
        },
      );

      expect(results.data.length).toBeGreaterThan(0);
      expect(results.data.every((d) => d.category === 'receipts')).toBe(true);
    });
  });

  describe('Global Search', () => {
    it('should search across multiple entities', async () => {
      const results = await advancedSearchService.globalSearch(
        testOrg._id.toString(),
        'test',
        10,
      );

      expect(results).toHaveProperty('documents');
      expect(results).toHaveProperty('properties');
      expect(results).toHaveProperty('invoices');
      expect(results).toHaveProperty('tenants');
    });

    it('should format results consistently', async () => {
      const results = await advancedSearchService.globalSearch(
        testOrg._id.toString(),
        'test',
        5,
      );

      Object.values(results).forEach((entityResults) => {
        if (entityResults.data && entityResults.data.length > 0) {
          const result = entityResults.data[0];
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('score');
        }
      });
    });
  });

  describe('Autocomplete Suggestions', () => {
    beforeAll(async () => {
      const docs = [
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'lease_agreement.pdf',
          originalName: 'lease_agreement.pdf',
          category: 'tenant_documents',
          tags: ['legal', 'important'],
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'lease_renewal.pdf',
          originalName: 'lease_renewal.pdf',
          category: 'tenant_documents',
          tags: ['legal'],
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'legal_notice.pdf',
          originalName: 'legal_notice.pdf',
          category: 'legal_documents',
          tags: ['important'],
          organization: testOrg._id.toString(),
        },
      ];

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should return suggestions for filename prefix', async () => {
      const suggestions = await advancedSearchService.getAutocompleteSuggestions(
        testOrg._id.toString(),
        'filename',
        'lease',
        5,
      );

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return suggestions for category', async () => {
      const suggestions = await advancedSearchService.getAutocompleteSuggestions(
        testOrg._id.toString(),
        'category',
        'tenant',
        5,
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should rank by frequency', async () => {
      const suggestions = await advancedSearchService.getAutocompleteSuggestions(
        testOrg._id.toString(),
        'category',
        'tenant',
        5,
      );

      if (suggestions.length > 1) {
        expect(suggestions[0].count).toBeGreaterThanOrEqual(suggestions[1].count);
      }
    });

    it('should limit results', async () => {
      const suggestions = await advancedSearchService.getAutocompleteSuggestions(
        testOrg._id.toString(),
        'filename',
        'l',
        3,
      );

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Faceted Search', () => {
    beforeAll(async () => {
      const docs = [
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc1.pdf',
          category: 'receipts',
          tags: ['important'],
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc2.docx',
          category: 'receipts',
          tags: ['financial'],
          organization: testOrg._id.toString(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          filename: 'doc3.xlsx',
          category: 'reports',
          tags: ['annual'],
          organization: testOrg._id.toString(),
        },
      ];

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should return facet aggregations', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '' },
      );

      expect(results.facets).toBeDefined();
    });

    it('should count documents per category', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '' },
      );

      if (results.facets.categories) {
        expect(results.facets.categories.length).toBeGreaterThan(0);
        expect(results.facets.categories[0]).toHaveProperty('name');
        expect(results.facets.categories[0]).toHaveProperty('count');
      }
    });
  });

  describe('Pagination', () => {
    beforeAll(async () => {
      const docs = Array(50)
        .fill(null)
        .map((_, i) => ({
          _id: new mongoose.Types.ObjectId(),
          filename: `document_${i}.pdf`,
          originalName: `document_${i}.pdf`,
          category: 'test',
          organization: testOrg._id.toString(),
        }));

      await advancedSearchService.indexDocuments(testOrg._id.toString(), docs);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should apply limit', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '', limit: 10 },
      );

      expect(results.data.length).toBeLessThanOrEqual(10);
    });

    it('should apply offset', async () => {
      const page1 = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '', limit: 10, offset: 0 },
      );

      const page2 = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '', limit: 10, offset: 10 },
      );

      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0].id).not.toBe(page2.data[0].id);
      }
    });

    it('should provide total count', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '' },
      );

      expect(results.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Checks', () => {
    it('should return cluster health', async () => {
      const health = await advancedSearchService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(['green', 'yellow', 'red']).toContain(health.status);
    });

    it('should report node count', async () => {
      const health = await advancedSearchService.healthCheck();

      expect(health).toHaveProperty('nodes');
      expect(health.nodes).toBeGreaterThan(0);
    });

    it('should report data nodes', async () => {
      const health = await advancedSearchService.healthCheck();

      expect(health).toHaveProperty('dataNodes');
      expect(health.dataNodes).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing organization gracefully', async () => {
      const results = await advancedSearchService.advancedSearch(
        'nonexistent-org',
        { query: 'test' },
      );

      expect(results.data).toEqual([]);
    });

    it('should handle empty query', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '' },
      );

      expect(Array.isArray(results.data)).toBe(true);
    });

    it('should handle special characters in query', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        { query: '@#$%^&*()' },
      );

      expect(results.data).toBeDefined();
    });

    it('should handle invalid date range', async () => {
      const results = await advancedSearchService.advancedSearch(
        testOrg._id.toString(),
        {
          query: 'test',
          startDate: new Date('invalid'),
          endDate: new Date('invalid'),
        },
      );

      expect(results.data).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should search in under 500ms', async () => {
      const start = Date.now();

      await advancedSearchService.advancedSearch(testOrg._id.toString(), {
        query: 'test',
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should provide suggestions in under 200ms', async () => {
      const start = Date.now();

      await advancedSearchService.getAutocompleteSuggestions(
        testOrg._id.toString(),
        'filename',
        'test',
      );

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });
});
