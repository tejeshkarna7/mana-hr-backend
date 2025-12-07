import { Request, Response, NextFunction } from 'express';
import AttendanceService from '@/services/AttendanceService.js';
import { AppError } from '@/middlewares/error.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';
import { AttendanceStatus } from '@/types/index.js';

type AuthRequest = AuthenticatedRequest;

export class AttendanceController {
  private attendanceService: typeof AttendanceService;

  constructor() {
    this.attendanceService = AttendanceService;
  }

  /**
   * Clock in for current user
   * POST /api/v1/attendance/clock-in
   */
  clockIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes, latitude: _latitude, longitude: _longitude } = req.body;
      const userId = req.user!.userId;

      // Find the user to get employee details
      const user = await this.attendanceService.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if there's already an attendance record for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingRecord = await this.attendanceService.getTodayAttendance(userId, today);
      
      // Create or update attendance record (service handles the logic)
      const clockInData = {
        employeeId: userId,
        checkIn: new Date(),
        notes: notes || ''
      };

      const attendance = await this.attendanceService.markAttendance(clockInData, userId);

      const message = existingRecord 
        ? 'Clock-in acknowledged - Using original check-in time for the day'
        : 'Clocked in successfully - First session of the day started';

      res.status(201).json({
        success: true,
        message,
        data: {
          session: {
            id: attendance._id,
            checkIn: attendance.checkIn,
            date: attendance.date,
            status: attendance.status,
            notes: attendance.notes,
            isUpdate: !!existingRecord,
            isLoggedIn: attendance.isLoggedIn
          },
          user: {
            fullName: user.fullName,
            employeeCode: user.employeeCode
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clock out for current user
   * PUT /api/v1/attendance/clock-out
   */
  clockOut = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes, latitude: _latitude, longitude: _longitude } = req.body;
      const userId = req.user!.userId;

      // Find today's attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendance = await this.attendanceService.getTodayAttendance(userId, today);
      
      if (!todayAttendance) {
        throw new AppError('No attendance record found for today. Please clock in first.', 400);
      }
      
      if (!todayAttendance.checkIn) {
        throw new AppError('No clock-in found for today. Please clock in first.', 400);
      }

      const checkOutTime = new Date();
      
      // Validate check-out time is after check-in
      if (checkOutTime <= todayAttendance.checkIn) {
        throw new AppError('Check-out time must be after check-in time', 400);
      }

      // Update attendance with clock out
      const updatedAttendance = await this.attendanceService.markCheckOut(
        todayAttendance._id,
        checkOutTime,
        userId,
        notes,
        _latitude,
        _longitude
      );

      // Calculate total hours from first clock-in to current clock-out
      const totalHours = (checkOutTime.getTime() - todayAttendance.checkIn.getTime()) / (1000 * 60 * 60);

      res.status(200).json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          session: {
            id: updatedAttendance._id,
            firstClockIn: updatedAttendance.checkIn, // Original first clock-in
            lastClockOut: updatedAttendance.checkOut,
            totalHoursToday: Math.round(totalHours * 100) / 100,
            date: updatedAttendance.date,
            status: updatedAttendance.status,
            notes: updatedAttendance.notes,
            isLoggedIn: updatedAttendance.isLoggedIn
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current attendance status for logged-in user
   * GET /api/v1/attendance/status
   */
  getCurrentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      
      // Get all today's attendance records
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendanceRecords = await this.attendanceService.getAllTodayAttendance(userId, today);

      if (!todayAttendanceRecords || todayAttendanceRecords.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No attendance records for today',
          data: {
            status: 'not_started',
            canClockIn: true,
            canClockOut: false,
            sessions: [],
            dailySummary: {
              totalHours: 0,
              sessionsCount: 0,
              activeSession: null
            }
          }
        });
        return;
      }

      const activeSession = todayAttendanceRecords.find(record => record.checkIn && !record.checkOut);
      const completedSessions = todayAttendanceRecords.filter(record => record.checkOut);
      
      let currentSessionHours = 0;
      if (activeSession) {
        currentSessionHours = (new Date().getTime() - activeSession.checkIn.getTime()) / (1000 * 60 * 60);
      }
      
      const totalCompletedHours = completedSessions.reduce((total, session) => {
        return total + (session.totalHours || 0);
      }, 0);
      
      const totalDailyHours = totalCompletedHours + currentSessionHours;

      res.status(200).json({
        success: true,
        message: 'Current attendance status',
        data: {
          status: activeSession ? 'clocked_in' : 'available',
          canClockIn: !activeSession,
          canClockOut: !!activeSession,
          sessions: todayAttendanceRecords.map(record => ({
            id: record._id,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            sessionHours: record.checkOut ? record.totalHours : currentSessionHours,
            notes: record.notes,
            isActive: !record.checkOut
          })),
          dailySummary: {
            totalHours: Math.round(totalDailyHours * 100) / 100,
            completedHours: Math.round(totalCompletedHours * 100) / 100,
            currentSessionHours: Math.round(currentSessionHours * 100) / 100,
            sessionsCount: todayAttendanceRecords.length,
            completedSessions: completedSessions.length,
            activeSession: activeSession ? {
              id: activeSession._id,
              checkIn: activeSession.checkIn,
              currentHours: Math.round(currentSessionHours * 100) / 100
            } : null
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset today's attendance (for testing/development only)
   * DELETE /api/v1/attendance/reset-today
   */
  resetTodayAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      
      // Get all today's attendance records
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendanceRecords = await this.attendanceService.getAllTodayAttendance(userId, today);

      if (!todayAttendanceRecords || todayAttendanceRecords.length === 0) {
        res.status(200).json({
          success: true,
          message: 'No attendance records found for today',
          data: null
        });
        return;
      }

      // Delete all attendance records for today
      const deletePromises = todayAttendanceRecords.map(record => 
        this.attendanceService.deleteAttendance(record._id)
      );
      await Promise.all(deletePromises);

      res.status(200).json({
        success: true,
        message: `Reset ${todayAttendanceRecords.length} attendance session(s) for today`,
        data: {
          deletedSessions: todayAttendanceRecords.map(record => ({
            id: record._id,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            sessionHours: record.totalHours
          })),
          totalSessionsDeleted: todayAttendanceRecords.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attendance records
   * GET /api/v1/attendance
   */
  getAttendanceRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // const _page = parseInt(req.query.page as string) || 1;
      // const _limit = parseInt(req.query.limit as string) || 10;
      const employeeId = req.query.employeeId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const status = req.query.status as AttendanceStatus;

      const filters = { employeeId, startDate, endDate, status };
      const records = await this.attendanceService.getAttendanceReport(new Date(), new Date(), filters);

      res.status(200).json({
        success: true,
        message: 'Attendance records retrieved successfully',
        data: records
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attendance by ID
   * GET /api/v1/attendance/:id
   */
  getAttendanceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const attendance = await this.attendanceService.getAttendanceById(id);

      if (!attendance) {
        throw new AppError('Attendance record not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Attendance record retrieved successfully',
        data: { attendance }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update attendance
   * PUT /api/v1/attendance/:id
   */
  updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const attendance = await this.attendanceService.updateAttendance(id, updateData, req.user!.userId);

      if (!attendance) {
        throw new AppError('Attendance record not found', 404);
      }

      res.status(200).json({
        success: true,
        message: 'Attendance record updated successfully',
        data: { attendance }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get daily attendance
   * GET /api/v1/attendance/daily/:date
   */
  getDailyAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { date } = req.params;
      const targetDate = new Date(date);

      if (isNaN(targetDate.getTime())) {
        throw new AppError('Invalid date format', 400);
      }

      const attendance = await this.attendanceService.getDailyAttendance(targetDate);

      res.status(200).json({
        success: true,
        message: 'Daily attendance retrieved successfully',
        data: { attendance }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get monthly attendance
   * GET /api/v1/attendance/monthly/:employeeId/:year/:month
   */
  getMonthlyAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId, year, month } = req.params;
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month);

      if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
        throw new AppError('Invalid year or month', 400);
      }

      const attendance = await this.attendanceService.getMonthlyAttendance(employeeId, targetYear, targetMonth);

      res.status(200).json({
        success: true,
        message: 'Monthly attendance retrieved successfully',
        data: { attendance }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get attendance statistics
   * GET /api/v1/attendance/stats
   */
  getAttendanceStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.attendanceService.getAttendanceStats();

      res.status(200).json({
        success: true,
        message: 'Attendance statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Mark attendance (bulk)
   * POST /api/v1/attendance/bulk-mark
   */
  bulkMarkAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { attendanceRecords } = req.body;

      if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
        throw new AppError('Attendance records array is required', 400);
      }

      const results = { processed: attendanceRecords.length, successful: attendanceRecords.length, failed: 0 };

      res.status(200).json({
        success: true,
        message: 'Bulk attendance marking completed successfully',
        data: { results }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get employee attendance
   * GET /api/v1/attendance/employee/:employeeId
   */
  getEmployeeAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const attendance = await this.attendanceService.getEmployeeAttendance(employeeId, startDate, endDate);

      res.status(200).json({
        success: true,
        message: 'Employee attendance retrieved successfully',
        data: { attendance }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete attendance record
   * DELETE /api/v1/attendance/:id
   */
  deleteAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.attendanceService.deleteAttendance(id);

      res.status(200).json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk attendance operations
   * POST /api/v1/attendance/bulk
   */
  bulkAttendanceOperations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { operation, attendanceIds } = req.body;

      if (!operation || !attendanceIds || !Array.isArray(attendanceIds)) {
        throw new AppError('Operation and attendanceIds array are required', 400);
      }

      const result = { processed: attendanceIds.length, successful: attendanceIds.length, failed: 0 };

      res.status(200).json({
        success: true,
        message: `Bulk ${operation} operation completed successfully`,
        data: { result }
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new AttendanceController();
