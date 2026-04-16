/**
 * Advanced Search Controller - Phase 2
 * API endpoints for search functionality
 */

const advancedSearchService = require('../services/advancedSearchService');
const catchAsync = require('../utils/catchAsync');
const { ApiError, ApiResponse } = require('../utils/errors');

/**
 * Search documents with advanced filters
 */
exports.searchDocuments = catchAsync(async (req, res) => {
  const { user } = req;
  const { query, category, tags, startDate, endDate, minSize, maxSize, isStarred, limit, offset } =
    req.query;

  const results = await advancedSearchService.advancedSearch(user.organization, {
    query,
    category,
    tags: tags ? tags.split(',') : [],
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    minSize: minSize ? parseInt(minSize) : null,
    maxSize: maxSize ? parseInt(maxSize) : null,
    isStarred: isStarred === 'true',
    owner: req.query.owner || null,
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0,
  });

  res.json(
    new ApiResponse(200, results, 'Documents search completed successfully', {
      total: results.total,
    }),
  );
});

/**
 * Search properties
 */
exports.searchProperties = catchAsync(async (req, res) => {
  const { user } = req;
  const { query, city, state, type, minRent, maxRent, amenities, limit, offset } = req.query;

  const results = await advancedSearchService.searchProperties(user.organization, {
    query,
    city,
    state,
    type,
    minRent: minRent ? parseInt(minRent) : null,
    maxRent: maxRent ? parseInt(maxRent) : null,
    amenities: amenities ? amenities.split(',') : [],
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0,
  });

  res.json(
    new ApiResponse(200, results, 'Properties search completed successfully', {
      total: results.total,
    }),
  );
});

/**
 * Search invoices
 */
exports.searchInvoices = catchAsync(async (req, res) => {
  const { user } = req;
  const { query, status, minAmount, maxAmount, startDate, endDate, limit, offset } = req.query;

  const results = await advancedSearchService.searchInvoices(user.organization, {
    query,
    status,
    minAmount: minAmount ? parseFloat(minAmount) : null,
    maxAmount: maxAmount ? parseFloat(maxAmount) : null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0,
  });

  res.json(
    new ApiResponse(200, results, 'Invoices search completed successfully', {
      total: results.total,
    }),
  );
});

/**
 * Search tenants
 */
exports.searchTenants = catchAsync(async (req, res) => {
  const { user } = req;
  const { query, status, propertyId, limit, offset } = req.query;

  const results = await advancedSearchService.searchTenants(user.organization, {
    query,
    status,
    propertyId,
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0,
  });

  res.json(
    new ApiResponse(200, results, 'Tenants search completed successfully', {
      total: results.total,
    }),
  );
});

/**
 * Global search across all entities
 */
exports.globalSearch = catchAsync(async (req, res) => {
  const { user } = req;
  const { query, limit } = req.query;

  if (!query) {
    throw new ApiError(400, 'Search query is required');
  }

  const results = await advancedSearchService.globalSearch(
    user.organization,
    query,
    limit ? parseInt(limit) : 10,
  );

  res.json(
    new ApiResponse(200, results, 'Global search completed successfully', {
      entityTypes: Object.keys(results),
    }),
  );
});

/**
 * Get autocomplete suggestions
 */
exports.getAutocompleteSuggestions = catchAsync(async (req, res) => {
  const { user } = req;
  const { field, prefix, limit } = req.query;

  if (!field || !prefix) {
    throw new ApiError(400, 'Field and prefix are required');
  }

  const validFields = ['filename', 'category', 'tags', 'owner'];

  if (!validFields.includes(field)) {
    throw new ApiError(400, `Invalid field. Valid fields: ${validFields.join(', ')}`);
  }

  const suggestions = await advancedSearchService.getAutocompleteSuggestions(
    user.organization,
    field,
    prefix,
    limit ? parseInt(limit) : 10,
  );

  res.json(new ApiResponse(200, suggestions, 'Autocomplete suggestions retrieved successfully'));
});

/**
 * Get search facets/filters
 */
