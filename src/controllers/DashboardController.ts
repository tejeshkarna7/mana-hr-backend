import { Response, NextFunction } from 'express';
import DashboardService from '../services/DashboardService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';
import { OrganizationRequest } from '@/middlewares/organizationCode.js';

type AuthRequest = AuthenticatedRequest & OrganizationRequest;

export class DashboardController {
  private dashboardService: typeof DashboardService;

  constructor() {
    this.dashboardService = DashboardService;
  }

  /**
   * Get dashboard data
   * GET /api/dashboard
   */
  getDashboardData = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationCode = req.organizationCode;

      if (!organizationCode) {
        throw new AppError('Organization code is required', 400);
      }

      const dashboardData =
        await this.dashboardService.getDashboardData(organizationCode);

      res.status(200).json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboardData,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new DashboardController();
