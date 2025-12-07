import { Schema, model } from 'mongoose';
import { IRole } from '@/types/index.js';

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemRole: {
      type: Boolean,
      default: false, // System roles cannot be deleted
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 100, // Higher number = higher authority
    },
    dataAccessLevel: {
      type: Number,
      enum: {
        values: [1, 2, 3],
        message: 'Data access level must be 1 (ALL), 2 (TEAM), or 3 (OWN)'
      },
      required: [true, 'Data access level is required'],
      default: 3,
    },
    organizationCode: {
      type: String,
      required: [true, 'Organization code is required'],
      trim: true,
      uppercase: true,
      maxlength: [10, 'Organization code cannot exceed 10 characters'],
      ref: 'Organization',
    },
    createdBy: {
      type: String,
      ref: 'User',
    },
    updatedBy: {
      type: String,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
roleSchema.index({ name: 1, organizationCode: 1 }, { unique: true }); // Composite unique index
roleSchema.index({ organizationCode: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });
roleSchema.index({ isSystemRole: 1 });

// Virtual for permission count
roleSchema.virtual('permissionCount').get(function(this: IRole) {
  return this.permissions ? this.permissions.length : 0;
});

export const Role = model<IRole>('Role', roleSchema);