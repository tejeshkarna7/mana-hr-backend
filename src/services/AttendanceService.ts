import { Attendance, User } from '@/models/index.js';
import { IAttendance, AttendanceStatus } from '@/types/index.js';
import { AppError } from '@/middlewares/error.js';

export interface MarkAttendanceData {
  employeeId: string;
  checkIn: Date;
  checkOut?: Date;
  status?: AttendanceStatus;
  notes?: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
}

class AttendanceService {
  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<any> {
    return await User.findById(userId).select('fullName employeeCode email organizationCode');
  }

  /**
   * Get all attendance records for a specific user for today (supports multiple sessions)
   */
  async getAllTodayAttendance(userId: string, date: Date): Promise<IAttendance[]> {
    // Ensure we're working with start of day in local timezone
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await Attendance.find({
      employeeId: userId,
      $or: [
        {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          checkIn: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ]
    })
    .populate('employeeId', 'fullName employeeCode department designation organizationCode')
    .sort({ checkIn: 1 }); // Sort by check-in time
  }

  /**
   * Get today's attendance for a specific user (returns first record - backward compatibility)
   */
  async getTodayAttendance(userId: string, date: Date): Promise<IAttendance | null> {
    // Ensure we're working with start of day in local timezone
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await Attendance.findOne({
      employeeId: userId,
      $or: [
        {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          checkIn: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ]
    }).populate('employeeId', 'fullName employeeCode department designation organizationCode');
  }

  /**
   * Get incomplete session (clocked in but not clocked out)
   */
  async getIncompleteSession(userId: string, date: Date): Promise<IAttendance | null> {
    // Ensure we're working with start and end of day in local timezone
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await Attendance.findOne({
      employeeId: userId,
      $or: [
        {
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        },
        {
          checkIn: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      ],
      checkOut: { $exists: false }
    }).populate('employeeId', 'fullName employeeCode department designation organizationCode')
      .sort({ checkIn: -1 });
  }

  /**
   * Calculate total hours worked for all sessions in a day
   */
  async getTotalHoursForDay(userId: string, date: Date): Promise<number> {
    const todayAttendance = await this.getAllTodayAttendance(userId, date);
    
    let totalHours = 0;
    
    for (const attendance of todayAttendance) {
      if (attendance.checkIn && attendance.checkOut) {
        const checkInTime = new Date(attendance.checkIn).getTime();
        const checkOutTime = new Date(attendance.checkOut).getTime();
        const sessionHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert milliseconds to hours
        totalHours += sessionHours;
      }
    }
    
    return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  }



  async markAttendance(attendanceData: MarkAttendanceData, createdBy: string): Promise<IAttendance> {
    // Verify employee exists
    const employee = await User.findById(attendanceData.employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Create attendance record for new session (allow multiple sessions per day)
    const checkInDate = new Date(attendanceData.checkIn);
    const localDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());

    // Check if there's already an attendance record for today
    const existingRecord = await this.getTodayAttendance(attendanceData.employeeId, localDate);
    
    if (existingRecord) {
      // Don't update clock-in time, just update notes and status
      // Keep the original first clock-in time of the day
      const updateData: any = {
        notes: attendanceData.notes || existingRecord.notes,
        updatedBy: createdBy,
        updatedAt: new Date(),
        status: AttendanceStatus.PRESENT,
        isLoggedIn: true // Set to logged in when clocking in
      };
      
      // Only clear checkout if user was previously clocked out (to allow re-entry)
      if (existingRecord.checkOut) {
        updateData.$unset = { 
          checkOut: 1
        };
        // Keep totalHours - don't clear it
      }
      
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        updateData,
        { new: true, runValidators: true }
      ).populate('employeeId', 'fullName employeeCode department designation organizationCode');
      
      if (!updatedAttendance) {
        throw new AppError('Failed to update attendance record', 500);
      }
      
      return updatedAttendance;
    }

    // Create new attendance record only if no existing record for the day
    const attendance = await Attendance.create({
      employeeId: attendanceData.employeeId,
      date: localDate,
      checkIn: attendanceData.checkIn,
      checkOut: attendanceData.checkOut,
      status: attendanceData.status || AttendanceStatus.PRESENT,
      notes: attendanceData.notes,
      isLoggedIn: true, // Set to logged in on first clock-in
      createdBy,
      updatedBy: createdBy,
    });

    return attendance.populate('employeeId', 'fullName employeeCode department designation organizationCode');
  }

  async updateAttendance(
    id: string,
    updateData: Partial<MarkAttendanceData>,
    updatedBy: string
  ): Promise<IAttendance> {
    const attendance = await Attendance.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy },
      { new: true, runValidators: true }
    ).populate('employeeId', 'fullName employeeCode department designation organizationCode');

    if (!attendance) {
      throw new AppError('Attendance record not found', 404);
    }

    return attendance;
  }

