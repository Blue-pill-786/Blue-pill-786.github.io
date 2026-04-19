/**
 * DocumentLibrary Component
 * Browse, search, filter and manage uploaded documents
 * Rich document gallery with preview
 */

import React, { useEffect, useState } from 'react';
import { api } from '../lib/apiService';
import DocumentUploader from './DocumentUploader';
import { Link } from 'react-router-dom';

export const DocumentLibrary = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showUploader, setShowUploader] = useState(false);

  const FILE_TYPES = ['lease', 'invoice', 'id_proof', 'agreement', 'receipt', 'receipt', 'tax', 'other'];
  const CATEGORIES = ['Legal', 'Finance', 'Maintenance', 'Tenant', 'Property'];

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Filter documents when query or filters change
  useEffect(() => {
    let filtered = documents;

    if (searchQuery) {
      filtered = filtered.filter((doc) =>
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedFileType) {
      filtered = filtered.filter((doc) => doc.fileType === selectedFileType);
    }

    if (selectedCategory) {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    setFilteredDocs(filtered);
  }, [documents, searchQuery, selectedFileType, selectedCategory]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents?limit=100');
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (uploadedFiles) => {
    setDocuments((prev) => [...uploadedFiles, ...prev]);
    setShowUploader(false);
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Delete this document?')) return;

    try {
      await api.delete(`/documents/${documentId}`);
      setDocuments((prev) => prev.filter((doc) => doc._id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleToggleStar = async (documentId) => {
    try {
      const response = await api.put(`/documents/${documentId}/star`);
      setDocuments((prev) =>
        prev.map((doc) => (doc._id === documentId ? response.data.data : doc))
      );
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  const getFileIcon = (fileType) => {
    const icons = {
      lease: '📋',
      invoice: '💰',
      id_proof: '🪪',
      agreement: '📜',
      receipt: '🧾',
      tax: '📊',
      medical: '⚕️',
      insurance: '🛡️',
      maintenance: '🔧',
      report: '📈',
      other: '📎',
    };
    return icons[fileType] || '📄';
  };

  if (loading && documents.length === 0) {
    return <div className="p-6 text-center">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Library</h1>
        <button
          onClick={() => setShowUploader(!showUploader)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <span>📤</span> Upload Document
        </button>
      </div>

      {/* Upload Section */}
      {showUploader && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload New Document
          </h2>
          <DocumentUploader onUploadComplete={handleUploadComplete} />
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-4">
        <input
          type="text"
          placeholder="🔍 Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* File Type Filter */}
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All File Types</option>
            {FILE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              ≡
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
              {filteredDocs.length} documents
            </span>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      {filteredDocs.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc._id}
                document={doc}
                onStar={() => handleToggleStar(doc._id)}
                onDelete={() => handleDeleteDocument(doc._id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <DocumentListItem
                key={doc._id}
                document={doc}
                onStar={() => handleToggleStar(doc._id)}
                onDelete={() => handleDeleteDocument(doc._id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No documents found</p>
        </div>
      )}
    </div>
  );
};

/**
 * Document Card Component (Grid View)
 */
const DocumentCard = ({ document, onStar, onDelete }) => {
  const getFileIcon = (fileType) => {
    const icons = {
      lease: '📋',
      invoice: '💰',
      id_proof: '🪪',
      agreement: '📜',
      receipt: '🧾',
      tax: '📊',
      other: '📎',
    };
    return icons[fileType] || '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden group">
      {/* Preview */}
      <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
        {document.thumbnail ? (
          <img
            src={document.thumbnail}
            alt={document.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">{getFileIcon(document.fileType)}</span>
        )}

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a
            href={document.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
            title="Open"
          >
            👁️
          </a>
          <a
            href={document.storageUrl}
            download
            className="p-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
            title="Download"
          >
            📥
          </a>
          <button
            onClick={onDelete}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">{document.fileName}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {formatFileSize(document.fileSize)}
        </p>

        {document.description && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDate(document.createdAt)}
          </span>
          <button
            onClick={onStar}
            className="text-lg hover:scale-125 transition-transform"
            title="Star"
          >
            {document.isStarred?.includes(localStorage.getItem('userId')) ? '⭐' : '🌟'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Document List Item Component (List View)
 */
const DocumentListItem = ({ document, onStar, onDelete }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div classNameName="bg-white dark:bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">📄</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white truncate">{document.fileName}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {formatFileSize(document.fileSize)} • {formatDate(document.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={document.storageUrl}
          download
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Download"
        >
          📥
        </a>
        <button
          onClick={onStar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-lg"
          title="Star"
        >
          {document.isStarred?.includes(localStorage.getItem('userId')) ? '⭐' : '🌟'}
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-red-600 dark:text-red-400"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default DocumentLibrary;
