import { Router } from 'express';
import { auth } from '@/middlewares/auth.js';
import { DocumentController } from '@/controllers/DocumentController.js';
import { uploadDocument } from '@/middlewares/upload.js';

const router = Router();
const documentController = new DocumentController();

// Apply authentication to all routes
router.use(auth);

// Document routes

// Get all documents (with optional filters)
router.get('/', (req, res, next) => {
  documentController.getDocuments(req as any, res, next);
});

// Get document by ID
router.get('/:id', (req, res, next) => {
  documentController.getDocumentById(req as any, res, next);
});

// Upload single document for current user
router.post('/', uploadDocument.single('file'), (req, res, next) => {
  documentController.uploadDocument(req as any, res, next);
});

// Upload multiple documents for current user
router.post('/multiple', uploadDocument.array('files', 10), (req, res, next) => {
  documentController.uploadMultipleDocuments(req as any, res, next);
});

// Get documents by user ID
router.get('/user/:userId', (req, res, next) => {
  documentController.getUserDocuments(req as any, res, next);
});

// Upload single document for specific user (HR/Admin)
router.post('/user/:userId', uploadDocument.single('file'), (req, res, next) => {
  documentController.uploadDocumentForUser(req as any, res, next);
});

// Upload multiple documents for specific user (HR/Admin)
router.post('/user/:userId/multiple', uploadDocument.array('files', 10), (req, res, next) => {
  documentController.uploadMultipleDocumentsForUser(req as any, res, next);
});

// Delete document
router.delete('/:id', (req, res, next) => {
  documentController.deleteDocument(req as any, res, next);
});

export default router;