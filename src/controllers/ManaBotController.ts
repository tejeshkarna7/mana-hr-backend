import { Request, Response, NextFunction } from 'express';
import ManaBotService from '@/services/ManaBotService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';

type AuthRequest = AuthenticatedRequest;

export class ManaBotController {
  private manaBotService: typeof ManaBotService;

  constructor() {
    this.manaBotService = ManaBotService;
  }

  /**
   * Ask ManaBot a question
   * POST /api/manabot/ask
   */
  askManaBot = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { question, context } = req.body;
      const userId = req.user!.userId;

      if (!question || question.trim() === '') {
        throw new AppError('Question is required', 400);
      }

      const response = await this.manaBotService.processQuestion(
        question,
        userId,
        context
      );

      res.status(200).json({
        success: true,
        message: 'ManaBot response generated successfully',
        data: { response },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get chat history
   * GET /api/manabot/history
   */
  getChatHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      // const _page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await this.manaBotService.getChatHistory(userId, limit);

      res.status(200).json({
        success: true,
        message: 'Chat history retrieved successfully',
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get HR insights
   * GET /api/manabot/insights
   */
  getHRInsights = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type, period: _period } = req.query;
      const userId = req.user!.userId;

      const insights = await this.manaBotService.generateHRInsights(
        userId,
        type as string,
        new Date(),
        new Date()
      );

      res.status(200).json({
        success: true,
        message: 'HR insights generated successfully',
        data: { insights },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee recommendations
   * GET /api/manabot/recommendations/:employeeId
   */
  getEmployeeRecommendations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const userId = req.user!.userId;

      const recommendations =
        await this.manaBotService.getEmployeeRecommendations(
          employeeId,
          userId
        );

      res.status(200).json({
        success: true,
        message: 'Employee recommendations generated successfully',
        data: { recommendations },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Analyze attendance patterns
   * POST /api/manabot/analyze/attendance
   */
  analyzeAttendancePatterns = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId, startDate, endDate } = req.body;
      const userId = req.user!.userId;

      if (!employeeId || !startDate || !endDate) {
        throw new AppError(
          'Employee ID, start date, and end date are required',
          400
        );
      }

      const analysis = await this.manaBotService.analyzeAttendancePatterns(
        userId,
        new Date(startDate),
        new Date(endDate),
        employeeId
      );

      res.status(200).json({
        success: true,
        message: 'Attendance pattern analysis completed successfully',
        data: { analysis },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get performance insights
   * POST /api/manabot/analyze/performance
   */
  getPerformanceInsights = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId, metrics: _metrics, period: _period } = req.body;
      const userId = req.user!.userId;

      if (!employeeId) {
        throw new AppError('Employee ID is required', 400);
      }

      const insights = await this.manaBotService.analyzePerformanceMetrics(
        userId,
        new Date(),
        new Date(),
        employeeId
      );

      res.status(200).json({
        success: true,
        message: 'Performance insights generated successfully',
        data: { insights },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get policy recommendations
   * POST /api/manabot/policy/recommendations
   */
  getPolicyRecommendations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { department, issueType, description: _description } = req.body;
      const userId = req.user!.userId;

      if (!department || !issueType) {
        throw new AppError('Department and issue type are required', 400);
      }

      const recommendations =
        await this.manaBotService.generatePolicyRecommendations(
          userId,
          issueType,
          department
        );

      res.status(200).json({
        success: true,
        message: 'Policy recommendations generated successfully',
        data: { recommendations },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear chat history
   * DELETE /api/manabot/history
   */
  clearChatHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await this.manaBotService.clearChatHistory(userId);

      res.status(200).json({
        success: true,
        message: 'Chat history cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ManaBot statistics
   * GET /api/manabot/stats
   */
  getManaBotStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.manaBotService.getManaBotStatistics();

      res.status(200).json({
        success: true,
        message: 'ManaBot statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Train ManaBot with custom data
   * POST /api/manabot/train
   */
  trainManaBot = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { trainingData, category: _category } = req.body;
      const userId = req.user!.userId;

      if (!trainingData || !Array.isArray(trainingData)) {
        throw new AppError('Training data array is required', 400);
      }

      const result = await this.manaBotService.trainWithCustomData(
        userId,
        trainingData
      );

      res.status(200).json({
        success: true,
        message: 'ManaBot training completed successfully',
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  };
}
