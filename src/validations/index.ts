import { z } from 'zod';
import { UserStatus, Gender, EmployeeType, AttendanceStatus, LeaveStatus, PermissionModule, PermissionAction } from '@/types/index.js';

// Clock In/Out Validations
export const clockInSchema = z.object({
  body: z.object({
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
});

export const clockOutSchema = z.object({
  body: z.object({
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
});

// Auth Validations
export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').trim(),
    email: z.string().email('Please provide a valid email').toLowerCase().trim(),
    phone: z.string().regex(/^[0-9]{10,15}$/, 'Please provide a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password cannot exceed 128 characters'),
    role: z.number().min(1).max(5).optional(), // Numeric role (1-5)
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization name cannot exceed 100 characters').trim(),
    organizationCode: z.string()
      .min(2, 'Organization code must be at least 2 characters')
      .max(10, 'Organization code cannot exceed 10 characters')
      .regex(/^[A-Z0-9]+$/, 'Organization code must contain only uppercase letters and numbers')
      .transform(str => str.toUpperCase()),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email').toLowerCase().trim(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
  params: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
});

// User Employee Validations (integrated)
export const createUserEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').trim(),
    email: z.string().email('Please provide a valid email').toLowerCase().trim(),
    phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Please provide a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization name cannot exceed 100 characters').trim(),
    gender: z.nativeEnum(Gender),
    dob: z.string().datetime('Please provide a valid date').or(z.date()),
    department: z.string().min(1, 'Department is required').max(100, 'Department cannot exceed 100 characters').trim(),
    designation: z.string().min(1, 'Designation is required').max(100, 'Designation cannot exceed 100 characters').trim(),
    joiningDate: z.string().datetime('Please provide a valid date').or(z.date()).optional(),
    employeeType: z.nativeEnum(EmployeeType),
    reportingManager: z.string().optional(),
    role: z.number().int().min(1).max(5).optional(), // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
    salaryStructure: z.object({
      basicSalary: z.number().min(0, 'Basic salary must be positive'),
      allowances: z.array(z.object({
        type: z.string().min(1, 'Allowance type is required'),
        amount: z.number().min(0, 'Allowance amount must be positive'),
        isPercentage: z.boolean().default(false),
      })).default([]),
      deductions: z.array(z.object({
        type: z.string().min(1, 'Deduction type is required'),
        amount: z.number().min(0, 'Deduction amount must be positive'),
        isPercentage: z.boolean().default(false),
      })).default([]),
    }),
    bankDetails: z.object({
      accountHolderName: z.string().min(1, 'Account holder name is required').max(100, 'Account holder name cannot exceed 100 characters'),
      accountNumber: z.string().regex(/^[0-9]{9,18}$/, 'Please provide a valid account number'),
      bankName: z.string().min(1, 'Bank name is required').max(100, 'Bank name cannot exceed 100 characters'),
      ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code').toUpperCase(),
      branchName: z.string().min(1, 'Branch name is required').max(100, 'Branch name cannot exceed 100 characters'),
    }),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const updateUserEmployeeSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').trim().optional(),
    email: z.string().email('Please provide a valid email').toLowerCase().trim().optional(),
    phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Please provide a valid phone number').optional(),
    gender: z.nativeEnum(Gender).optional(),
    dob: z.string().datetime('Please provide a valid date').or(z.date()).optional(),
    department: z.string().min(1, 'Department is required').max(100, 'Department cannot exceed 100 characters').trim().optional(),
    designation: z.string().min(1, 'Designation is required').max(100, 'Designation cannot exceed 100 characters').trim().optional(),
    employeeType: z.nativeEnum(EmployeeType).optional(),
    reportingManager: z.string().optional(),
    role: z.number().int().min(1).max(5).optional(), // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
    salaryStructure: z.object({
      basicSalary: z.number().min(0, 'Basic salary must be positive'),
      allowances: z.array(z.object({
        type: z.string().min(1, 'Allowance type is required'),
        amount: z.number().min(0, 'Allowance amount must be positive'),
        isPercentage: z.boolean().default(false),
      })).default([]),
      deductions: z.array(z.object({
        type: z.string().min(1, 'Deduction type is required'),
        amount: z.number().min(0, 'Deduction amount must be positive'),
        isPercentage: z.boolean().default(false),
      })).default([]),
    }).optional(),
    bankDetails: z.object({
      accountHolderName: z.string().min(1, 'Account holder name is required').max(100, 'Account holder name cannot exceed 100 characters'),
      accountNumber: z.string().regex(/^[0-9]{9,18}$/, 'Please provide a valid account number'),
      bankName: z.string().min(1, 'Bank name is required').max(100, 'Bank name cannot exceed 100 characters'),
      ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code').toUpperCase(),
      branchName: z.string().min(1, 'Branch name is required').max(100, 'Branch name cannot exceed 100 characters'),
    }).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Employee ID is required'),
  }),
});

