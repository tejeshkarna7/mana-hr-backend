import { Schema, model } from 'mongoose';
import { ILeaveType } from '@/types/index.js';

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    name: {
      type: String,
      required: [true, 'Leave type name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Leave type name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    daysAllowed: {
      type: Number,
      required: [true, 'Days allowed per year is required'],
      min: [1, 'Days allowed must be at least 1'],
      max: [365, 'Days allowed cannot exceed 365'],
    },
    isCarryForward: {
      type: Boolean,
      default: false,
    },
    maxCarryForwardDays: {
      type: Number,
      min: [0, 'Max carry forward days must be positive'],
      validate: {
        validator: function (this: ILeaveType, value: number) {
          return !this.isCarryForward || (value && value > 0);
        },
        message: 'Max carry forward days is required when carry forward is enabled',
      },
    },
    color: {
      type: String,
      trim: true,
      validate: {
        validator: function (value: string) {
          return !value || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
        },
        message: 'Color must be a valid hex color code (e.g., #FF0000)',
      },
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    minDaysNotice: {
      type: Number,
      min: [0, 'Minimum days notice cannot be negative'],
      max: [365, 'Minimum days notice cannot exceed 365'],
      default: 0,
    },
    maxConsecutiveDays: {
      type: Number,
      min: [1, 'Maximum consecutive days must be at least 1'],
      max: [365, 'Maximum consecutive days cannot exceed 365'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    organizationCode: {
      type: String,
      required: [true, 'Organization code is required'],
      index: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
    updatedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Updated by is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
leaveTypeSchema.index({ name: 1 }, { unique: true });
leaveTypeSchema.index({ isActive: 1 });

export const LeaveType = model<ILeaveType>('LeaveType', leaveTypeSchema);