import multer from 'multer';
import { Request } from 'express';
import { validateFileType, sanitizeFilename } from '@/utils/helpers.js';

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  destination?: string;
}

const createMulterConfig = (options: FileUploadOptions = {}) => {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
  } = options;

  const storage = multer.memoryStorage();

  const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void => {
    if (!validateFileType(file.originalname, allowedTypes)) {
      const error = new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      return cb(error);
    }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: 10, // Maximum 10 files per request
    },
  });
};

// Default upload instance
export const upload = multer({ storage: multer.memoryStorage() });

// Default upload middleware for documents
export const uploadDocument = createMulterConfig({
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png').split(','),
});

// Image upload middleware
export const uploadImage = createMulterConfig({
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['jpg', 'jpeg', 'png'],
});

// Document upload middleware (PDF, DOC, DOCX only)
export const uploadDocumentOnly = createMulterConfig({
  maxFileSize: 20 * 1024 * 1024, // 20MB
  allowedTypes: ['pdf', 'doc', 'docx'],
});

// Single file upload
export const uploadSingle = (fieldName: string, options?: FileUploadOptions) => {
  const upload = createMulterConfig(options);
  return upload.single(fieldName);
};

// Multiple files upload
export const uploadMultiple = (fieldName: string, maxCount = 10, options?: FileUploadOptions) => {
  const upload = createMulterConfig(options);
  return upload.array(fieldName, maxCount);
};

// Multiple fields upload
export const uploadFields = (fields: Array<{ name: string; maxCount?: number }>, options?: FileUploadOptions) => {
  const upload = createMulterConfig(options);
  return upload.fields(fields);
};

// Utility function to process uploaded files
export const processUploadedFile = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    fileName: sanitizeFilename(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  };
};

export const processUploadedFiles = (files: Express.Multer.File[]) => {
  return files.map(processUploadedFile);
};