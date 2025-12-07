import { Schema, model } from 'mongoose';
import { IAttendance, AttendanceStatus } from '@/types/index.js';

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'Employee ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOut: {
      type: Date,
    },
    totalHours: {
      type: Number,
      min: [0, 'Total hours must be positive'],
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      default: AttendanceStatus.PRESENT,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
      index: true
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

// Compound indexes
attendanceSchema.index({ employeeId: 1, date: 1 }); // Removed unique constraint to allow multiple sessions per day
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employeeId: 1, checkIn: 1 }); // Added index for better performance

// Virtual for date formatting
attendanceSchema.virtual('formattedDate').get(function (this: IAttendance) {
  return this.date.toISOString().split('T')[0];
});

// Virtual for check-in time formatting
attendanceSchema.virtual('checkInTime').get(function (this: IAttendance) {
  return this.checkIn.toTimeString().slice(0, 8);
});

// Virtual for check-out time formatting
attendanceSchema.virtual('checkOutTime').get(function (this: IAttendance) {
  return this.checkOut ? this.checkOut.toTimeString().slice(0, 8) : null;
});

// Pre-save middleware to calculate total hours
attendanceSchema.pre('save', function (this: any, next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut.getTime() - this.checkIn.getTime();
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
  next();
});

// Static method to get monthly attendance summary
attendanceSchema.statics.getMonthlyAttendance = async function (
  employeeId: string,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.find({
    employeeId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .populate('employeeId', 'fullName employeeCode department');
};

// Static method to get daily attendance report
attendanceSchema.statics.getDailyAttendance = async function (date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate('employeeId', 'fullName employeeCode department designation')
    .sort({ checkIn: 1 });
};

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);