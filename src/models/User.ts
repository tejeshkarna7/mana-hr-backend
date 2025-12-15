import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import {
  IUser,
  UserStatus,
  Gender,
  EmployeeType,
  ISalaryStructure,
  IBankDetails,
} from '@/types/index.js';

const salaryStructureSchema = new Schema<ISalaryStructure>(
  {
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary must be positive'],
    },
    allowances: [
      {
        type: {
          type: String,
          required: [true, 'Allowance type is required'],
          trim: true,
        },
        amount: {
          type: Number,
          required: [true, 'Allowance amount is required'],
          min: [0, 'Allowance amount must be positive'],
        },
        isPercentage: {
          type: Boolean,
          default: false,
        },
      },
    ],
    deductions: [
      {
        type: {
          type: String,
          required: [true, 'Deduction type is required'],
          trim: true,
        },
        amount: {
          type: Number,
          required: [true, 'Deduction amount is required'],
          min: [0, 'Deduction amount must be positive'],
        },
        isPercentage: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { _id: false }
);

const bankDetailsSchema = new Schema<IBankDetails>(
  {
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
      maxlength: [100, 'Account holder name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
      match: [/^[0-9]{9,18}$/, 'Please provide a valid account number'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code'],
    },
    branchName: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+]?[0-9]{10,15}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: Number, // Use Number type for role ID reference
      ref: 'Role',
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      required: true,
    },
    organization: {
      type: String,
      required: [true, 'Organization is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    organizationCode: {
      type: String,
      required: [true, 'Organization code is required'],
      trim: true,
      uppercase: true,
      maxlength: [10, 'Organization code cannot exceed 10 characters'],
      ref: 'Organization',
    },
    lastLogin: {
      type: Date,
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },

    // Employee fields (merged from Employee model)
    employeeCode: {
      type: String,
      sparse: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Employee code cannot exceed 20 characters'],
    },
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
    dob: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    joiningDate: {
      type: Date,
    },
    employeeType: {
      type: String,
      enum: Object.values(EmployeeType),
    },
    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    salaryStructure: {
      type: salaryStructureSchema,
    },
    bankDetails: {
      type: bankDetailsSchema,
    },
    documents: [
      {
        type: String,
        trim: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete (ret as any).password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret) => {
        delete (ret as any).password;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ organizationCode: 1 });
userSchema.index(
  { employeeCode: 1, organizationCode: 1 },
  { sparse: true, unique: true }
); // Composite unique index
userSchema.index({ department: 1 });
userSchema.index({ designation: 1 });
userSchema.index({ employeeType: 1 });
userSchema.index({ reportingManager: 1 });

// Virtual for full name search
userSchema.virtual('searchName').get(function (this: IUser) {
  return this.fullName.toLowerCase();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to generate employee code (only for employee roles)
userSchema.pre('save', async function (this: any, next) {
  if (!this.isNew) return next();

  // Only generate employee code if user doesn't have one and has organization code
  if (!this.employeeCode && this.organizationCode) {
    try {
      // Count existing users in the same organization
      const count = await this.constructor.countDocuments({
        organizationCode: this.organizationCode,
        employeeCode: { $exists: true },
      });
      this.employeeCode = `${this.organizationCode}${String(count + 1).padStart(4, '0')}`;
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Method to update last login
userSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

export const User = model<IUser>('User', userSchema);
