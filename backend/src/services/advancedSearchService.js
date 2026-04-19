/**
 * Advanced Search Service - Phase 2
 * Elasticsearch integration with fuzzy matching, filters, and facets
 */

const { Client } = require('@elastic/elasticsearch');
const Document = require('../models/Document');
const Property = require('../models/Property');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');

class AdvancedSearchService {
  constructor() {
    // Initialize Elasticsearch client
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USER || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
      },
    });

    this.indices = {
      documents: 'pg-documents',
      properties: 'pg-properties',
      invoices: 'pg-invoices',
      tenants: 'pg-tenants',
    };
  }

  /**
   * Initialize Elasticsearch indices with mappings
   */
  async initializeIndices() {
    try {
      // Documents index
      await this.createIndex(this.indices.documents, {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            organization: { type: 'keyword' },
            filename: { type: 'text', analyzer: 'standard' },
            originalName: { type: 'text', analyzer: 'standard' },
            description: { type: 'text', analyzer: 'standard' },
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            fileType: { type: 'keyword' },
            owner: { type: 'keyword' },
            size: { type: 'long' },
            uploadedAt: { type: 'date' },
            updatedAt: { type: 'date' },
            isStarred: { type: 'boolean' },
            isPublic: { type: 'boolean' },
            url: { type: 'keyword' },
          },
        },
      });

      // Properties index
      await this.createIndex(this.indices.properties, {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            organization: { type: 'keyword' },
            name: { type: 'text', analyzer: 'standard' },
            address: { type: 'text', analyzer: 'standard' },
            city: { type: 'keyword' },
            state: { type: 'keyword' },
            zipCode: { type: 'keyword' },
            totalRooms: { type: 'integer' },
            availableRooms: { type: 'integer' },
            type: { type: 'keyword' },
            description: { type: 'text', analyzer: 'standard' },
            rentRange: {
              properties: {
                min: { type: 'integer' },
                max: { type: 'integer' },
              },
            },
            amenities: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });

      // Invoices index
      await this.createIndex(this.indices.invoices, {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            organization: { type: 'keyword' },
            invoiceNumber: { type: 'keyword' },
            tenantId: { type: 'keyword' },
            tenantName: { type: 'text', analyzer: 'standard' },
            amount: { type: 'double' },
            dueDate: { type: 'date' },
            issueDate: { type: 'date' },
            status: { type: 'keyword' },
            description: { type: 'text', analyzer: 'standard' },
            createdAt: { type: 'date' },
          },
        },
      });

      // Tenants index
      await this.createIndex(this.indices.tenants, {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            organization: { type: 'keyword' },
            name: { type: 'text', analyzer: 'standard' },
            email: { type: 'keyword' },
            phone: { type: 'keyword' },
            propertyId: { type: 'keyword' },
            roomNumber: { type: 'keyword' },
            status: { type: 'keyword' },
            moveInDate: { type: 'date' },
            moveOutDate: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });

      console.log('✅ Elasticsearch indices initialized');
    } catch (error) {
      console.error('❌ Error initializing indices:', error);
      throw error;
    }
  }

  /**
   * Create index if it doesn't exist
   */
  async createIndex(indexName, config) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          body: config,
        });

        console.log(`✅ Index created: ${indexName}`);
      }
    } catch (error) {
      if (error.statusCode !== 400) {
        throw error;
      }
    }
  }

  /**
   * Index documents for search
   */
  async indexDocuments(organization, documents) {
    try {
      const operations = [];

      documents.forEach((doc) => {
        operations.push({
          index: {
            _index: this.indices.documents,
            _id: doc._id.toString(),
          },
        });

        operations.push({
          id: doc._id.toString(),
          organization: organization,
          filename: doc.filename,
          originalName: doc.originalName,
          description: doc.description || '',
          category: doc.category,
          tags: doc.tags || [],
          fileType: doc.fileType,
          owner: doc.owner.toString(),
          size: doc.size,
          uploadedAt: doc.uploadedAt,
          updatedAt: doc.updatedAt,
          isStarred: doc.isStarred || false,
          isPublic: doc.isPublic || false,
          url: doc.url,
        });
      });

      await this.client.bulk({
        body: operations,
      });

      console.log(`✅ ${documents.length} documents indexed`);
    } catch (error) {
      console.error('❌ Error indexing documents:', error);
      throw error;
    }
  }

  /**
   * Advanced search with fuzzy matching
   */
  async advancedSearch(organization, searchParams) {
    try {
      const {
        query,
        type = 'all',
        category,
        tags = [],
        startDate,
        endDate,
        minSize,
        maxSize,
        isStarred,
        owner,
        limit = 20,
        offset = 0,
      } = searchParams;

      const filters = [{ term: { organization } }];

      // Category filter
      if (category) {
        filters.push({ term: { category } });
      }

      // Tags filter
      if (tags.length > 0) {
        filters.push({ terms: { tags } });
      }

      // Date range filter
      if (startDate || endDate) {
        const rangeFilter = {};
        if (startDate) rangeFilter.gte = startDate;
        if (endDate) rangeFilter.lte = endDate;
        filters.push({ range: { uploadedAt: rangeFilter } });
      }

      // Size range filter
      if (minSize || maxSize) {
        const sizeFilter = {};
        if (minSize) sizeFilter.gte = minSize;
        if (maxSize) sizeFilter.lte = maxSize;
        filters.push({ range: { size: sizeFilter } });
      }

      // Starred filter
      if (typeof isStarred === 'boolean') {
        filters.push({ term: { isStarred } });
      }

      // Owner filter
      if (owner) {
        filters.push({ term: { owner } });
      }

      // Build query with fuzzy matching
      const esQuery = {
        bool: {
          must: query
            ? {
                multi_match: {
                  query,
                  fields: ['filename^3', 'originalName^2', 'description', 'tags'],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              }
            : { match_all: {} },
          filter: filters,
        },
      };

      // Execute search
      const result = await this.client.search({
        index: this.indices.documents,
        body: {
          query: esQuery,
          from: offset,
          size: limit,
          highlight: {
            fields: {
              filename: {},
              description: {},
            },
          },
          aggs: {
            categories: {
              terms: { field: 'category', size: 10 },
            },
            fileTypes: {
              terms: { field: 'fileType', size: 10 },
            },
            owners: {
              terms: { field: 'owner', size: 10 },
            },
          },
        },
      });

      return this.formatSearchResults(result);
    } catch (error) {
      console.error('❌ Search error:', error);
      throw error;
    }
  }

  /**
   * Search properties with filters
   */
  async searchProperties(organization, filters) {
    try {
      const {
        query,
        city,
        state,
        type,
        minRent,
        maxRent,
        amenities = [],
        limit = 20,
        offset = 0,
      } = filters;

      const esFilters = [{ term: { organization } }];

      if (city) esFilters.push({ term: { city } });
      if (state) esFilters.push({ term: { state } });
      if (type) esFilters.push({ term: { type } });
      if (amenities.length > 0) esFilters.push({ terms: { amenities } });

      if (minRent || maxRent) {
        const rentRange = {};
        if (minRent) rentRange.gte = minRent;
        if (maxRent) rentRange.lte = maxRent;
        esFilters.push({
          range: {
            'rentRange.min': rentRange,
          },
        });
      }

      const result = await this.client.search({
        index: this.indices.properties,
        body: {
          query: {
            bool: {
              must: query
                ? {
                    multi_match: {
                      query,
                      fields: ['name^3', 'address^2', 'description'],
                      fuzziness: 'AUTO',
                    },
                  }
                : { match_all: {} },
              filter: esFilters,
            },
          },
          from: offset,
          size: limit,
          aggs: {
            cities: {
              terms: { field: 'city', size: 20 },
            },
            amenities: {
              terms: { field: 'amenities', size: 20 },
            },
          },
        },
      });

      return this.formatSearchResults(result);
    } catch (error) {
      console.error('❌ Property search error:', error);
      throw error;
    }
  }

  /**
   * Search invoices
   */
  async searchInvoices(organization, filters) {
    try {
      const { query, status, minAmount, maxAmount, startDate, endDate, limit = 20, offset = 0 } =
        filters;

      const esFilters = [{ term: { organization } }];

      if (status) esFilters.push({ term: { status } });

      if (minAmount || maxAmount) {
        const amountRange = {};
        if (minAmount) amountRange.gte = minAmount;
        if (maxAmount) amountRange.lte = maxAmount;
        esFilters.push({ range: { amount: amountRange } });
      }

      if (startDate || endDate) {
        const dateRange = {};
        if (startDate) dateRange.gte = startDate;
        if (endDate) dateRange.lte = endDate;
        esFilters.push({ range: { issueDate: dateRange } });
      }

      const result = await this.client.search({
        index: this.indices.invoices,
        body: {
          query: {
            bool: {
              must: query
                ? {
                    multi_match: {
                      query,
                      fields: ['invoiceNumber', 'tenantName', 'description'],
                      fuzziness: 'AUTO',
                    },
                  }
                : { match_all: {} },
              filter: esFilters,
            },
          },
          from: offset,
          size: limit,
          aggs: {
            statuses: {
              terms: { field: 'status', size: 10 },
            },
            dateHist: {
              date_histogram: {
                field: 'issueDate',
                calendar_interval: 'month',
              },
            },
          },
        },
      });

      return this.formatSearchResults(result);
    } catch (error) {
      console.error('❌ Invoice search error:', error);
      throw error;
    }
  }

  /**
   * Global search across all indices
   */
  async globalSearch(organization, query, limit = 10) {
    try {
      const results = {};

      // Search documents
      results.documents = await this.advancedSearch(organization, { query, limit });

      // Search properties
      results.properties = await this.searchProperties(organization, { query, limit });

      // Search invoices
      results.invoices = await this.searchInvoices(organization, { query, limit });

      // Search tenants
      results.tenants = await this.searchTenants(organization, { query, limit });

      return results;
    } catch (error) {
      console.error('❌ Global search error:', error);
      throw error;
    }
  }

  /**
   * Autocomplete suggestions
   */
  async getAutocompleteSuggestions(organization, field, prefix, limit = 10) {
    try {
      const result = await this.client.search({
        index: this.indices.documents,
        body: {
          query: {
            bool: {
              must: [
                { term: { organization } },
                { prefix: { [field]: prefix } },
              ],
            },
          },
          aggs: {
            suggestions: {
              terms: {
                field,
                size: limit,
              },
            },
          },
          size: 0,
        },
      });

      return result.aggregations.suggestions.buckets.map((b) => ({
        text: b.key,
        count: b.doc_count,
      }));
    } catch (error) {
      console.error('❌ Autocomplete error:', error);
      return [];
    }
  }

  /**
   * Format search results
   */
  formatSearchResults(elasticResponse) {
    const hits = elasticResponse.hits.hits;

    return {
      data: hits.map((hit) => ({
        id: hit._id,
        ...hit._source,
        score: hit._score,
        highlight: hit.highlight || {},
      })),
      total: elasticResponse.hits.total.value,
      facets: this.extractFacets(elasticResponse.aggregations || {}),
    };
  }

  /**
   * Extract facet data from aggregations
   */
  extractFacets(aggregations) {
    const facets = {};

    Object.entries(aggregations).forEach(([key, agg]) => {
      if (agg.buckets) {
        facets[key] = agg.buckets.map((bucket) => ({
          name: bucket.key,
          count: bucket.doc_count,
        }));
      }
    });

    return facets;
  }

  /**
   * Search tenants
   */
  async searchTenants(organization, filters) {
    try {
      const { query, status, propertyId, limit = 20, offset = 0 } = filters;

      const esFilters = [{ term: { organization } }];
      if (status) esFilters.push({ term: { status } });
      if (propertyId) esFilters.push({ term: { propertyId } });

      const result = await this.client.search({
        index: this.indices.tenants,
        body: {
          query: {
            bool: {
              must: query
                ? {
                    multi_match: {
                      query,
                      fields: ['name^3', 'email', 'phone'],
                      fuzziness: 'AUTO',
                    },
                  }
                : { match_all: {} },
              filter: esFilters,
            },
          },
          from: offset,
          size: limit,
        },
      });

      return this.formatSearchResults(result);
    } catch (error) {
      console.error('❌ Tenant search error:', error);
      throw error;
    }
  }

  /**
   * Delete index
   */
  async deleteIndex(indexName) {
    try {
      await this.client.indices.delete({ index: indexName });
      console.log(`✅ Index deleted: ${indexName}`);
    } catch (error) {
      console.error('❌ Error deleting index:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const health = await this.client.cluster.health();
      return {
        status: health.status,
        nodes: health.number_of_nodes,
        dataNodes: health.number_of_data_nodes,
      };
    } catch (error) {
      console.error('❌ Health check error:', error);
      return { status: 'red', error: error.message };
    }
  }
}

module.exports = new AdvancedSearchService();
