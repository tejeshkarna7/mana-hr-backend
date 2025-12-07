import { Request, Response, NextFunction } from 'express';
import UserService from '@/services/UserService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';
import { OrganizationRequest } from '@/middlewares/organizationCode.js';

type AuthRequest = AuthenticatedRequest & OrganizationRequest;

export class UserController {
  private userService: typeof UserService;

  constructor() {
    this.userService = UserService;
  }

  /**
   * Create user
   * POST /api/v1/users
   */
  createUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData = req.body;
      const organizationCode = req.organizationCode;
      const createdBy = req.user!.userId;

      // Validate required fields
      if (!userData.fullName || !userData.email || !userData.phone || !userData.password) {
        throw new AppError('fullName, email, phone, and password are required', 400);
      }

      if (!organizationCode) {
        throw new AppError('Organization code is required', 400);
      }

      const user = await this.userService.createUser({
        ...userData,
        organizationCode,
        createdBy
      }, organizationCode);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get users
   * GET /api/v1/users
   */
  getUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const department = req.query.department as string;
      const organizationCode = req.organizationCode;

      if (!organizationCode) {
        throw new AppError('Organization code is required', 400);
      }

      const filters = { 
        search, 
        role: (role ? parseInt(role) : undefined) as 1 | 2 | 3 | 4 | 5 | undefined, 
        status, 
        department,
        organizationCode
      };
      
      const users = await this.userService.getUsers(filters, { page, limit });

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  getUserById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationCode = req.organizationCode;
      
      const user = await this.userService.getUserById(id, organizationCode);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user
   * PUT /api/v1/users/:id
   */
  updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const organizationCode = req.organizationCode;

      const user = await this.userService.updateUser(id, updateData, organizationCode);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user
   * DELETE /api/v1/users/:id
   */
  deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const organizationCode = req.organizationCode;
      
      const deleted = await this.userService.deleteUser(id, organizationCode);
      
      if (!deleted) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user profile
   * GET /api/v1/users/profile
   */
  getUserProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const profile = await this.userService.getById(userId);

      if (!profile) {
        throw new AppError('Profile not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   * PUT /api/v1/users/profile
   */
  updateUserProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const validatedData = req.body;

      const profile = await this.userService.updateUserProfile(userId, validatedData);

      if (!profile) {
        throw new AppError('Profile not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password
   * PUT /api/v1/users/change-password
   */
  changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required', 400);
      }

      await this.userService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  getUserStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.userService.getUserStatistics();

      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk user operations
   * POST /api/v1/users/bulk
   */
  bulkUserOperations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { operation, userIds, data } = req.body;

      if (!operation || !userIds || !Array.isArray(userIds)) {
        throw new AppError('Operation and userIds array are required', 400);
      }

      const result = await this.userService.bulkUserOperations(
        operation,
        userIds,
        data,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: `Bulk ${operation} operation completed successfully`,
        data: { result }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create employee (user with employee role)
   * POST /api/v1/users/employees
   */
  createEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeData = req.body;
      const createdBy = req.user!.userId;

      const employee = await this.userService.createEmployee(employeeData, createdBy);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: { employee }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employees
   * GET /api/v1/users/employees
   */
  getEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const department = req.query.department as string;
      const status = req.query.status as any; // Allow any string, will be validated in service
      const sort = req.query.sort as string;

      const result = await this.userService.getAllEmployees(page, limit, search, department, status, sort);

      res.status(200).json({
        success: true,
        message: 'Employees retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee by ID
   * GET /api/v1/users/employees/:id
   */
  getEmployeeById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const employee = await this.userService.getEmployeeById(id);

      res.status(200).json({
        success: true,
        message: 'Employee retrieved successfully',
        data: { employee }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update employee
   * PUT /api/v1/users/employees/:id
   */
  updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBy = req.user!.userId;

      const employee = await this.userService.updateEmployee(id, updateData, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: { employee }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete employee
   * DELETE /api/v1/users/employees/:id
   */
  deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = req.user!.userId;

      await this.userService.deleteEmployee(id, deletedBy);

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get departments
   * GET /api/v1/users/employees/departments
   */
  getDepartments = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const departments = await this.userService.getDepartments();

      res.status(200).json({
        success: true,
        message: 'Departments retrieved successfully',
        data: { departments }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee statistics
   * GET /api/v1/users/employees/stats
   */
  getEmployeeStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.userService.getEmployeeStats();

      res.status(200).json({
        success: true,
        message: 'Employee statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get users above a specific role level
   * GET /api/v1/users/above-role
   */
  getUsersAboveRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = parseInt(req.query.role as string);
      const organizationCode = req.headers['x-organization-code'] as string;

      if (!role || ![1, 2, 3, 4, 5].includes(role)) {
        throw new AppError('Valid role (1-5) is required', 400);
      }

      if (!organizationCode) {
        throw new AppError('x-organization-code header is required', 400);
      }

      const users = await this.userService.getUsersAboveRole(role, organizationCode);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: { users }
      });
    } catch (error) {
      next(error);
    }
  };
}

export default UserController;