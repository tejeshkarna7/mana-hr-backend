// Removed Document import since we simplified the interfaces

export interface IOrganization {
  _id?: any;
  organizationCode: string;
  organizationName: string;
  displayName?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  settings?: {
    workingDays?: string[];
    workingHours?: {
      startTime?: string;
      endTime?: string;
      totalHours?: number;
      breakDuration?: number;
    };
    currency?: string;
    timezone?: string;
  };
  subscriptionInfo?: {
    plan?: 'free' | 'basic' | 'premium' | 'enterprise';
    maxEmployees?: number;
    expiryDate?: Date;
    isActive?: boolean;
  };
  employeeCounter: number;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  fullName?: string; // Virtual field
  getNextEmployeeId(): string;
}

export interface IRole {
  _id?: any;
  name: string;
  displayName: string;
  description?: string;
  permissions: any[];
  isActive: boolean;
  isSystemRole: boolean;
  level: number;
  dataAccessLevel: 1 | 2 | 3; // 1=ALL, 2=TEAM, 3=OWN
  organizationCode: string; // Multi-tenancy field
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  _id?: any;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  action: string;
  resource?: string;
  isActive: boolean;
  isSystemPermission: boolean;
  organizationCode?: string; // Multi-tenancy field (optional for system permissions)
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: number; // Role ID reference (numeric)
  roleDetails?: IRole; // Populated role details
  status: UserStatus;
  organization: string; // Organization name (legacy)
  organizationCode: string; // Organization code for multi-tenancy
  organizationDetails?: IOrganization; // Populated organization details
  lastLogin?: Date;
  lastPasswordChange?: Date;
  
  // Employee fields (merged from IEmployee)
  employeeCode?: string;
  gender?: Gender;
  dob?: Date;
  department?: string;
  designation?: string;
  joiningDate?: Date;
  employeeType?: EmployeeType;
  reportingManager?: string;
  salaryStructure?: ISalaryStructure;
  bankDetails?: IBankDetails;
  documents?: string[];
  createdBy?: string;
  updatedBy?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
}

// IEmployee interface removed - merged into IUser interface