// Attendance Validations
export const markAttendanceSchema = z.object({
  body: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    checkIn: z.string().datetime('Please provide a valid check-in time').or(z.date()),
    checkOut: z.string().datetime('Please provide a valid check-out time').or(z.date()).optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  }),
});

export const getDailyAttendanceSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  }),
});

export const getMonthlyAttendanceSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  }),
  params: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
  }),
});

// Leave Type Validations
export const createLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Leave type name is required').max(100, 'Leave type name cannot exceed 100 characters').trim(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    maxDaysPerYear: z.number().int().min(1, 'Maximum days must be at least 1').max(365, 'Maximum days cannot exceed 365'),
    carryForward: z.boolean().default(false),
    carryForwardDays: z.number().int().min(0, 'Carry forward days must be positive').optional(),
    isActive: z.boolean().default(true),
  }),
});

export const updateLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Leave type name is required').max(100, 'Leave type name cannot exceed 100 characters').trim().optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    maxDaysPerYear: z.number().int().min(1, 'Maximum days must be at least 1').max(365, 'Maximum days cannot exceed 365').optional(),
    carryForward: z.boolean().optional(),
    carryForwardDays: z.number().int().min(0, 'Carry forward days must be positive').optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Leave type ID is required'),
  }),
});

// Leave Validations
export const applyLeaveSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
    leaveType: z.string().min(1, 'Leave type is required'),
    startDate: z.string().datetime('Please provide a valid start date').or(z.date()),
    endDate: z.string().datetime('Please provide a valid end date').or(z.date()),
    reason: z.string().min(1, 'Reason is required').max(1000, 'Reason cannot exceed 1000 characters'),
  }),
});

export const updateLeaveSchema = z.object({
  body: z.object({
    status: z.nativeEnum(LeaveStatus),
    rejectionReason: z.string().max(500, 'Rejection reason cannot exceed 500 characters').optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Leave ID is required'),
  }),
});

// Payroll Validations
export const generatePayrollSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  }),
});

export const getPayrollSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\\d{4}-\\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  }),
  params: z.object({
    userId: z.string().min(1, 'User ID is required').optional(),
  }),
});

// Document Validations
export const uploadDocumentSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
});

export const getDocumentsSchema = z.object({
  query: z.object({
    userId: z.string().min(1, 'User ID is required'),
    fileType: z.string().optional(),
  }),
});

// Settings Validations
export const updateCompanySettingsSchema = z.object({
  body: z.object({
    companyName: z.string().min(1, 'Company name is required').max(200, 'Company name cannot exceed 200 characters').trim().optional(),
    companyLogo: z.string().optional(),
    address: z.object({
      street: z.string().min(1, 'Street is required').max(200, 'Street cannot exceed 200 characters'),
      city: z.string().min(1, 'City is required').max(100, 'City cannot exceed 100 characters'),
      state: z.string().min(1, 'State is required').max(100, 'State cannot exceed 100 characters'),
      country: z.string().min(1, 'Country is required').max(100, 'Country cannot exceed 100 characters'),
      zipCode: z.string().min(1, 'Zip code is required').max(20, 'Zip code cannot exceed 20 characters'),
    }).optional(),
    contactInfo: z.object({
      email: z.string().email('Please provide a valid email').toLowerCase(),
      phone: z.string().regex(/^[0-9\-\+\s\(\)]{10,20}$/, 'Please provide a valid phone number'),
      website: z.string().url('Please provide a valid website URL').optional(),
    }).optional(),
    workingDays: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).optional(),
    workingHours: z.object({
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
      totalHours: z.number().min(1, 'Total hours must be at least 1').max(24, 'Total hours cannot exceed 24'),
      breakDuration: z.number().min(0, 'Break duration must be positive').max(480, 'Break duration cannot exceed 8 hours'),
    }).optional(),
    currency: z.string().length(3, 'Currency code must be 3 characters').toUpperCase().optional(),
    timezone: z.string().min(1, 'Timezone is required').optional(),
  }),
});

