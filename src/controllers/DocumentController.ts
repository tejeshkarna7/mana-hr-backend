import { Request, Response, NextFunction } from 'express';
import documentService from '@/services/DocumentService.js';
import { ApiError } from '@/utils/response.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';

export class DocumentController {
  /**
   * Upload document
   * POST /api/v1/documents
   */
  uploadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError('No file uploaded', 400);
      }

      const { userId } = req.body;
      const uploadedBy = req.user.userId;

      const document = await documentService.uploadDocument(
        { userId, file },
        uploadedBy
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { document }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get documents
   * GET /api/v1/documents
   */
  getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = req.query.userId as string;
      const fileType = req.query.fileType as string;

      const filters = { userId, fileType };
      const documents = await documentService.getAllDocuments(page, limit, filters);

      res.status(200).json({
        success: true,
        message: 'Documents retrieved successfully',
        data: documents
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get document by ID
   * GET /api/v1/documents/:id
   */
  getDocumentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);

      if (!document) {
        throw new ApiError('Document not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Document retrieved successfully',
        data: { document }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await documentService.deleteDocument(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user documents
   * GET /api/v1/documents/user/:userId
   */
  getUserDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const fileType = req.query.fileType as string;

      const documents = await documentService.getUserDocuments(userId, fileType);

      res.status(200).json({
        success: true,
        message: 'User documents retrieved successfully',
        data: { documents }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload multiple documents
   * POST /api/v1/documents/multiple
   */
  uploadMultipleDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new ApiError('No files uploaded', 400);
      }

      const { userId } = req.body;
      const uploadedBy = req.user.userId;

      const result = await documentService.uploadMultipleDocuments(userId, files, uploadedBy);

      res.status(201).json({
        success: true,
        message: `${result.successful.length} documents uploaded successfully`,
        data: {
          uploaded: result.successful.length,
          failed: result.failed.length,
          documents: result.successful,
          errors: result.failed
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload single document for specific user
   * POST /api/v1/documents/user/:userId
   */
  uploadDocumentForUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ApiError('No file uploaded', 400);
      }

      const { userId } = req.params;
      const uploadedBy = req.user.userId;
      const { role } = req.user;

      // Only HR/Admin can upload for other users
      if (userId !== req.user.userId.toString() && !['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to upload documents for other users', 403);
      }

      const document = await documentService.uploadDocument(
        { userId, file },
        uploadedBy
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { document }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload multiple documents for specific user
   * POST /api/v1/documents/user/:userId/multiple
   */
  uploadMultipleDocumentsForUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new ApiError('No files uploaded', 400);
      }

      const { userId } = req.params;
      const uploadedBy = req.user.userId;
      const { role } = req.user;

      // Only HR/Admin can upload for other users
      if (userId !== req.user.userId.toString() && !['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to upload documents for other users', 403);
      }

      const result = await documentService.uploadMultipleDocuments(userId, files, uploadedBy);

      res.status(201).json({
        success: true,
        message: `${result.successful.length} documents uploaded successfully`,
        data: {
          uploaded: result.successful.length,
          failed: result.failed.length,
          documents: result.successful,
          errors: result.failed
        }
      });
    } catch (error) {
      next(error);
    }
  };
}