import { Schema, model } from 'mongoose';
import { IAttendanceSettings, ILocation } from '@/types/index.js';

const locationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
      maxlength: [100, 'Location name cannot exceed 100 characters'],
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    radius: {
      type: Number,
      required: [true, 'Radius is required'],
      min: [1, 'Radius must be at least 1 meter'],
      max: [10000, 'Radius cannot exceed 10km'],
    },
  },
  { _id: false }
);

const attendanceSettingsSchema = new Schema<IAttendanceSettings>(
  {
    autoCheckOut: {
      type: Boolean,
      default: false,
    },
    autoCheckOutTime: {
      type: String,
      required: function (this: IAttendanceSettings) {
        return this.autoCheckOut;
      },
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Auto check-out time must be in HH:MM format'],
    },
    lateThreshold: {
      type: Number,
      required: [true, 'Late threshold is required'],
      min: [0, 'Late threshold must be positive'],
      max: [480, 'Late threshold cannot exceed 8 hours (480 minutes)'],
    },
    earlyDepartureThreshold: {
      type: Number,
      required: [true, 'Early departure threshold is required'],
      min: [0, 'Early departure threshold must be positive'],
      max: [480, 'Early departure threshold cannot exceed 8 hours (480 minutes)'],
    },
    overtimeThreshold: {
      type: Number,
      required: [true, 'Overtime threshold is required'],
      min: [1, 'Overtime threshold must be at least 1 minute'],
      max: [960, 'Overtime threshold cannot exceed 16 hours (960 minutes)'],
    },
    requireLocationTracking: {
      type: Boolean,
      default: false,
    },
    allowedLocations: [locationSchema],
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

// Validation for allowed locations when location tracking is required
attendanceSettingsSchema.pre('save', function (this: any, next) {
  if (this.requireLocationTracking && (!this.allowedLocations || this.allowedLocations.length === 0)) {
    const error = new Error('At least one allowed location is required when location tracking is enabled');
    return next(error);
  }
  next();
});

// Ensure only one attendance settings document
attendanceSettingsSchema.pre('save', async function (this: any, next) {
  if (this.isNew) {
    const existingSettings = await (this.constructor as any).findOne();
    if (existingSettings) {
      const error = new Error('Attendance settings already exist. Use update instead.');
      return next(error);
    }
  }
  next();
});

export const AttendanceSettings = model<IAttendanceSettings>('AttendanceSettings', attendanceSettingsSchema);