export const updateAttendanceSettingsSchema = z.object({
  body: z.object({
    autoCheckOut: z.boolean().optional(),
    autoCheckOutTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Auto check-out time must be in HH:MM format').optional(),
    lateThreshold: z.number().min(0, 'Late threshold must be positive').max(480, 'Late threshold cannot exceed 8 hours').optional(),
    earlyDepartureThreshold: z.number().min(0, 'Early departure threshold must be positive').max(480, 'Early departure threshold cannot exceed 8 hours').optional(),
    overtimeThreshold: z.number().min(1, 'Overtime threshold must be at least 1 minute').max(960, 'Overtime threshold cannot exceed 16 hours').optional(),
    requireLocationTracking: z.boolean().optional(),
    allowedLocations: z.array(z.object({
      name: z.string().min(1, 'Location name is required').max(100, 'Location name cannot exceed 100 characters'),
      latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
      longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
      radius: z.number().min(1, 'Radius must be at least 1 meter').max(10000, 'Radius cannot exceed 10km'),
    })).optional(),
  }),
});

// ManaBot Validations
export const manaBotQuerySchema = z.object({
  body: z.object({
    query: z.string().min(1, 'Query is required').max(500, 'Query cannot exceed 500 characters').trim(),
    employeeId: z.string().min(1, 'Employee ID is required').optional(),
  }),
});

// Role Validation Schemas
export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Role name is required').max(50, 'Role name cannot exceed 50 characters').trim(),
    displayName: z.string().min(1, 'Display name is required').max(100, 'Display name cannot exceed 100 characters').trim(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    level: z.number().int().min(1, 'Level must be at least 1').max(100, 'Level cannot exceed 100'),
    isActive: z.boolean().optional(),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Role name is required').max(50, 'Role name cannot exceed 50 characters').trim().optional(),
    displayName: z.string().min(1, 'Display name is required').max(100, 'Display name cannot exceed 100 characters').trim().optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    level: z.number().int().min(1, 'Level must be at least 1').max(100, 'Level cannot exceed 100').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const managePermissionsSchema = z.object({
  body: z.object({
    permissions: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid permission ID')).min(1, 'At least one permission is required'),
  }),
});

// Permission Validation Schemas
export const createPermissionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Permission name is required').max(100, 'Permission name cannot exceed 100 characters').trim(),
    description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
    module: z.nativeEnum(PermissionModule),
    action: z.nativeEnum(PermissionAction),
    resource: z.string().min(1, 'Resource is required').max(100, 'Resource cannot exceed 100 characters').trim(),
  }),
});

export const updatePermissionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Permission name is required').max(100, 'Permission name cannot exceed 100 characters').trim().optional(),
    description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
    module: z.nativeEnum(PermissionModule).optional(),
    action: z.nativeEnum(PermissionAction).optional(),
    resource: z.string().min(1, 'Resource is required').max(100, 'Resource cannot exceed 100 characters').trim().optional(),
  }),
});

export const bulkCreatePermissionsSchema = z.object({
  body: z.object({
    permissions: z.array(z.object({
      name: z.string().min(1, 'Permission name is required').max(100, 'Permission name cannot exceed 100 characters').trim(),
      description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
      module: z.nativeEnum(PermissionModule),
      action: z.nativeEnum(PermissionAction),
      resource: z.string().min(1, 'Resource is required').max(100, 'Resource cannot exceed 100 characters').trim(),
    })).min(1, 'At least one permission is required'),
  }),
});

// Common Validations
export const mongoIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid ID'),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1, 'Page must be at least 1')).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')).optional(),
    sort: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Export validation groups
export const authValidation = {
  register: registerSchema,
  login: loginSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
};

export const roleValidation = {
  createRole: createRoleSchema,
  updateRole: updateRoleSchema,
  managePermissions: managePermissionsSchema,
};

