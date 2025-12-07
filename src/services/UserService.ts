import { User } from '@/models/index.js';
import { IUser, UserStatus, ISalaryStructure, IBankDetails } from '@/types/index.js';
import { AppError } from '@/middlewares/error.js';
import bcrypt from 'bcrypt';

export interface CreateUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: number;
  organization: string;
  organizationCode: string;
  employeeCode?: string;
  department?: string;
  profilePicture?: string;
  status?: string;
  createdBy?: string;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  role?: 1 | 2 | 3 | 4 | 5; // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
  employeeId?: string;
  department?: string;
  phoneNumber?: string;
  profilePicture?: string;
  isActive?: boolean;
  lastPasswordChange?: Date;
}

export interface UserFilters {
  role?: 1 | 2 | 3 | 4 | 5; // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
  department?: string;
  status?: string;
  search?: string;
  employeeCode?: string;
  organizationCode?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEmployeeData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  dob: Date;
  department: string;
  designation: string;
  organization: string;
  joiningDate?: Date;
  employeeType: string;
  reportingManager?: string;
  salaryStructure: ISalaryStructure;
  bankDetails: IBankDetails;
  role?: string;
  status?: UserStatus;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  documents?: string[];
}

class UserService {

  async createUser(userData: CreateUserData, organizationCode?: string): Promise<IUser> {
    // Use organization code from parameter or userData
    const orgCode = organizationCode || userData.organizationCode;
    
    // Check if user already exists in the same organization
    const existingUser = await User.findOne({ 
      email: userData.email,
      organizationCode: orgCode
    });
    if (existingUser) {
      throw new AppError('User with this email already exists in this organization', 400);
    }

    // Check if phone number is already in use in the same organization
    if (userData.phone) {
      const existingPhone = await User.findOne({ 
        phone: userData.phone,
        organizationCode: orgCode
      });
      if (existingPhone) {
        throw new AppError('User with this phone number already exists in this organization', 400);
      }
    }

    // Set default role if not provided
    const role = userData.role || 5; // Default to EMPLOYEE

    const user = await User.create({
      ...userData,
      organizationCode: orgCode,
      role,
      status: userData.status || UserStatus.ACTIVE,
      lastPasswordChange: new Date(),
    });

    return user;
  }

  async getUserById(id: string, organizationCode?: string): Promise<IUser | null> {
    const query: any = { _id: id };
    
    if (organizationCode) {
      query.organizationCode = organizationCode;
    }
    
    return User.findOne(query).select('-password');
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('-password');
  }

  async getUserByEmployeeId(employeeId: string): Promise<IUser | null> {
    return User.findOne({ employeeId }).select('-password');
  }

