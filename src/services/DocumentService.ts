import { Document, User } from '@/models/index.js';
import { IDocument } from '@/types/index.js';
import { ApiError } from '@/utils/response.js';
import { sanitizeFilename, validateFileType } from '@/utils/helpers.js';
import S3Service from '@/config/s3.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface UploadDocumentData {
  userId: string;
  file: Express.Multer.File;
}

export interface DocumentFilters {
  userId?: string;
  fileType?: string;
  uploadedBy?: string;
  startDate?: Date;
  endDate?: Date;
}

class DocumentService {
  private s3Service = S3Service.getInstance();

  async uploadDocument(
    documentData: UploadDocumentData,
    uploadedBy: string
  ): Promise<IDocument> {
    // Verify user exists
    const user = await User.findById(documentData.userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const { file } = documentData;
    
    // Validate file type
    if (!validateFileType(file.originalname)) {
      throw new ApiError('Invalid file type. Allowed types: pdf, doc, docx, jpg, jpeg, png', 400);
    }

    // Sanitize filename
    const sanitizedFileName = sanitizeFilename(file.originalname);
    const fileExtension = sanitizedFileName.split('.').pop()?.toLowerCase();

    if (!fileExtension) {
      throw new ApiError('File must have an extension', 400);
    }

    // Generate S3 key
    const s3Key = this.s3Service.generateFileKey(
      'documents',
      sanitizedFileName,
      documentData.userId
    );

    try {
      let fileUrl: string;

      // Check if S3 is configured
      try {
        const s3Client = this.s3Service.getS3Client();
        const bucketName = this.s3Service.getBucketName();

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            userId: documentData.userId,
            uploadedBy,
            originalName: file.originalname,
          },
        });

        await s3Client.send(uploadCommand);
        fileUrl = this.s3Service.getFileUrl(s3Key);
      } catch (s3Error) {
        // S3 not configured - use local file path (for development)
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', documentData.userId);
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Save file locally
        const localFilePath = path.join(uploadsDir, `${Date.now()}-${sanitizedFileName}`);
        await fs.writeFile(localFilePath, file.buffer);
        
        // Generate local URL
        fileUrl = `/uploads/documents/${documentData.userId}/${path.basename(localFilePath)}`;
      }

      // Save document record
      const document = await Document.create({
        userId: documentData.userId,
        fileName: sanitizedFileName,
        originalName: file.originalname,
        fileType: fileExtension,
        fileSize: file.size,
        fileUrl,
        uploadedBy,
      });

      return document.populate([
        { path: 'userId', select: 'fullName employeeCode department' },
        { path: 'uploadedBy', select: 'fullName email' },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
      throw new ApiError(`Failed to upload document: ${errorMessage}`, 500);
    }
  }

  async uploadMultipleDocuments(
    userId: string,
    files: Express.Multer.File[],
    uploadedBy: string
  ): Promise<{
    successful: IDocument[];
    failed: Array<{ fileName: string; error: string }>;
  }> {
    const successful: IDocument[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      try {
        const document = await this.uploadDocument({ userId, file }, uploadedBy);
        successful.push(document);
      } catch (error) {
        failed.push({
          fileName: file.originalname,
          error: (error as Error).message,
        });
      }
    }

    return { successful, failed };
  }

  async getAllDocuments(
    page = 1,
    limit = 10,
    filters: DocumentFilters = {},
    sort?: string
  ): Promise<{
    documents: IDocument[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.fileType) {
      query.fileType = filters.fileType.toLowerCase();
    }

    if (filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    if (filters.startDate || filters.endDate) {
      query.uploadedOn = {};
      if (filters.startDate) query.uploadedOn.$gte = filters.startDate;
      if (filters.endDate) query.uploadedOn.$lte = filters.endDate;
    }

    let sortOption: any = { uploadedOn: -1 };
    
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('userId', 'fullName employeeCode department')
        .populate('uploadedBy', 'fullName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(query),
    ]);

    return {
      documents,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getDocumentById(id: string): Promise<IDocument> {
    const document = await Document.findById(id)
      .populate('userId', 'fullName employeeCode department')
      .populate('uploadedBy', 'fullName email');

    if (!document) {
      throw new ApiError('Document not found', 404);
    }

    return document;
  }

  async getUserDocuments(
    userId: string,
    fileType?: string
  ): Promise<IDocument[]> {
    const query: any = { userId };
    if (fileType) {
      query.fileType = fileType.toLowerCase();
    }

    return Document.find(query)
      .populate('userId', 'fullName employeeCode department')
      .populate('uploadedBy', 'fullName email')
      .sort({ uploadedOn: -1 });
  }

  async deleteDocument(id: string, _deletedBy: string): Promise<void> {
    const document = await Document.findById(id);
    
    if (!document) {
      throw new ApiError('Document not found', 404);
    }

    try {
      // Extract S3 key from URL
      const urlParts = document.fileUrl.split('/');
      const s3Key = urlParts.slice(-3).join('/'); // Get the last 3 parts as the key

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.s3Service.getBucketName(),
        Key: s3Key,
      });

      await this.s3Service.getS3Client().send(deleteCommand);

      // Delete from database
      await Document.findByIdAndDelete(id);
    } catch (error) {
      throw new ApiError('Failed to delete document', 500);
    }
  }

