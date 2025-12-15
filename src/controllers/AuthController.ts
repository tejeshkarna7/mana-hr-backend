import { Request, Response, NextFunction } from 'express';
import AuthService from '@/services/AuthService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';

type AuthRequest = AuthenticatedRequest;

export class AuthController {
  private authService: typeof AuthService;

  constructor() {
    this.authService = AuthService;
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        fullName,
        email,
        phone,
        password,
        role,
        organization,
        organizationCode,
      } = req.body;

      // Convert role to number if provided as string
      const userRole = role
        ? typeof role === 'string'
          ? parseInt(role)
          : role
        : undefined;

      // Validate required fields
      if (
        !fullName ||
        !email ||
        !phone ||
        !password ||
        !organization ||
        !organizationCode
      ) {
        throw new AppError(
          'All fields including organization and organizationCode are required',
          400
        );
      }

      // Create new user
      const result = await this.authService.register({
        fullName,
        email,
        phone,
        password,
        role: userRole,
        organization,
        organizationCode,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400);
      }

      const result = await this.authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getCurrentUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.authService.getMe(req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token using refresh token
   * POST /api/auth/refresh-token
   */
  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getMe = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.authService.getMe(req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Forgot password - Direct password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, newPassword, confirmPassword } = req.body;

      if (!email || !newPassword || !confirmPassword) {
        throw new AppError(
          'Email, new password, and confirm password are required',
          400
        );
      }

      if (newPassword !== confirmPassword) {
        throw new AppError(
          'New password and confirm password do not match',
          400
        );
      }

      if (newPassword.length < 6) {
        throw new AppError('Password must be at least 6 characters long', 400);
      }

      await this.authService.resetPasswordDirectly(email, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new AuthController();
