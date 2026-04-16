import React, { useState, useCallback, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../lib/api';

const AdvancedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [facets, setFacets] = useState({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      const fetchSuggestions = async () => {
        try {
          const response = await api.get('/search/suggestions', {
            params: {
              field: 'filename',
              prefix: debouncedQuery,
            },
          });
          setSuggestions(response.data?.data || []);
        } catch (err) {
          console.error('Failed to fetch suggestions:', err);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Fetch search results
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      performSearch();
    } else {
      setResults([]);
      setTotalResults(0);
    }
  }, [debouncedQuery, page, filters, sortBy, searchType]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '/search/global';
      const params = {
        query: debouncedQuery,
        limit: 20,
        offset: (page - 1) * 20,
        ...filters,
      };

      if (searchType !== 'all') {
        endpoint = `/search/${searchType}`;
      }

      if (sortBy !== 'relevance') {
        params.sortBy = sortBy;
      }

      const response = await api.get(endpoint, { params });

      if (searchType === 'all') {
        // Global search returns nested results
        const allResults = [
          ...(response.data?.data?.documents || []),
          ...(response.data?.data?.properties || []),
          ...(response.data?.data?.invoices || []),
          ...(response.data?.data?.tenants || []),
        ];
        setResults(allResults);
        setTotalResults(allResults.length);
        setFacets(response.data?.data?.facets || {});
      } else {
        setResults(response.data?.data || []);
        setTotalResults(response.data?.meta?.total || 0);
        setFacets(response.data?.meta?.facets || {});
      }
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    handleSearch(suggestion.text);
  };

  const handleClear = () => {
    setSearchQuery('');
    setFilters({});
    setPage(1);
    setSuggestions([]);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPage(1);
  };

  const handleFacetClick = (facetType, facetValue) => {
    handleFilterChange(facetType, facetValue);
  };

  const pageCount = Math.ceil(totalResults / 20);
  const hasNextPage = page < pageCount;
  const hasPrevPage = page > 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">Advanced Search</h1>
          <p className="text-slate-400">Search across documents, properties, invoices, and tenants</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search everything..."
                className="w-full rounded-lg border border-cyan-500/30 bg-slate-900 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-cyan-500/30 rounded-lg shadow-lg z-50">
                  {suggestions.slice(0, 10).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border-b border-slate-700 last:border-b-0"
                    >
                      {suggestion.text}
                      <span className="float-right text-xs text-slate-500">×{suggestion.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleClear}
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="mb-8 flex gap-2 border-b border-slate-700">
          {['all', 'documents', 'properties', 'invoices', 'tenants'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setSearchType(type);
                setPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                searchType === type
                  ? 'border-b-2 border-cyan-400 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Filters and Sorting */}
        <div className="mb-8 flex gap-3 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700 text-sm"
          >
            🔧 Filters
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="date">Sort: Date</option>
            <option value="size">Sort: Size</option>
          </select>

          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                >
                  <option value="">Any Category</option>
                  <option value="documents">Documents</option>
                  <option value="contracts">Contracts</option>
                  <option value="receipts">Receipts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">Status</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
                >
                  <option value="">Any Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full"></div>
            </div>
            <p className="text-slate-400 mt-4">Searching...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-red-400">
            ❌ {error}
          </div>
        )}

        {!loading && results.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-slate-400">No results found for "{searchQuery}"</p>
          </div>
        )}

        {!loading && results.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <p className="text-slate-500">Enter a search query to get started</p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <>
            <div className="mb-6 text-sm text-slate-400">
              Found <span className="text-cyan-400 font-semibold">{totalResults}</span> results
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">
                        {result.filename || result.name || result.invoiceNumber || 'Untitled'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {result.type || result._type || 'Unknown Type'}
                      </p>
                      {result.description && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{result.description}</p>
                      )}
                    </div>
                    {result.score && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-cyan-400">{Math.round(result.score * 100)}%</div>
                        <p className="text-xs text-slate-500">relevance</p>
                      </div>
                    )}
                  </div>

                  {result.tags && result.tags.length > 0 && (
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {result.tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {result.starred && (
                    <div className="mt-2 text-xs text-yellow-500">⭐ Starred</div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!hasPrevPage}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <span className="text-sm text-slate-400">
                Page <span className="text-cyan-400">{page}</span> of <span className="text-cyan-400">{pageCount || 1}</span>
              </span>

              <button
                onClick={() => setPage(Math.min(pageCount, page + 1))}
                disabled={!hasNextPage}
                className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* Facets */}
        {facets && Object.keys(facets).length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(facets).map(([facetType, facetValues]) => (
              <div key={facetType} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h4 className="font-semibold text-slate-200 mb-3 text-sm capitalize">{facetType}</h4>
                <div className="space-y-2">
                  {facetValues.slice(0, 5).map((facet) => (
                    <button
                      key={facet.name}
                      onClick={() => handleFacetClick(facetType, facet.name)}
                      className="w-full text-left text-sm text-slate-400 hover:text-cyan-400 px-2 py-1 rounded hover:bg-slate-700/50 transition-colors flex justify-between"
                    >
                      <span>{facet.name}</span>
                      <span className="text-slate-600">({facet.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