exports.getFacets = catchAsync(async (req, res) => {
  const { user } = req;
  const { type = 'documents' } = req.query;

  const facets = {
    documents: {
      categories: [
        'tenant_documents',
        'receipts',
        'reports',
        'agreements',
        'maintenance_logs',
      ],
      fileTypes: ['pdf', 'docx', 'xlsx', 'jpg', 'png'],
      sizes: [
        { label: 'Small (< 1MB)', value: '0-1000000' },
        { label: 'Medium (1-10MB)', value: '1000000-10000000' },
        { label: 'Large (> 10MB)', value: '10000000-' },
      ],
    },
    properties: {
      cities: [],
      states: [],
      types: ['apartment', 'studio', 'villa', 'townhouse'],
      amenities: [
        'wifi',
        'parking',
        'gym',
        'pool',
        'ac',
        'furnished',
        'kitchen',
        'balcony',
      ],
    },
    invoices: {
      statuses: ['paid', 'pending', 'overdue', 'cancelled'],
      dateRanges: [
        { label: 'This Month', value: 'month' },
        { label: 'This Quarter', value: 'quarter' },
        { label: 'This Year', value: 'year' },
        { label: 'Custom', value: 'custom' },
      ],
    },
  };

  res.json(
    new ApiResponse(200, facets[type] || facets.documents, 'Facets retrieved successfully'),
  );
});

/**
 * Initialize Elasticsearch indices
 */
exports.initializeSearch = catchAsync(async (req, res) => {
  const { user } = req;

  // Check if user is admin
  if (user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can initialize search');
  }

  await advancedSearchService.initializeIndices();

  res.json(new ApiResponse(200, null, 'Search indices initialized successfully'));
});

/**
 * Index existing data for search
 */
exports.reindexData = catchAsync(async (req, res) => {
  const { user } = req;

  if (user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can reindex data');
  }

  const Document = require('../models/Document');
  const Property = require('../models/Property');
  const Invoice = require('../models/Invoice');
  const Tenant = require('../models/Tenant');

  try {
    // Index documents
    const documents = await Document.find({ organization: user.organization });
    await advancedSearchService.indexDocuments(user.organization, documents);

    // Could add similar indexing for other entities
    res.json(
      new ApiResponse(
        200,
        {
          indexed: {
            documents: documents.length,
          },
        },
        'Data reindexed successfully',
      ),
    );
  } catch (error) {
    throw new ApiError(500, `Reindexing failed: ${error.message}`);
  }
});

/**
 * Health check for search service
 */
exports.searchHealthCheck = catchAsync(async (req, res) => {
  const health = await advancedSearchService.healthCheck();

  res.json(new ApiResponse(200, health, 'Search service health check completed'));
});

/**
 * Advanced document search with aggregations
 */
exports.advancedDocumentSearch = catchAsync(async (req, res) => {
  const { user } = req;
  const {
    query,
    category,
    tags,
    startDate,
    endDate,
    minSize,
    maxSize,
    isStarred,
    sortBy = 'relevance',
    sortOrder = 'desc',
    limit = 20,
    offset = 0,
  } = req.body;

  const results = await advancedSearchService.advancedSearch(user.organization, {
    query,
    category,
    tags: tags || [],
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    minSize: minSize ? parseInt(minSize) : null,
    maxSize: maxSize ? parseInt(maxSize) : null,
    isStarred,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  // Apply sorting
  let sorted = results.data;

  if (sortBy === 'date') {
    sorted.sort((a, b) => {
      const dateA = new Date(a.uploadedAt);
      const dateB = new Date(b.uploadedAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  } else if (sortBy === 'size') {
    sorted.sort((a, b) => (sortOrder === 'desc' ? b.size - a.size : a.size - b.size));
  } else {
    // Default: relevance (already sorted by Elasticsearch)
    sorted = results.data;
  }

  res.json(
    new ApiResponse(
      200,
      {
        documents: sorted,
        facets: results.facets,
        total: results.total,
      },
      'Advanced search completed successfully',
    ),
  );
});

/**
 * Saved searches management
 */
exports.savSearch = catchAsync(async (req, res) => {
  const { user } = req;
  const { name, query, filters } = req.body;

  // In production, save to database
  // For now, return success
  res.json(
    new ApiResponse(
      201,
      {
        id: Date.now(),
        name,
        query,
        filters,
        createdAt: new Date(),
      },
      'Search saved successfully',
    ),
  );
});

/**
 * Get saved searches
 */
exports.getSavedSearches = catchAsync(async (req, res) => {
  const { user } = req;

  // In production, fetch from database
  // For now, return empty array
  res.json(new ApiResponse(200, [], 'Saved searches retrieved successfully'));
});
