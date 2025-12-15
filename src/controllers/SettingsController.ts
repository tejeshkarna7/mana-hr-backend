import { Request, Response, NextFunction } from 'express';
import SettingsService from '@/services/SettingsService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';
// import { UpdateCompanySettingsSchema, UpdateAttendanceSettingsSchema } from '@/validation/settingsValidation.js';

type AuthRequest = AuthenticatedRequest;

export class SettingsController {
  private settingsService: typeof SettingsService;

  constructor() {
    this.settingsService = SettingsService;
  }

  /**
   * Get company settings
   * GET /api/settings/company
   */
  getCompanySettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getCompanySettings();

      res.status(200).json({
        success: true,
        message: 'Company settings retrieved successfully',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update company settings
   * PUT /api/settings/company
   */
  updateCompanySettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body;

      const settings = await this.settingsService.updateCompanySettings(
        validatedData,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Company settings updated successfully',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attendance settings
   * GET /api/settings/attendance
   */
  getAttendanceSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getAttendanceSettings();

      res.status(200).json({
        success: true,
        message: 'Attendance settings retrieved successfully',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update attendance settings
   * PUT /api/settings/attendance
   */
  updateAttendanceSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body;

      const settings = await this.settingsService.updateAttendanceSettings(
        validatedData,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Attendance settings updated successfully',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all settings
   * GET /api/settings
   */
  getAllSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const settings = await this.settingsService.getAllSettings();

      res.status(200).json({
        success: true,
        message: 'All settings retrieved successfully',
        data: { settings },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset settings to default
   * POST /api/settings/reset
   */
  resetSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { settingsType } = req.body;

      if (!settingsType || !['company', 'attendance'].includes(settingsType)) {
        throw new AppError(
          'Valid settings type is required (company or attendance)',
          400
        );
      }

      await this.settingsService.resetToDefault(settingsType, req.user!.userId);

      res.status(200).json({
        success: true,
        message: `${settingsType} settings reset to default successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Backup settings
   * POST /api/settings/backup
   */
  backupSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const backup = await this.settingsService.createSettingsBackup(
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Settings backup created successfully',
        data: { backup },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore settings from backup
   * POST /api/settings/restore
   */
  restoreSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { backupId } = req.body;

      if (!backupId) {
        throw new AppError('Backup ID is required', 400);
      }

      await this.settingsService.restoreFromBackup(backupId, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Settings restored from backup successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get settings history
   * GET /api/settings/history
   */
  getSettingsHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const settingsType = req.query.settingsType as string;

      const history = await this.settingsService.getSettingsHistory(
        page,
        limit,
        settingsType
      );

      res.status(200).json({
        success: true,
        message: 'Settings history retrieved successfully',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default SettingsController;