  async markCheckOut(
    attendanceId: string, 
    checkOutTime: Date, 
    updatedBy: string, 
    notes?: string, 
    _latitude?: number, 
    _longitude?: number
  ): Promise<IAttendance> {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      throw new AppError('Attendance record not found', 404);
    }

    if (attendance.checkOut) {
      throw new AppError('Already checked out', 400);
    }

    if (checkOutTime <= attendance.checkIn) {
      throw new AppError('Check-out time must be after check-in time', 400);
    }

    // Calculate session hours
    const sessionHours = (checkOutTime.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);

    // Update attendance record
    attendance.checkOut = checkOutTime;
    attendance.totalHours = Math.round(sessionHours * 100) / 100;
    attendance.isLoggedIn = false; // Set to logged out when clocking out
    attendance.updatedBy = updatedBy as any;
    if (notes) {
      attendance.notes = attendance.notes ? `${attendance.notes} | Checkout: ${notes}` : `Checkout: ${notes}`;
    }
    
    await attendance.save();

    return attendance.populate('employeeId', 'fullName employeeCode department designation organizationCode');
  }

  async getDailyAttendance(date: Date): Promise<IAttendance[]> {
    return (Attendance as any).getDailyAttendance(date);
  }

  async getEmployeeAttendance(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAttendance[]> {
    return Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('employeeId', 'fullName employeeCode department designation organizationCode')
      .sort({ date: -1 });
  }

  async getMonthlyAttendance(
    employeeId: string,
    year: number,
    month: number
  ): Promise<IAttendance[]> {
    return (Attendance as any).getMonthlyAttendance(employeeId, year, month);
  }

  async getAttendanceById(id: string): Promise<IAttendance> {
    const attendance = await Attendance.findById(id)
      .populate('employeeId', 'fullName employeeCode department designation organizationCode')
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!attendance) {
      throw new AppError('Attendance record not found', 404);
    }

    return attendance;
  }

  async getAttendanceReport(
    startDate: Date,
    endDate: Date,
    filters: AttendanceFilters = {}
  ): Promise<{
    attendances: IAttendance[];
    summary: {
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      halfDayCount: number;
      wfhCount: number;
    };
  }> {
    let query: any = {
      date: { $gte: startDate, $lte: endDate },
    };

    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [attendances, summary] = await Promise.all([
      Attendance.find(query)
        .populate('employeeId', 'fullName employeeCode department designation organizationCode')
        .sort({ date: -1, 'employeeId.fullName': 1 }),
      Attendance.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            presentCount: {
              $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.PRESENT] }, 1, 0] },
            },
            absentCount: {
              $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.ABSENT] }, 1, 0] },
            },
            lateCount: {
              $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.LATE] }, 1, 0] },
            },
            halfDayCount: {
              $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.HALF_DAY] }, 1, 0] },
            },
            wfhCount: {
              $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.WORK_FROM_HOME] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return {
      attendances,
      summary: summary[0] || {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        wfhCount: 0,
      },
    };
  }

  async getEmployeeAttendanceSummary(
    employeeId: string,
    year: number,
    month?: number
  ): Promise<{
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    wfhDays: number;
    attendancePercentage: number;
    totalHours: number;
    averageHours: number;
  }> {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    const attendances = await Attendance.find({
      employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    const summary = attendances.reduce(
      (acc, attendance) => {
        switch (attendance.status) {
          case AttendanceStatus.PRESENT:
            acc.presentDays++;
            break;
          case AttendanceStatus.ABSENT:
            acc.absentDays++;
            break;
          case AttendanceStatus.LATE:
            acc.lateDays++;
            acc.presentDays++; // Late is still present
            break;
          case AttendanceStatus.HALF_DAY:
            acc.halfDays++;
            acc.presentDays += 0.5;
            break;
          case AttendanceStatus.WORK_FROM_HOME:
            acc.wfhDays++;
            acc.presentDays++;
            break;
        }

        if (attendance.totalHours) {
          acc.totalHours += attendance.totalHours;
        }

        return acc;
      },
      {
        totalWorkingDays: attendances.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        wfhDays: 0,
        totalHours: 0,
      }
    );

    const attendancePercentage = summary.totalWorkingDays > 0 
      ? (summary.presentDays / summary.totalWorkingDays) * 100 
      : 0;

    const averageHours = summary.presentDays > 0 
      ? summary.totalHours / summary.presentDays 
      : 0;

    return {
      ...summary,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100,
    };
  }

  async deleteAttendance(id: string): Promise<void> {
    const attendance = await Attendance.findByIdAndDelete(id);
    
    if (!attendance) {
      throw new AppError('Attendance record not found', 404);
    }
  }

  async bulkMarkAttendance(
    attendanceRecords: MarkAttendanceData[],
    createdBy: string
  ): Promise<IAttendance[]> {
    const results: IAttendance[] = [];
    const errors: string[] = [];

    for (const record of attendanceRecords) {
      try {
        const attendance = await this.markAttendance(record, createdBy);
        results.push(attendance);
      } catch (error) {
        errors.push(`Employee ${record.employeeId}: ${(error as Error).message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new AppError(`Failed to create any attendance records: ${errors.join(', ')}`, 400);
    }

    return results;
  }

  async getAttendanceStats(): Promise<{
    today: {
      present: number;
      absent: number;
      late: number;
      onLeave: number;
    };
    thisMonth: {
      averageAttendance: number;
      totalWorkingDays: number;
      totalPresent: number;
    };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [todayStats, monthlyStats, totalEmployees] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: today } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Attendance.aggregate([
        { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
        {
          $group: {
            _id: null,
            totalPresent: { $sum: 1 },
            totalWorkingDays: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments({ 
        status: 'active',
        role: { $in: [3, 4, 5] }, // HR, MANAGER, EMPLOYEE
        employeeCode: { $exists: true }
      }),
    ]);

    // Process today's stats
    const todayStatsObj = {
      present: 0,
      absent: 0,
      late: 0,
      onLeave: 0,
    };

    todayStats.forEach((stat: any) => {
      if (stat._id === AttendanceStatus.PRESENT) todayStatsObj.present = stat.count;
      if (stat._id === AttendanceStatus.ABSENT) todayStatsObj.absent = stat.count;
      if (stat._id === AttendanceStatus.LATE) todayStatsObj.late = stat.count;
    });

    // Employees not marked as present, late, or absent are considered on leave or not marked
    todayStatsObj.onLeave = totalEmployees - (todayStatsObj.present + todayStatsObj.absent + todayStatsObj.late);

    // Process monthly stats
    const monthlyStatsObj = monthlyStats[0] || { totalPresent: 0, totalWorkingDays: 0 };
    const averageAttendance = monthlyStatsObj.totalWorkingDays > 0 
      ? (monthlyStatsObj.totalPresent / monthlyStatsObj.totalWorkingDays) * 100 
      : 0;

    return {
      today: todayStatsObj,
      thisMonth: {
        ...monthlyStatsObj,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
      },
    };
  }
}

export default new AttendanceService();