export const permissionValidation = {
  createPermission: createPermissionSchema,
  updatePermission: updatePermissionSchema,
  bulkCreatePermissions: bulkCreatePermissionsSchema,
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateEmployeeInput = z.infer<typeof createUserEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateUserEmployeeSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
export type UpdateAttendanceSettingsInput = z.infer<typeof updateAttendanceSettingsSchema>;
export type ManaBotQueryInput = z.infer<typeof manaBotQuerySchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

// Organization Validations
export const createOrganizationSchema = z.object({
  body: z.object({
    organizationCode: z.string()
      .min(2, 'Organization code must be at least 2 characters')
      .max(10, 'Organization code cannot exceed 10 characters')
      .regex(/^[A-Z0-9]+$/, 'Organization code must contain only uppercase letters and numbers')
      .transform(str => str.toUpperCase()),
    organizationName: z.string()
      .min(1, 'Organization name is required')
      .max(100, 'Organization name cannot exceed 100 characters')
      .trim(),
    displayName: z.string()
      .max(150, 'Display name cannot exceed 150 characters')
      .trim()
      .optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    address: z.object({
      street: z.string().max(200).trim().optional(),
      city: z.string().max(100).trim().optional(),
      state: z.string().max(100).trim().optional(),
      country: z.string().max(100).trim().optional(),
      zipCode: z.string().max(20).trim().optional(),
    }).optional(),
    contactInfo: z.object({
      email: z.string().email().toLowerCase().trim().optional(),
      phone: z.string().max(20).trim().optional(),
      website: z.string().url().max(200).trim().optional(),
    }).optional(),
    settings: z.object({
      workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
      workingHours: z.object({
        startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        totalHours: z.number().min(1).max(24).optional(),
        breakDuration: z.number().min(0).max(8).optional(),
      }).optional(),
      currency: z.string().max(10).trim().optional(),
      timezone: z.string().max(50).trim().optional(),
    }).optional(),
    subscriptionInfo: z.object({
      plan: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
      maxEmployees: z.number().min(1).optional(),
      expiryDate: z.date().optional(),
    }).optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  body: z.object({
    organizationName: z.string()
      .min(1, 'Organization name is required')
      .max(100, 'Organization name cannot exceed 100 characters')
      .trim()
      .optional(),
    displayName: z.string()
      .max(150, 'Display name cannot exceed 150 characters')
      .trim()
      .optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    address: z.object({
      street: z.string().max(200).trim().optional(),
      city: z.string().max(100).trim().optional(),
      state: z.string().max(100).trim().optional(),
      country: z.string().max(100).trim().optional(),
      zipCode: z.string().max(20).trim().optional(),
    }).optional(),
    contactInfo: z.object({
      email: z.string().email().toLowerCase().trim().optional(),
      phone: z.string().max(20).trim().optional(),
      website: z.string().url().max(200).trim().optional(),
    }).optional(),
    settings: z.object({
      workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
      workingHours: z.object({
        startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        totalHours: z.number().min(1).max(24).optional(),
        breakDuration: z.number().min(0).max(8).optional(),
      }).optional(),
      currency: z.string().max(10).trim().optional(),
      timezone: z.string().max(50).trim().optional(),
    }).optional(),
    subscriptionInfo: z.object({
      plan: z.enum(['free', 'basic', 'premium', 'enterprise']).optional(),
      maxEmployees: z.number().min(1).optional(),
      expiryDate: z.date().optional(),
    }).optional(),
  }),
});

// User Management Validations
export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').trim(),
    email: z.string().email('Please provide a valid email').toLowerCase().trim(),
    phone: z.string().regex(/^[0-9]{10,15}$/, 'Please provide a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password cannot exceed 128 characters'),
    role: z.number().int().min(1).max(5).optional(), // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization name cannot exceed 100 characters').trim(),
    department: z.string().max(100, 'Department cannot exceed 100 characters').trim().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').trim().optional(),
    email: z.string().email('Please provide a valid email').toLowerCase().trim().optional(),
    phone: z.string().regex(/^[0-9]{10,15}$/, 'Please provide a valid phone number').optional(),
    role: z.number().int().min(1).max(5).optional(), // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
    organization: z.string().min(1, 'Organization is required').max(100, 'Organization name cannot exceed 100 characters').trim().optional(),
    department: z.string().max(100, 'Department cannot exceed 100 characters').trim().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const organizationValidation = {
  createOrganization: createOrganizationSchema,
  updateOrganization: updateOrganizationSchema,
};

export const userValidation = {
  create: createUserEmployeeSchema,
  update: updateUserEmployeeSchema,
  createUser: createUserSchema,
  updateUser: updateUserSchema,
};

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;