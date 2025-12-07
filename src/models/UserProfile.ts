import { Schema, model } from 'mongoose';
import { IUserProfile, IPersonalDetails, IEmergencyContact, IEducation, IWorkExperience, ISkill } from '@/types/index.js';

// Personal Details Schema
const personalDetailsSchema = new Schema<IPersonalDetails>(
  {
    fatherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Father name cannot exceed 100 characters'],
    },
    motherName: {
      type: String,
      trim: true,
      maxlength: [100, 'Mother name cannot exceed 100 characters'],
    },
    spouseName: {
      type: String,
      trim: true,
      maxlength: [100, 'Spouse name cannot exceed 100 characters'],
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [50, 'Nationality cannot exceed 50 characters'],
    },
    religion: {
      type: String,
      trim: true,
      maxlength: [50, 'Religion cannot exceed 50 characters'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    aadharNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{12}$/, 'Aadhar number must be 12 digits'],
      sparse: true,
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please provide a valid PAN number'],
      sparse: true,
    },
    passportNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    drivingLicenseNumber: {
      type: String,
      trim: true,
      sparse: true,
    },
    permanentAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      pincode: { type: String, trim: true, match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'] },
    },
    currentAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      pincode: { type: String, trim: true, match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'] },
    },
    isSameAddress: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Emergency Contact Schema
const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: ['father', 'mother', 'spouse', 'sibling', 'friend', 'other'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+]?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    address: {
      type: String,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Education Schema
const educationSchema = new Schema<IEducation>(
  {
    institution: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [200, 'Institution name cannot exceed 200 characters'],
    },
    degree: {
      type: String,
      required: [true, 'Degree is required'],
      trim: true,
      maxlength: [100, 'Degree cannot exceed 100 characters'],
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: [100, 'Field of study cannot exceed 100 characters'],
    },
    startYear: {
      type: Number,
      min: [1950, 'Start year must be after 1950'],
      max: [new Date().getFullYear(), 'Start year cannot be in future'],
    },
    endYear: {
      type: Number,
      min: [1950, 'End year must be after 1950'],
      max: [new Date().getFullYear() + 10, 'End year cannot be too far in future'],
    },
    grade: {
      type: String,
      trim: true,
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
  },
  { _id: false }
);

// Work Experience Schema
const workExperienceSchema = new Schema<IWorkExperience>(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      maxlength: [100, 'Position cannot exceed 100 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (this: any, value: Date) {
          return !value || value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    isCurrentJob: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    reasonForLeaving: {
      type: String,
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

// Skill Schema
const skillSchema = new Schema<ISkill>(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters'],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: [true, 'Skill level is required'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    yearsOfExperience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
      max: [50, 'Years of experience cannot exceed 50'],
    },
  },
  { _id: false }
);

// Main User Profile Schema
const userProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    organizationCode: {
      type: String,
      required: [true, 'Organization code is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    personalDetails: {
      type: personalDetailsSchema,
      default: () => ({}),
    },
    emergencyContacts: [emergencyContactSchema],
    education: [educationSchema],
    workExperience: [workExperienceSchema],
    skills: [skillSchema],
    profilePhoto: {
      type: String,
      trim: true,
    },
    resume: {
      fileName: String,
      fileUrl: String,
      uploadedOn: { type: Date, default: Date.now },
    },
    certificates: [{
      name: { type: String, trim: true },
      issuedBy: { type: String, trim: true },
      issuedDate: Date,
      expiryDate: Date,
      fileUrl: String,
    }],
    languages: [{
      name: { type: String, trim: true, required: true },
      proficiency: { type: String, enum: ['basic', 'intermediate', 'fluent', 'native'], required: true },
      canRead: { type: Boolean, default: false },
      canWrite: { type: Boolean, default: false },
      canSpeak: { type: Boolean, default: false },
    }],
    socialProfiles: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      language: { type: String, default: 'en', trim: true },
      timezone: { type: String, default: 'Asia/Kolkata', trim: true },
    },
    reportingManagers: [{
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    }],
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    completionPercentage: {
      type: Number,
      min: [0, 'Completion percentage cannot be negative'],
      max: [100, 'Completion percentage cannot exceed 100'],
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userProfileSchema.index({ userId: 1, organizationCode: 1 });
userProfileSchema.index({ 'personalDetails.aadharNumber': 1 }, { sparse: true });
userProfileSchema.index({ 'personalDetails.panNumber': 1 }, { sparse: true });
userProfileSchema.index({ isProfileComplete: 1 });
userProfileSchema.index({ completionPercentage: 1 });

// Virtual to calculate profile completion percentage
userProfileSchema.pre('save', function (this: any) {
  let completedFields = 0;
  const totalFields = 15; // Define total important fields

  // Check personal details
  if (this.personalDetails?.fatherName) completedFields++;
  if (this.personalDetails?.aadharNumber) completedFields++;
  if (this.personalDetails?.panNumber) completedFields++;
  if (this.personalDetails?.permanentAddress?.city) completedFields++;
  if (this.personalDetails?.currentAddress?.city) completedFields++;

  // Check emergency contacts
  if (this.emergencyContacts?.length > 0) completedFields++;

  // Check education
  if (this.education?.length > 0) completedFields++;

  // Check work experience
  if (this.workExperience?.length > 0) completedFields++;

  // Check skills
  if (this.skills?.length > 0) completedFields++;

  // Check other fields
  if (this.profilePhoto) completedFields++;
  if (this.resume?.fileUrl) completedFields++;
  if (this.certificates?.length > 0) completedFields++;
  if (this.languages?.length > 0) completedFields++;
  if (this.socialProfiles?.linkedin) completedFields++;
  if (this.preferences?.language) completedFields++;

  this.completionPercentage = Math.round((completedFields / totalFields) * 100);
  this.isProfileComplete = this.completionPercentage >= 80;
  this.lastUpdated = new Date();
});

// Static method to get profile by userId
userProfileSchema.statics.findByUserId = async function (userId: string, organizationCode?: string) {
  const query: any = { userId };
  if (organizationCode) {
    query.organizationCode = organizationCode;
  }
  
  return this.findOne(query).populate('userId', 'fullName email employeeCode department designation');
};

// Static method to get incomplete profiles
userProfileSchema.statics.getIncompleteProfiles = async function (organizationCode: string) {
  return this.find({
    organizationCode,
    $or: [
      { isProfileComplete: false },
      { completionPercentage: { $lt: 80 } }
    ]
  })
  .populate('userId', 'fullName email employeeCode department')
  .sort({ completionPercentage: 1 });
};

export const UserProfile = model<IUserProfile>('UserProfile', userProfileSchema);