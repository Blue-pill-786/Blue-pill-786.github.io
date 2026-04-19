/**
 * Advanced Search Component - Phase 2
 * Real-time search with filters, facets, and autocomplete
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, Loader } from 'lucide-react';
import { api } from '../lib/api';

const AdvancedSearch = () => {
  const [searchType, setSearchType] = useState('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    tags: [],
    startDate: '',
    endDate: '',
    minSize: '',
    maxSize: '',
    isStarred: false,
  });
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState({});
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Fetch facets on mount
  useEffect(() => {
    fetchFacets();
  }, [searchType]);

  const fetchFacets = async () => {
    try {
      const response = await api.get(`/search/facets?type=${searchType === 'all' ? 'documents' : searchType}`);
      setFacets(response.data.data);
    } catch (error) {
      console.error('Failed to fetch facets:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        handleSearch();
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, sortBy]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (query.length > 1) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await api.get('/search/suggestions', {
        params: {
          field: 'filename',
          prefix: query,
          limit: 8,
        },
      });
      setSuggestions(response.data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, [query]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setPage(0);

      const params = {
        query,
        limit: 20,
        offset: 0,
        sortBy,
      };

      // Add filters
      if (filters.category) params.category = filters.category;
      if (filters.tags.length > 0) params.tags = filters.tags.join(',');
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.minSize) params.minSize = filters.minSize;
      if (filters.maxSize) params.maxSize = filters.maxSize;
      if (filters.isStarred) params.isStarred = true;

      let endpoint = '/search/documents';
      if (searchType === 'properties') endpoint = '/search/properties';
      if (searchType === 'invoices') endpoint = '/search/invoices';
      if (searchType === 'tenants') endpoint = '/search/tenants';
      if (searchType === 'all') endpoint = '/search/global';

      const response = await api.get(endpoint, { params });

      setResults(response.data.data.documents || response.data.data || []);
      setTotal(response.data.meta?.total || 0);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(0);
  };

  const handleAddTag = (tag) => {
    if (!filters.tags.includes(tag)) {
      setFilters((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const handleRemoveTag = (tag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      tags: [],
      startDate: '',
      endDate: '',
      minSize: '',
      maxSize: '',
      isStarred: false,
    });
    setQuery('');
    setResults([]);
  };

  const hasActiveFilters = query || Object.values(filters).some((v) => v !== '' && v !== false && v.length > 0);

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Search</h1>
        <p className="text-gray-600">Find documents, properties, invoices, and more across your organization</p>
      </div>

      {/* Search Type Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['all', 'documents', 'properties', 'invoices', 'tenants'].map((type) => (
          <button
            key={type}
            onClick={() => setSearchType(type)}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              searchType === type
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${searchType === 'all' ? 'everything' : searchType}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 border-b last:border-b-0"
              >
                <Search className="inline w-4 h-4 mr-2 text-gray-400" />
                {suggestion.text} ({suggestion.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters {hasActiveFilters && <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">Active</span>}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date (Newest)</option>
            <option value="date-old">Date (Oldest)</option>
            <option value="size">Size</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            {facets.categories && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {facets.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Min Size (MB)</label>
              <input
                type="number"
                value={filters.minSize}
                onChange={(e) => handleFilterChange('minSize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Max Size (MB)</label>
              <input
                type="number"
                value={filters.maxSize}
                onChange={(e) => handleFilterChange('maxSize', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Starred Filter */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isStarred}
                  onChange={(e) => handleFilterChange('isStarred', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">Starred only</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          {facets.categories && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {filters.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No results found for "{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Found <span className="font-semibold text-gray-900">{total}</span> result
              {total !== 1 ? 's' : ''}
            </p>

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{result.filename || result.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.description || result.message || 'No description'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {result.category && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {result.category}
                          </span>
                        )}
                        {result.tags &&
                          result.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {result.score && `Score: ${result.score.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
