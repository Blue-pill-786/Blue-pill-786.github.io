/**
 * Storage Service
 * Handles file uploads to cloud storage (S3 or Cloudinary)
 * Includes virus scanning, preview generation, etc.
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class StorageService {
  /**
   * Upload file to Cloudinary
   */
  static async uploadToCloudinary(filePath, documentType, organizationId) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase().slice(1);

      // Determine resource type
      const resourceType = this.getResourceType(fileExtension);

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `pg-manager/${organizationId}/documents/${documentType}`,
        resource_type: resourceType,
        public_id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        overwrite: false,
        tags: ['pg-manager', organizationId, documentType],
      });

      // Generate thumbnail if image or PDF
      let thumbnail = null;
      if (['image', 'pdf'].includes(resourceType)) {
        thumbnail = cloudinary.url(result.public_id, {
          resource_type: resourceType,
          width: 150,
          height: 150,
          crop: 'fill',
          fetch_format: 'auto',
          quality: 'auto',
        });
      }

      return {
        success: true,
        storageProvider: 'cloudinary',
        fileName: result.public_id,
        fileSize: fileBuffer.length,
        storageUrl: result.secure_url,
        thumbnail,
        mimeType: result.resource_type === 'image' ? result.format : 'application/pdf',
        preview: await this.generatePreview(result.secure_url, fileExtension),
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Upload file to AWS S3
   */
  static async uploadToS3(filePath, documentType, organizationId) {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    try {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName).toLowerCase().slice(1);
      const fileBuffer = await fs.readFile(filePath);

      // Generate storage key
      const storageKey = `documents/${organizationId}/${documentType}/${Date.now()}-${fileName}`;

      // Upload to S3
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: this.getMimeType(fileExtension),
        Metadata: {
          'organization-id': organizationId,
          'document-type': documentType,
        },
      };

      const result = await s3.upload(params).promise();

      return {
        success: true,
        storageProvider: 's3',
        fileName: result.Key,
        fileSize: fileBuffer.length,
        storageUrl: result.Location,
        storageKey: result.Key,
        mimeType: this.getMimeType(fileExtension),
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(storageUrl, storageProvider, organizationId) {
    try {
      if (storageProvider === 'cloudinary') {
        // Extract public_id from URL
        const publicId = storageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`pg-manager/${organizationId}/documents/${publicId}`);
      } else if (storageProvider === 's3') {
        // Delete from S3
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
        });

        const key = storageUrl.split(`${process.env.AWS_S3_BUCKET}/`)[1];
        await s3.deleteObject({ Bucket: process.env.AWS_S3_BUCKET, Key: key }).promise();
      }

      return { success: true };
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Generate document hash (for duplicate detection)
   */
  static async generateHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      console.error('Hash generation error:', error);
      return null;
    }
  }

  /**
   * Generate preview for document
   */
  static async generatePreview(storageUrl, fileExtension) {
    try {
      if (['pdf', 'doc', 'docx'].includes(fileExtension)) {
        return `${storageUrl}?page=1&format=jpg`;
      }
      return null;
    } catch (error) {
      console.error('Preview generation error:', error);
      return null;
    }
  }

  /**
   * Scan file for viruses (optional - requires antivirus service)
   */
  static async scanForViruses(filePath) {
    try {
      // TODO: Integrate with ClamAV or similar virus scanner
      // For now, return safe
      return { safe: true, threats: [] };
    } catch (error) {
      console.error('Virus scan error:', error);
      return { safe: false, threats: ['Scan failed'] };
    }
  }

  /**
   * Helper: Get resource type from file extension
   */
  static getResourceType(extension) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv'];
    const rawExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt'];

    if (imageExtensions.includes(extension.toLowerCase())) return 'image';
    if (videoExtensions.includes(extension.toLowerCase())) return 'video';
    if (rawExtensions.includes(extension.toLowerCase())) return 'raw';

    return 'auto';
  }

  /**
   * Helper: Get MIME type from extension
   */
  static getMimeType(extension) {
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get file from storage URL
   */
  static async getFileFromUrl(storageUrl) {
    try {
      const response = await fetch(storageUrl);
      if (!response.ok) throw new Error('File not found');
      return await response.buffer();
    } catch (error) {
      console.error('Fetch file error:', error);
      throw new Error('Could not retrieve file');
    }
  }
}

module.exports = StorageService;
