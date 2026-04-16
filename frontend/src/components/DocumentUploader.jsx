/**
 * DocumentUploader Component
 * Drag-drop file upload with preview and progress tracking
 * Beautiful animated interface with validation
 */

import React, { useRef, useState } from 'react';
import { api } from '../lib/apiService';

export const DocumentUploader = ({ onUploadComplete, documentType, relatedEntity, relatedEntityId }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size: 50MB';
    }
    return null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    setError(null);
    const validatedFiles = newFiles
      .map((file) => ({
        file,
        error: validateFile(file),
        id: `${file.name}-${Date.now()}`,
      }))
      .filter((f) => {
        if (f.error) {
          setError(f.error);
          return false;
        }
        return true;
      });

    setFiles((prev) => [...prev, ...validatedFiles]);
  };

  const removeFile = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadedFiles = [];
    const failedFiles = [];

    try {
      for (const fileItem of files) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('fileType', documentType || 'other');
        formData.append('relatedEntity', relatedEntity || '');
        formData.append('relatedEntityId', relatedEntityId || '');

        try {
          setUploadProgress((prev) => ({
            ...prev,
            [fileItem.id]: 0,
          }));

          const response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileItem.id]: percentComplete,
                }));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error('Upload failed'));
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));

            xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/documents`);
            xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('auth_token')}`);
            xhr.send(formData);
          });

          uploadedFiles.push(response.data);
          setUploadProgress((prev) => ({
            ...prev,
            [fileItem.id]: 100,
          }));
        } catch (err) {
          console.error('Upload failed:', err);
          failedFiles.push(fileItem.file.name);
        }
      }

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      if (failedFiles.length === 0) {
        setFiles([]);
        setError(null);
      } else {
        setError(`Failed to upload: ${failedFiles.join(', ')}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      webp: '🖼️',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
    };
    return icons[ext] || '📎';
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full text-center"
        >
          <div className="mx-auto w-12 h-12 mb-2">
            <svg
              className="w-full h-full text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Drag and drop files here
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            or click to select (PDF, Images, DOC up to 50MB)
          </p>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem) => (
            <div
              key={fileItem.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              {/* File Icon */}
              <span className="text-2xl">{getFileIcon(fileItem.file.name)}</span>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {fileItem.file.name}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {/* Progress Bar */}
                  {uploadProgress[fileItem.id] !== undefined && (
                    <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress[fileItem.id]}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Remove Button */}
              {!isUploading && !uploadProgress[fileItem.id] && (
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
          {!isUploading && (
            <button
              onClick={() => setFiles([])}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
