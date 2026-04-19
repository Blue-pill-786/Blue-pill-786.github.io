# Phase 2 Integration Guide - Advanced Search

**Status:** Ready for Integration  
**Created:** 2024-12-20  
**Version:** 1.0

---

## Backend Integration

### 1. Mount Search Routes in `server.js`

```javascript
// In backend/src/server.js

const advancedSearchRoutes = require('./routes/advancedSearch');

// Add after existing routes
app.use('/api/search', advancedSearchRoutes);

console.log('✅ Advanced Search routes mounted at /api/search');
```

**Verify:** Test endpoint `GET /api/search/documents?query=test`

---

### 2. Initialize Elasticsearch

```javascript
// In server startup (after connecting to MongoDB)

const advancedSearchService = require('./services/advancedSearchService');

// Initialize indices when server starts
(async () => {
  try {
    await advancedSearchService.initializeIndices();
    console.log('✅ Elasticsearch indices initialized');
    
    // Optional: Reindex existing data
    // await advancedSearchService.reindexData();
  } catch (error) {
    console.error('❌ Search initialization failed:', error);
  }
})();
```

---

### 3. Auto-Index on Document Upload

```javascript
// In backend/src/controllers/documentController.js (in uploadDocument function)

const advancedSearchService = require('../services/advancedSearchService');

// After document save
exports.uploadDocument = catchAsync(async (req, res) => {
  // ... existing upload code ...
  
  const savedDoc = await document.save();
  
  // Index to Elasticsearch
  try {
    await advancedSearchService.indexDocuments(
      user.organization,
      [savedDoc]
    );
  } catch (error) {
    console.warn('⚠️ Search indexing warning:', error);
    // Don't fail upload if search fails
  }
  
  res.json(new ApiResponse(201, savedDoc, 'Document uploaded'));
});
```

---

### 4. Sync Deletes with Search

```javascript
// In backend/src/controllers/documentController.js (deleteDocument)

const advancedSearchService = require('../services/advancedSearchService');

exports.deleteDocument = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const document = await Document.findByIdAndUpdate(
    id,
    { deletedAt: new Date() },
    { new: true }
  );
  
  // Remove from Elasticsearch
  try {
    await advancedSearchService.client.delete({
      index: advancedSearchService.indices.documents,
      id: document._id.toString(),
    });
  } catch (error) {
    console.warn('⚠️ Search delete warning:', error);
  }
  
  res.json(new ApiResponse(200, document, 'Document deleted'));
});
```

---

## Frontend Integration

### 1. Add Search Page

```javascript
// In frontend/src/pages/SearchPage.jsx

import React from 'react';
import AdvancedSearch from '../components/AdvancedSearch';
import Layout from '../components/Layout';

const SearchPage = () => {
  return (
    <Layout>
      <div className="p-6">
        <AdvancedSearch />
      </div>
    </Layout>
  );
};

export default SearchPage;
```

---

### 2. Update Routes in `App.jsx`

```javascript
// In frontend/src/App.jsx

import SearchPage from './pages/SearchPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes ... */}
        
        {/* Phase 2 Routes */}
        <Route path="/search" element={<SearchPage />} />
        
        {/* ... rest of routes ... */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### 3. Add Search to Navigation

```javascript
// In frontend/src/components/Layout.jsx or Navigation.jsx

import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  return (
    <nav className="bg-white shadow">
      <div className="px-4 py-3 flex items-center gap-8">
        {/* ... existing nav items ... */}
        
        <Link
          to="/search"
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <Search className="w-5 h-5" />
          <span>Advanced Search</span>
        </Link>
      </div>
    </nav>
  );
};
```

---

### 4. Update API Service

```javascript
// In frontend/src/lib/endpoints.js

export const SEARCH_ENDPOINTS = {
  SEARCH_DOCUMENTS: '/search/documents',
  SEARCH_PROPERTIES: '/search/properties',
  SEARCH_INVOICES: '/search/invoices',
  SEARCH_TENANTS: '/search/tenants',
  SEARCH_GLOBAL: '/search/global',
  SEARCH_SUGGESTIONS: '/search/suggestions',
  SEARCH_FACETS: '/search/facets',
  SEARCH_ADVANCED: '/search/advanced',
  SEARCH_HEALTH: '/search/health',
};
```

---

## Environment Configuration

### `.env` (Backend)

```env
# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme
ELASTICSEARCH_SSL=false

# Search Settings
SEARCH_BULK_SIZE=100
SEARCH_TIMEOUT=30000
SEARCH_RETRY_ATTEMPTS=3
```

### `.env` (Frontend)

```env
# Already configured - no changes needed
VITE_API_URL=http://localhost:5000/api
```

---

## Docker Setup Commands

### Option 1: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  elasticsearch_data:
```

Run:
```bash
docker-compose up -d
```

### Option 2: Docker Run

```bash
docker run -d \
  --name elasticsearch \
  -e discovery.type=single-node \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.0.0
```

---

## Verification Checklist

### Backend

- [ ] Routes mounted in `server.js`
- [ ] Elasticsearch indices created
- [ ] Test endpoint: `GET /api/search/documents?query=test`
- [ ] Test suggestions: `GET /api/search/suggestions?field=filename&prefix=test`
- [ ] Test facets: `GET /api/search/facets`
- [ ] Health check: `GET /api/search/health`

```bash
# Test commands
curl http://localhost:5000/api/search/documents?query=test
curl http://localhost:5000/api/search/health
```

