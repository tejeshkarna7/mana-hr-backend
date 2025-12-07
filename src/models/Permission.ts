import { Schema, model } from 'mongoose';
import { IPermission } from '@/types/index.js';

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Permission name cannot exceed 100 characters'],
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
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      maxlength: [50, 'Module name cannot exceed 50 characters'],
      enum: [
        'users',
        'employees', 
        'attendance',
        'leave',
        'payroll',
        'documents',
        'settings',
        'reports',
        'dashboard',
        'system'
      ],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      enum: ['create', 'read', 'update', 'delete', 'approve', 'export', 'import', 'configure'],
    },
    resource: {
      type: String,
      trim: true,
      maxlength: [100, 'Resource name cannot exceed 100 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemPermission: {
      type: Boolean,
      default: false, // System permissions cannot be deleted
    },
    organizationCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Organization code cannot exceed 10 characters'],
      ref: 'Organization',
      // Not required because system permissions don't belong to any organization
    },
    createdBy: {
      type: String,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: String,
      ref: 'User',
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
permissionSchema.index({ name: 1, organizationCode: 1 }, { unique: true }); // Allow same name per organization
permissionSchema.index({ module: 1 });
permissionSchema.index({ action: 1 });
permissionSchema.index({ isActive: 1 });
permissionSchema.index({ organizationCode: 1 });
permissionSchema.index({ module: 1, action: 1 });
permissionSchema.index({ organizationCode: 1, module: 1 });

// Virtual for full permission string
permissionSchema.virtual('fullName').get(function(this: IPermission) {
  return this.resource 
    ? `${this.module}:${this.action}:${this.resource}`
    : `${this.module}:${this.action}`;
});

export const Permission = model<IPermission>('Permission', permissionSchema);