  async updateUser(id: string, updateData: UpdateUserData, organizationCode?: string): Promise<IUser | null> {
    const query: any = { _id: id };
    if (organizationCode) {
      query.organizationCode = organizationCode;
    }
    
    // Check if email is being updated and if it's unique within organization
    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        _id: { $ne: id },
        ...(organizationCode && { organizationCode })
      });
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }
    }

    const user = await User.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    return user;
  }

  async deleteUser(id: string, organizationCode?: string): Promise<boolean> {
    const query: any = { _id: id };
    if (organizationCode) {
      query.organizationCode = organizationCode;
    }
    
    const result = await User.findOneAndDelete(query);
    return !!result;
  }

  async getUsers(filters: UserFilters, options: PaginationOptions): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Organization filtering is mandatory
    if (filters.organizationCode) {
      query.organizationCode = filters.organizationCode;
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.department) {
      query.department = filters.department;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.employeeCode) {
      query.employeeCode = filters.employeeCode;
    }

    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { employeeId: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: any = {};
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = sortOrder;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users as IUser[],
      total,
      page,
      totalPages,
    };
  }

  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Ensure new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    // Hash new password
    // Note: Password will be hashed by pre-save middleware in User model

    // Update password and lastPasswordChange
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Return user without password
    return User.findById(userId).select('-password') as Promise<IUser>;
  }

  async resetPassword(userId: string, newPassword: string): Promise<IUser> {
    // Note: Password will be hashed by pre-save middleware in User model
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Return user without password
    return User.findById(userId).select('-password') as Promise<IUser>;
  }

  async activateUser(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async deactivateUser(userId: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async getUsersByRole(role: number): Promise<IUser[]> {
    return User.find({ role, isActive: true }).select('-password').lean() as Promise<IUser[]>;
  }

  async getUsersByDepartment(department: string): Promise<IUser[]> {
    return User.find({ department, isActive: true }).select('-password').lean() as Promise<IUser[]>;
  }

  async getActiveUsersCount(): Promise<number> {
    return User.countDocuments({ isActive: true });
  }

  async getUsersCountByRole(): Promise<{ [key: string]: number }> {
    const result = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    return result.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  async getUserActivity(userId: string, days: number = 30): Promise<{
    lastLogin: Date | null;
    loginCount: number;
    passwordChanges: number;
    profileUpdates: number;
  }> {
    const user = await User.findById(userId).select('lastLogin lastPasswordChange updatedAt');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    // This is a simplified version. In a real application, you'd track these in separate collections
    return {
      lastLogin: user.lastLogin || null,
      loginCount: 0, // Would be tracked in a login tracking collection
      passwordChanges: user.lastPasswordChange && user.lastPasswordChange > dateLimit ? 1 : 0,
      profileUpdates: user.updatedAt > dateLimit ? 1 : 0,
    };
  }

  async generateUserReport(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: { [key: string]: number };
    recentUsers: IUser[];
  }> {
    const [totalUsers, activeUsers, usersByRole, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      this.getUsersCountByRole(),
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole,
      recentUsers: recentUsers as IUser[],
    };
  }

  async updateProfilePicture(userId: string, profilePictureUrl: string): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async bulkCreateUsers(usersData: CreateUserData[]): Promise<{
    created: IUser[];
    errors: Array<{ email: string; error: string }>;
  }> {
    const created: IUser[] = [];
    const errors: Array<{ email: string; error: string }> = [];

    for (const userData of usersData) {
      try {
        const user = await this.createUser(userData);
        created.push(user);
      } catch (error) {
        errors.push({
          email: userData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created, errors };
  }

  async validatePasswordStrength(password: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }



  async getById(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateUserProfile(userId: string, updateData: any): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async getUserStatistics(): Promise<any> {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: UserStatus.ACTIVE });
    const inactiveUsers = await User.countDocuments({ status: UserStatus.INACTIVE });
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: {
        superAdmin: await User.countDocuments({ role: 1 }), // SUPER_ADMIN
        admin: await User.countDocuments({ role: 2 }), // ADMIN
        hr: await User.countDocuments({ role: 3 }), // HR
        manager: await User.countDocuments({ role: 4 }), // MANAGER
        employee: await User.countDocuments({ role: 5 }) // EMPLOYEE
      }
    };
  }

  async bulkUserOperations(operation: string, userIds: string[], _data: any, _performedBy: string): Promise<any> {
    const result = { processed: userIds.length, successful: 0, failed: 0 };
    
    for (const userId of userIds) {
      try {
        switch (operation) {
          case 'activate':
            await User.findByIdAndUpdate(userId, { status: UserStatus.ACTIVE });
            break;
          case 'deactivate':
            await User.findByIdAndUpdate(userId, { status: UserStatus.INACTIVE });
            break;
          case 'delete':
            await User.findByIdAndDelete(userId);
            break;
        }
        result.successful++;
      } catch (error) {
        result.failed++;
      }
    }
    
    return result;
  }

  // Employee Management Methods
  async createEmployee(employeeData: CreateEmployeeData, createdBy: string): Promise<IUser> {
    // Check if user with email already exists
    const existingUser = await User.findOne({ email: employeeData.email });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Check if phone number is already in use
    const existingPhone = await User.findOne({ phone: employeeData.phone });
    if (existingPhone) {
      throw new AppError('User with this phone number already exists', 400);
    }

    // Validate reporting manager if provided
    if (employeeData.reportingManager) {
      const manager = await User.findById(employeeData.reportingManager);
      if (!manager) {
        throw new AppError('Invalid reporting manager', 400);
      }
    }

    // Create employee as a user with employee role
    const employee = await User.create({
      ...employeeData,
      role: employeeData.role || 5, // Default to EMPLOYEE
      status: employeeData.status || UserStatus.ACTIVE,
      createdBy,
      updatedBy: createdBy,
    });

    return employee;
  }

  async getAllEmployees(
    page = 1,
    limit = 10,
    search?: string,
    department?: string,
    status?: UserStatus,
    sort?: string
  ): Promise<{
    employees: IUser[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    // Query only users with employee-related roles
    let query: any = {
      role: { $in: ['employee', 'manager', 'hr'] },
      employeeCode: { $exists: true }
    };
    
    if (search) {
      query = {
        ...query,
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { employeeCode: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } },
          { designation: { $regex: search, $options: 'i' } },
        ],
      };
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    let sortOption: any = { createdAt: -1 };
    
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const [employees, total] = await Promise.all([
      User.find(query)
        .populate('reportingManager', 'fullName employeeCode designation')
        .populate('createdBy', 'fullName email')
        .populate('updatedBy', 'fullName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      employees: employees as any[],
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getEmployeeById(id: string): Promise<IUser> {
    const employee = await User.findById(id)
      .populate('reportingManager', 'fullName employeeCode designation')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Employee found, return the data
    return employee;
  }

  async updateEmployee(id: string, updateData: UpdateEmployeeData, updatedBy: string): Promise<IUser> {
    // Check if employee exists
    const existingEmployee = await User.findById(id);
    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Role validation is now handled by the dynamic role system
    // Skip role-specific validation as roles are now dynamic

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingEmployee.email) {
      const emailExists = await User.findOne({ email: updateData.email, _id: { $ne: id } });
      if (emailExists) {
        throw new AppError('User with this email already exists', 400);
      }
    }

    // Check phone uniqueness if phone is being updated
    if (updateData.phone && updateData.phone !== existingEmployee.phone) {
      const phoneExists = await User.findOne({ phone: updateData.phone, _id: { $ne: id } });
      if (phoneExists) {
        throw new AppError('User with this phone number already exists', 400);
      }
    }

    // Validate reporting manager if provided
    if (updateData.reportingManager) {
      const manager = await User.findById(updateData.reportingManager);
      if (!manager) {
        throw new AppError('Invalid reporting manager', 400);
      }
      
      // Prevent self-reporting
      if (updateData.reportingManager === id) {
        throw new AppError('Employee cannot report to themselves', 400);
      }
    }

    const employee = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy },
      { new: true, runValidators: true }
    )
      .populate('reportingManager', 'fullName employeeCode designation')
      .populate('updatedBy', 'fullName email');

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return employee;
  }

  async deleteEmployee(id: string, deletedBy: string): Promise<void> {
    const employee = await User.findById(id);
    
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Role validation is now handled by the dynamic role system
    // Skip role-specific validation as roles are now dynamic

    // Set status to inactive (terminated)
    await User.findByIdAndUpdate(id, {
      status: UserStatus.INACTIVE,
      updatedBy: deletedBy,
    });
  }

  async getDepartments(): Promise<string[]> {
    const departments = await User.distinct('department', {
      role: { $in: ['employee', 'manager', 'hr'] },
      employeeCode: { $exists: true }
    });
    return departments.filter(dept => dept); // Remove null/undefined values
  }

  async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    byDepartment: Array<{ _id: string; count: number }>;
    byEmployeeType: Array<{ _id: string; count: number }>;
  }> {
    const employeeQuery = {
      role: { $in: ['employee', 'manager', 'hr'] },
      employeeCode: { $exists: true }
    };

    const [
      total,
      active,
      inactive,
      suspended,
      byDepartment,
      byEmployeeType,
    ] = await Promise.all([
      User.countDocuments(employeeQuery),
      User.countDocuments({ ...employeeQuery, status: UserStatus.ACTIVE }),
      User.countDocuments({ ...employeeQuery, status: UserStatus.INACTIVE }),
      User.countDocuments({ ...employeeQuery, status: UserStatus.SUSPENDED }),
      User.aggregate([
        { $match: employeeQuery },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: employeeQuery },
        { $group: { _id: '$employeeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      byDepartment,
      byEmployeeType,
    };
  }

  /**
   * Get users with role level above the specified role
   * Role hierarchy: 1 (Super Admin) > 2 (Admin) > 3 (HR) > 4 (Manager) > 5 (Employee)
   */
  async getUsersAboveRole(role: number, organizationCode: string): Promise<Array<{ userId: string; email: string; fullName: string; role: number }>> {
    // Get users with role < provided role (lower number = higher privilege)
    const users = await User.find({
      role: { $lt: role },
      organizationCode,
      status: UserStatus.ACTIVE
    })
    .select('_id email fullName role')
    .sort({ role: 1, fullName: 1 })
    .lean();

    return users.map(user => ({
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role
    }));
  }
}

export default new UserService();