### Frontend

- [ ] SearchPage component renders
- [ ] Route `/search` accessible
- [ ] Navigation link added
- [ ] AdvancedSearch component loads
- [ ] Search bar accepts input
- [ ] Filters work correctly
- [ ] Results display properly

```bash
# Navigate to: http://localhost:5173/search
# Try searching for documents
```

### Elasticsearch

- [ ] Container running on port 9200
- [ ] Health status green

```bash
# Health check
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices

# Sample query
curl -X GET "http://localhost:9200/pg-documents/_search?q=test"
```

---

## Migration: MongoDB Full-Text to Elasticsearch

### For Existing Documents

```javascript
// Run once to migrate existing data to Elasticsearch

const mongoose = require('mongoose');
const Document = require('./models/Document');
const advancedSearchService = require('./services/advancedSearchService');

async function migrateToElasticsearch() {
  try {
    console.log('🔄 Starting Elasticsearch migration...');
    
    const organizations = await mongoose.connection
      .collection('organizations')
      .find({})
      .toArray();
    
    for (const org of organizations) {
      console.log(`📑 Indexing for organization: ${org._id}`);
      
      const documents = await Document.find({
        organization: org._id,
        deletedAt: null,
      });
      
      if (documents.length > 0) {
        await advancedSearchService.indexDocuments(org._id, documents);
        console.log(`✅ Indexed ${documents.length} documents`);
      }
    }
    
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateToElasticsearch();
```

Run:
```bash
node migration.js
```

---

## Performance Tuning

### Elasticsearch Configuration

For better performance with 100k+ documents:

```javascript
// In advancedSearchService.js, modify client config:

this.client = new Client({
  node: process.env.ELASTICSEARCH_URL,
  auth: { ... },
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: true,
  sniffInterval: 10000,
  suggestCompression: true,
});

// Add bulk indexing optimization:
const bulkIndexing = {
  index: indexName,
  operations: documents.map((doc) => [
    { index: { _index: indexName, _id: doc._id } },
    doc_data,
  ]).flat(),
};

await this.client.bulk(bulkIndexing);
```

### Frontend Optimization

In `AdvancedSearch.jsx`:

```javascript
// Add debounce for search
const handleSearch = useCallback(
  debounce(async (query) => {
    // search logic
  }, 500),
  []
);

// Lazy load facets
const facets = useMemo(() => {
  return fetchFacets();
}, [searchType]);
```

---

## Troubleshooting

### Elasticsearch Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:9200
```

**Solution:**
```bash
# Check if Elasticsearch is running
docker ps | grep elasticsearch

# If not running, start it
docker start elasticsearch

# Or restart fresh
docker rm elasticsearch
docker run -d --name elasticsearch ...
```

### Search Returns No Results

```
Expected results but got empty array
```

**Solution:**
```bash
# Check if data is indexed
curl http://localhost:9200/pg-documents/_count

# Reindex if needed
POST /api/search/reindex

# Verify documents exist in MongoDB
db.documents.find().limit(5)
```

### Slow Search Performance

```
Search takes >2 seconds
```

**Solution:**
```bash
# Check Elasticsearch health
GET /api/search/health

# Optimize JVM memory
docker update elasticsearch -e ES_JAVA_OPTS="-Xms1g -Xmx1g"

# Add index refresh interval
PUT /pg-documents/_settings
{
  "index.refresh_interval": "30s"
}
```

---

## Monitoring

### Elasticsearch Metrics

```bash
# Cluster health
curl http://localhost:9200/_cluster/health

# Index stats
curl http://localhost:9200/_cat/indices?v

# Search stats
curl http://localhost:9200/_stats/search

# Memory usage
curl http://localhost:9200/_cat/nodes?v
```

### Backend Logging

Add search logging to `logger` middleware:

```javascript
// Log all search queries
router.get('/documents', (req, res, next) => {
  const startTime = Date.now();
  
  next();
  
  const duration = Date.now() - startTime;
  logger.info(`Search: ${req.query.query} | Results: ${res.resultCount} | Time: ${duration}ms`);
});
```

---

## Rollback Plan

If Elasticsearch causes issues:

### Temporary: Use MongoDB Full-Text

```javascript
// Switch back to MongoDB for search temporarily

exports.searchDocuments = catchAsync(async (req, res) => {
  const { query } = req.query;
  
  // Old method
  const results = await Document.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
  
  res.json(new ApiResponse(200, results));
});
```

### Full Rollback

```bash
# Disable search routes
# Comment out: app.use('/api/search', advancedSearchRoutes);

# Stop Elasticsearch
docker stop elasticsearch

# Remove from navigation
# Remove Search link from Navigation.jsx

# Keep code as backup for future use
# git tag rollback-elasticsearch
```

---

## Next Steps After Integration

1. **Monitor Performance**
   - Track search response times
   - Monitor Elasticsearch resource usage
   - Collect user feedback

2. **Scale if Needed**
   - Add Elasticsearch cluster nodes
   - Implement read replicas
   - Add caching layer

3. **Implement Remaining Phase 2 Features**
   - Custom Report Builder
   - 2FA/SSO Integration

---

## Support

For issues or questions:
- Check logs: `docker logs elasticsearch`
- Elasticsearch docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/
- Review test cases: `backend/__tests__/` for expected behavior

---

**Integration Status:** ✅ Ready for Deployment
**Last Updated:** 2024-12-20
**Maintainer:** AI Assistant