  async deleteMultipleDocuments(
    documentIds: string[],
    deletedBy: string
  ): Promise<{
    successful: string[];
    failed: Array<{ documentId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ documentId: string; error: string }> = [];

    for (const id of documentIds) {
      try {
        await this.deleteDocument(id, deletedBy);
        successful.push(id);
      } catch (error) {
        failed.push({
          documentId: id,
          error: (error as Error).message,
        });
      }
    }

    return { successful, failed };
  }

  async getDocumentsByType(fileType: string): Promise<IDocument[]> {
    return Document.find({ fileType: fileType.toLowerCase() })
      .populate('userId', 'fullName employeeCode department')
      .populate('uploadedBy', 'fullName email')
      .sort({ uploadedOn: -1 });
  }

  async searchDocuments(
    searchTerm: string,
    filters: DocumentFilters = {}
  ): Promise<IDocument[]> {
    let query: any = {
      $or: [
        { originalName: { $regex: searchTerm, $options: 'i' } },
        { fileName: { $regex: searchTerm, $options: 'i' } },
      ],
    };

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.fileType) {
      query.fileType = filters.fileType.toLowerCase();
    }

    if (filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    return Document.find(query)
      .populate('userId', 'fullName employeeCode department')
      .populate('uploadedBy', 'fullName email')
      .sort({ uploadedOn: -1 })
      .limit(50); // Limit search results
  }

  async getDocumentStats(): Promise<{
    total: number;
    byType: Array<{ _id: string; count: number; totalSize: number; avgSize: number }>;
    byEmployee: Array<{ _id: string; count: number; employeeName: string }>;
    totalSize: number;
    averageSize: number;
    recentUploads: number; // Last 7 days
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [stats, byEmployee, recentUploads] = await Promise.all([
      (Document as any).getDocumentStats(),
      Document.aggregate([
        {
          $group: {
            _id: '$employeeId',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $project: {
            count: 1,
            employeeName: '$employee.fullName',
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Document.countDocuments({
        uploadedOn: { $gte: sevenDaysAgo },
      }),
    ]);

    return {
      total: stats.total.totalDocuments,
      totalSize: stats.total.totalSize,
      averageSize: stats.total.avgSize,
      byType: stats.byType,
      byEmployee,
      recentUploads,
    };
  }

  async getDocumentReport(
    startDate: Date,
    endDate: Date,
    filters: DocumentFilters = {}
  ): Promise<{
    documents: IDocument[];
    summary: {
      totalDocuments: number;
      totalSize: number;
      byFileType: Array<{ type: string; count: number; size: number }>;
      byEmployee: Array<{ employeeId: string; employeeName: string; count: number }>;
      byUploader: Array<{ uploaderId: string; uploaderName: string; count: number }>;
    };
  }> {
    let query: any = {
      uploadedOn: { $gte: startDate, $lte: endDate },
    };

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.fileType) {
      query.fileType = filters.fileType.toLowerCase();
    }

    if (filters.uploadedBy) {
      query.uploadedBy = filters.uploadedBy;
    }

    const [documents, summary] = await Promise.all([
      Document.find(query)
        .populate('employeeId', 'fullName employeeCode department')
        .populate('uploadedBy', 'fullName email')
        .sort({ uploadedOn: -1 }),
      Document.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
          },
        },
      ]),
    ]);

    const [byFileType, byEmployee, byUploader] = await Promise.all([
      Document.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$fileType',
            count: { $sum: 1 },
            size: { $sum: '$fileSize' },
          },
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            size: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]),
      Document.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$employeeId',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $project: {
            employeeId: '$_id',
            employeeName: '$employee.fullName',
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]),
      Document.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$uploadedBy',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'uploader',
          },
        },
        { $unwind: '$uploader' },
        {
          $project: {
            uploaderId: '$_id',
            uploaderName: '$uploader.fullName',
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      documents,
      summary: {
        ...summary[0],
        byFileType,
        byEmployee,
        byUploader,
      },
    };
  }
}

export default new DocumentService();