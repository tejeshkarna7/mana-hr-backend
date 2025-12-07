import { Schema, model } from 'mongoose';
import { IDocument } from '@/types/index.js';

const documentSchema = new Schema<IDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
          return allowedTypes.includes(value);
        },
        message: 'File type must be one of: pdf, doc, docx, jpg, jpeg, png',
      },
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be positive'],
      max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'], // 10MB in bytes
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Uploaded by is required'],
    },
    uploadedOn: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
documentSchema.index({ userId: 1, uploadedOn: -1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ uploadedBy: 1 });

// Virtual for file size in readable format
documentSchema.virtual('fileSizeFormatted').get(function (this: any) {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  if (bytes === 0) return '0 Byte';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file extension
documentSchema.virtual('fileExtension').get(function (this: any) {
  return this.fileName.split('.').pop()?.toLowerCase();
});

// Virtual to check if file is an image
documentSchema.virtual('isImage').get(function (this: any) {
  const imageTypes = ['jpg', 'jpeg', 'png'];
  return imageTypes.includes(this.fileType);
});

// Virtual to check if file is a document
documentSchema.virtual('isDocument').get(function (this: any) {
  const docTypes = ['pdf', 'doc', 'docx'];
  return docTypes.includes(this.fileType);
});

// Static method to get user documents by type
documentSchema.statics.getUserDocumentsByType = async function (
  userId: string,
  fileType?: string
) {
  const query: any = { userId };
  
  if (fileType) {
    query.fileType = fileType.toLowerCase();
  }

  return this.find(query)
    .populate('uploadedBy', 'fullName email')
    .sort({ uploadedOn: -1 });
};

// Static method to get document statistics
documentSchema.statics.getDocumentStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$fileType',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  const totalStats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
      },
    },
  ]);

  return {
    byType: stats,
    total: totalStats[0] || { totalDocuments: 0, totalSize: 0, avgSize: 0 },
  };
};

export const Document = model<IDocument>('Document', documentSchema);