export interface IAttendance {
  _id: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  totalHours?: number;
  status: AttendanceStatus;
  notes?: string;
  isLoggedIn?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeave {
  _id: string;
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedDate?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveType {
  _id: string;
  name: string;
  description?: string;
  daysAllowed: number;
  isCarryForward: boolean;
  maxCarryForwardDays?: number;
  isActive: boolean;
  color?: string;
  requiresApproval: boolean;
  minDaysNotice?: number;
  maxConsecutiveDays?: number;
  organizationCode: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayroll {
  _id: string;
  userId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: IAllowance[];
  deductions: IDeduction[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  payslipPdfUrl?: string;
  generatedBy: string;
  organizationCode: string;
  generatedDate: Date;
  status: PayrollStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument {
  _id: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedOn: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Extended User Profile interfaces for HRMS
export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  zipCode?: string;
}

export interface IPersonalDetails {
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  religion?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  aadharNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  drivingLicenseNumber?: string;
  permanentAddress?: IAddress;
  currentAddress?: IAddress;
  isSameAddress?: boolean;
}

export interface IEmergencyContact {
  name: string;
  relationship: 'father' | 'mother' | 'spouse' | 'sibling' | 'friend' | 'other';
  phone: string;
  email?: string;
  address?: string;
  isPrimary?: boolean;
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  grade?: string;
  percentage?: number;
}

export interface IWorkExperience {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  isCurrentJob?: boolean;
  description?: string;
  reasonForLeaving?: string;
}

export interface ISkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
  yearsOfExperience?: number;
}

export interface ICertificate {
  name?: string;
  issuedBy?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  fileUrl?: string;
}

export interface ILanguage {
  name: string;
  proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  canRead?: boolean;
  canWrite?: boolean;
  canSpeak?: boolean;
}

export interface ISocialProfiles {
  linkedin?: string;
  twitter?: string;
  github?: string;
  portfolio?: string;
}

export interface IPreferences {
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  language?: string;
  timezone?: string;
}

export interface IResume {
  fileName?: string;
  fileUrl?: string;
  uploadedOn?: Date;
}

export interface IUserProfile {
  _id: string;
  userId: string;
  organizationCode: string;
  personalDetails?: IPersonalDetails;
  emergencyContacts?: IEmergencyContact[];
  education?: IEducation[];
  workExperience?: IWorkExperience[];
  skills?: ISkill[];
  profilePhoto?: string;
  resume?: IResume;
  certificates?: ICertificate[];
  languages?: ILanguage[];
  socialProfiles?: ISocialProfiles;
  preferences?: IPreferences;
  reportingManagers?: string[];
  isProfileComplete?: boolean;
  completionPercentage?: number;
  lastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanySettings {
  _id: string;
  companyName: string;
  companyLogo?: string;
  address: IAddress;
  contactInfo: IContactInfo;
  workingDays: string[];
  workingHours: IWorkingHours;
  currency: string;
  timezone: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendanceSettings {
  _id: string;
  autoCheckOut: boolean;
  autoCheckOutTime: string;
  lateThreshold: number;
  earlyDepartureThreshold: number;
  overtimeThreshold: number;
  requireLocationTracking: boolean;
  allowedLocations: ILocation[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Supporting interfaces
export interface ISalaryStructure {
  basicSalary: number;
  allowances: IAllowance[];
  deductions: IDeduction[];
}

export interface IAllowance {
  type: string;
  amount: number;
  isPercentage: boolean;
}

export interface IDeduction {
  type: string;
  amount: number;
  isPercentage: boolean;
}

export interface IBankDetails {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
}

export interface IContactInfo {
  email: string;
  phone: string;
  website?: string;
}

export interface IWorkingHours {
  startTime: string;
  endTime: string;
  totalHours: number;
  breakDuration: number;
}

export interface ILocation {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// Enums
// UserRole enum is deprecated in favor of dynamic role system
// export enum UserRole {
//   SUPER_ADMIN = 1,
//   ADMIN = 2,
//   HR = 3,
//   MANAGER = 4,
//   EMPLOYEE = 5,
// }

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum PermissionModule {
  USERS = 'users',
  EMPLOYEES = 'employees',
  ATTENDANCE = 'attendance',
  LEAVE = 'leave',
  PAYROLL = 'payroll',
  DOCUMENTS = 'documents',
  SETTINGS = 'settings',
  REPORTS = 'reports',
  DASHBOARD = 'dashboard',
  SYSTEM = 'system',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIGURE = 'configure',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum EmployeeType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  WORK_FROM_HOME = 'work_from_home',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PayrollStatus {
  DRAFT = 'draft',
  GENERATED = 'generated',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// Role and Permission Interfaces are defined above

export interface IRoleCreateInput {
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isActive?: boolean;
}

export interface IRoleUpdateInput {
  name?: string;
  displayName?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
}

export interface IPermissionCreateInput {
  name: string;
  displayName?: string;
  description?: string;
  module: PermissionModule;
  action: PermissionAction;
  resource?: string;
}

export interface IPermissionUpdateInput {
  name?: string;
  displayName?: string;
  description?: string;
  module?: PermissionModule;
  action?: PermissionAction;
  resource?: string;
}

export interface IOrganizationCreateInput {
  organizationCode: string;
  organizationName: string;
  displayName?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  settings?: {
    workingDays?: string[];
    workingHours?: {
      startTime?: string;
      endTime?: string;
      totalHours?: number;
      breakDuration?: number;
    };
    currency?: string;
    timezone?: string;
  };
  subscriptionInfo?: {
    plan?: 'free' | 'basic' | 'premium' | 'enterprise';
    maxEmployees?: number;
    expiryDate?: Date;
    isActive?: boolean;
  };
}

export interface IOrganizationUpdateInput {
  organizationName?: string;
  displayName?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  settings?: {
    workingDays?: string[];
    workingHours?: {
      startTime?: string;
      endTime?: string;
      totalHours?: number;
      breakDuration?: number;
    };
    currency?: string;
    timezone?: string;
  };
  subscriptionInfo?: {
    plan?: 'free' | 'basic' | 'premium' | 'enterprise';
    maxEmployees?: number;
    expiryDate?: Date;
    isActive?: boolean;
  };
}