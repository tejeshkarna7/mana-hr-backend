import { Schema, model } from 'mongoose';
import { ILeave, LeaveStatus } from '@/types/index.js';

const leaveSchema = new Schema<ILeave>(
  {
    employeeId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Employee ID is required'],
      index: true,
    },
    leaveType: {
      type: Schema.Types.ObjectId as any,
      ref: 'LeaveType',
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      required: [true, 'Total days is required'],
      min: [1, 'Total days must be at least 1'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(LeaveStatus),
      default: LeaveStatus.PENDING,
      required: true,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedDate: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
leaveSchema.index({ employeeId: 1, startDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ appliedDate: 1 });

// Virtual for leave duration in readable format
leaveSchema.virtual('duration').get(function (this: any) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
  return null;
});

// Pre-save middleware to calculate total days
leaveSchema.pre('save', function (this: any, next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const timeDiff = end.getTime() - start.getTime();
    this.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }
  next();
});

// Pre-save middleware to set approval/rejection fields
leaveSchema.pre('save', function (this: any, next) {
  if (this.isModified('status')) {
    if (this.status === LeaveStatus.APPROVED && !this.approvedDate) {
      this.approvedDate = new Date();
    } else if (this.status === LeaveStatus.REJECTED && !this.rejectedDate) {
      this.rejectedDate = new Date();
    }
  }
  next();
});

// Static method to get employee leave balance
leaveSchema.statics.getEmployeeLeaveBalance = async function (
  employeeId: string,
  year: number
) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const leaves = await this.find({
    employeeId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
    status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
  }).populate('leaveType');

  const leaveBalance: Record<string, { used: number; total: number }> = {};

  // Get all leave types
  const LeaveType = model('LeaveType');
  const leaveTypes = await LeaveType.find({ isActive: true });

  // Initialize balance for all leave types
  leaveTypes.forEach((type) => {
    leaveBalance[type.name] = {
      used: 0,
      total: type.maxDaysPerYear,
    };
  });

  // Calculate used days
  leaves.forEach((leave: any) => {
    const typeName = leave.leaveType.name;
    if (leaveBalance[typeName]) {
      leaveBalance[typeName].used += leave.totalDays;
    }
  });

  return leaveBalance;
};

export const Leave = model<ILeave>('Leave', leaveSchema);