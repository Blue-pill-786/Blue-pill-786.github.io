/**
 * Documents Management Page
 * Complete document management interface
 */

import React from 'react';
import DocumentLibrary from '../components/DocumentLibrary';

export const DocumentsPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <DocumentLibrary />
      </div>
    </div>
  );
};

export default DocumentsPage;
