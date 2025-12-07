import { Schema, model } from 'mongoose';
import { ICompanySettings, IAddress, IContactInfo, IWorkingHours } from '@/types/index.js';

const addressSchema = new Schema<IAddress>(
  {
    street: {
      type: String,
      required: [true, 'Street is required'],
      trim: true,
      maxlength: [200, 'Street cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true,
      maxlength: [20, 'Zip code cannot exceed 20 characters'],
    },
  },
  { _id: false }
);

const contactInfoSchema = new Schema<IContactInfo>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9\-\+\s\(\)]{10,20}$/, 'Please provide a valid phone number'],
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid website URL'],
    },
  },
  { _id: false }
);

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
    },
    totalHours: {
      type: Number,
      required: [true, 'Total hours is required'],
      min: [1, 'Total hours must be at least 1'],
      max: [24, 'Total hours cannot exceed 24'],
    },
    breakDuration: {
      type: Number,
      required: [true, 'Break duration is required'],
      min: [0, 'Break duration must be positive'],
      max: [480, 'Break duration cannot exceed 8 hours (480 minutes)'],
    },
  },
  { _id: false }
);

const companySettingsSchema = new Schema<ICompanySettings>(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    companyLogo: {
      type: String,
      trim: true,
    },
    address: {
      type: addressSchema,
      required: [true, 'Address is required'],
    },
    contactInfo: {
      type: contactInfoSchema,
      required: [true, 'Contact information is required'],
    },
    workingDays: [
      {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
      },
    ],
    workingHours: {
      type: workingHoursSchema,
      required: [true, 'Working hours is required'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      trim: true,
      uppercase: true,
      maxlength: [3, 'Currency code cannot exceed 3 characters'],
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      trim: true,
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

// Virtual for full address
companySettingsSchema.virtual('fullAddress').get(function (this: any) {
  const { street, city, state, country, zipCode } = this.address;
  return `${street}, ${city}, ${state}, ${country} - ${zipCode}`;
});

// Ensure only one company settings document
companySettingsSchema.pre('save', async function (this: any, next) {
  if (this.isNew) {
    const existingSettings = await (this.constructor as any).findOne();
    if (existingSettings) {
      const error = new Error('Company settings already exist. Use update instead.');
      return next(error);
    }
  }
  next();
});

export const CompanySettings = model<ICompanySettings>('CompanySettings', companySettingsSchema);