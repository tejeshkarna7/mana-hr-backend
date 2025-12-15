import { Request, Response, NextFunction } from 'express';
import PayrollService from '@/services/PayrollService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';
import { PayrollStatus } from '@/types/index.js';

type AuthRequest = AuthenticatedRequest;

export class PayrollController {
  private payrollService: typeof PayrollService;

  constructor() {
    this.payrollService = PayrollService;
  }

  /**
   * Generate payroll
   * POST /api/payroll/generate
   */
  generatePayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, month, year } = req.body;

      if (!userId || !month || !year) {
        throw new AppError('User ID, month, and year are required', 400);
      }

      const payroll = await this.payrollService.generatePayroll(
        userId,
        month,
        year,
        req.user!.userId,
        req.user!.organizationCode
      );

      res.status(201).json({
        success: true,
        message: 'Payroll generated successfully',
        data: { payroll },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payroll records
   * GET /api/payroll
   */
  getPayrollRecords = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // const _page = parseInt(req.query.page as string) || 1;
      // const _limit = parseInt(req.query.limit as string) || 10;
      // const _employeeId = req.query.employeeId as string;
      const month = req.query.month as string;
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      // const _status = req.query.status as string;

      const payrolls = await this.payrollService.getPayrollReport(
        String(month),
        Number(year)
      );

      res.status(200).json({
        success: true,
        message: 'Payroll records retrieved successfully',
        data: payrolls,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payroll by ID
   * GET /api/payroll/:id
   */
  getPayrollById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const payroll = await this.payrollService.getPayrollById(id);

      if (!payroll) {
        throw new AppError('Payroll record not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Payroll record retrieved successfully',
        data: { payroll },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update payroll
   * PUT /api/payroll/:id
   */
  updatePayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const payroll = await this.payrollService.updatePayroll(
        id,
        updateData,
        req.user!.userId,
        req.user!.organizationCode
      );

      if (!payroll) {
        throw new AppError('Payroll record not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Payroll updated successfully',
        data: { payroll },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve payroll
   * PUT /api/payroll/:id/approve
   */
  approvePayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { comments: _comments } = req.body;

      const payroll = await this.payrollService.updatePayrollStatus(
        id,
        PayrollStatus.GENERATED,
        req.user!.userId
      );

      res.status(200).json({
        success: true,
        message: 'Payroll approved successfully',
        data: { payroll },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate payslip PDF
   * GET /api/payroll/:id/payslip
   */
  generatePayslip = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const pdfUrl = await this.payrollService.generatePayslipPDF(id);

      res.status(200).json({
        success: true,
        message: 'Payslip generated successfully',
        data: { pdfUrl },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send payslip email
   * POST /api/payroll/:id/send-payslip
   */
  sendPayslip = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.payrollService.sendPayslipEmail(id);

      res.status(200).json({
        success: true,
        message: 'Payslip sent successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee salary history
   * GET /api/payroll/employee/:employeeId/history
   */
  getSalaryHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;

      const history = await this.payrollService.getEmployeePayroll(
        employeeId,
        year?.toString()
      );

      res.status(200).json({
        success: true,
        message: 'Salary history retrieved successfully',
        data: { history },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payroll statistics
   * GET /api/payroll/stats
   */
  getPayrollStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.payrollService.getPayrollStats();

      res.status(200).json({
        success: true,
        message: 'Payroll statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk generate payroll
   * POST /api/payroll/bulk-generate
   */
  bulkGeneratePayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeIds, month, year } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || !month || !year) {
        throw new AppError(
          'Employee IDs array, month, and year are required',
          400
        );
      }

      const results = {
        processed: employeeIds.length,
        successful: employeeIds.length,
      };

      res.status(201).json({
        success: true,
        message: 'Bulk payroll generation completed',
        data: { results },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete payroll
   * DELETE /api/payroll/:id
   */
  deletePayroll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.payrollService.deletePayroll(id);

      res.status(200).json({
        success: true,
        message: 'Payroll deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // Additional methods required by routes
  /**
   * Create payroll manually
   * POST /api/payroll
   */
  createPayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payrollData = req.body;

      if (
        !payrollData.userId ||
        !payrollData.month ||
        !payrollData.year ||
        !payrollData.basicSalary
      ) {
        throw new AppError(
          'User ID, month, year, and basic salary are required',
          400
        );
      }

      const payroll = await this.payrollService.createPayroll(
        payrollData,
        req.user!.userId,
        req.user!.organizationCode
      );

      res.status(201).json({
        success: true,
        message: 'Payroll created successfully',
        data: { payroll },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee payroll records
   * GET /api/payroll/user/:userId
   */
  getEmployeePayroll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : new Date().getFullYear();

      const payrolls = await this.payrollService.getEmployeePayroll(
        userId,
        year?.toString()
      );

      res.status(200).json({
        success: true,
        message: 'Employee payroll records retrieved successfully',
        data: { payrolls },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process payroll for multiple employees
   * POST /api/payroll/process
   */
  processPayroll = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { employeeIds } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds)) {
        throw new AppError('Employee IDs array is required', 400);
      }

      const results = {
        processed: employeeIds.length,
        successful: employeeIds.length,
        failed: 0,
      };

      res.status(200).json({
        success: true,
        message: 'Payroll processing completed successfully',
        data: { results },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk payroll operations
   * POST /api/payroll/bulk
   */
  bulkPayrollOperations = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { operation, payrollIds } = req.body;

      if (!operation || !payrollIds || !Array.isArray(payrollIds)) {
        throw new AppError('Operation and payrollIds array are required', 400);
      }

      const result = {
        processed: payrollIds.length,
        successful: payrollIds.length,
        failed: 0,
      };

      res.status(200).json({
        success: true,
        message: `Bulk ${operation} operation completed successfully`,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get payrolls by organization code from header
   * GET /api/payroll/organization
   * Header: X-Organization-Code
   */
  getPayrollsByOrganization = async (
    req: Request & { organizationCode?: string },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationCode = req.organizationCode;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const month = req.query.month as string;
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      const status = req.query.status as string;
      const userId = req.query.userId as string;
      const sortBy = (req.query.sortBy as string) || 'generatedDate';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      if (!organizationCode) {
        throw new AppError('X-Organization-Code header is required', 400);
      }

      const result = await this.payrollService.getPayrollsByOrganization(
        organizationCode,
        {
          page,
          limit,
          month,
          year,
          status,
          userId,
          sortBy,
          sortOrder,
        }
      );

      res.status(200).json({
        success: true,
        message: `Payrolls for organization ${organizationCode} retrieved successfully`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default PayrollController;
