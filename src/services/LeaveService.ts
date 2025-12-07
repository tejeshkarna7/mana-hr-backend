import { Leave, LeaveType, User } from '@/models/index.js';
import { ILeave, ILeaveType, LeaveStatus } from '@/types/index.js';
import { AppError } from '@/middlewares/error.js';
import { calculateWorkingDays } from '@/utils/helpers.js';

export interface ApplyLeaveData {
  employeeId: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}

export interface CreateLeaveTypeData {
  name: string;
  description?: string;
  daysAllowed: number;
  isCarryForward: boolean;
  maxCarryForwardDays?: number;
  isActive: boolean;
  color?: string;
  requiresApproval?: boolean;
  minDaysNotice?: number;
  maxConsecutiveDays?: number;
  organizationCode: string;
}

export interface LeaveFilters {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
}

class LeaveService {
  // Leave Type Management
  async createLeaveType(leaveTypeData: CreateLeaveTypeData, createdBy: string): Promise<ILeaveType> {
    // Check if leave type with the same name already exists in the organization
    const existingLeaveType = await LeaveType.findOne({ 
      name: leaveTypeData.name,
      organizationCode: leaveTypeData.organizationCode 
    });
    if (existingLeaveType) {
      throw new AppError('Leave type with this name already exists in your organization', 400);
    }

    // Validate maxConsecutiveDays if provided
    if (leaveTypeData.maxConsecutiveDays && leaveTypeData.maxConsecutiveDays > leaveTypeData.daysAllowed) {
      throw new AppError('Maximum consecutive days cannot exceed total days allowed', 400);
    }

    const leaveType = await LeaveType.create({
      ...leaveTypeData,
      createdBy,
      updatedBy: createdBy,
    });

    return leaveType;
  }

  async getAllLeaveTypes(organizationCode: string, activeOnly = false): Promise<ILeaveType[]> {
    const query: any = { organizationCode };
    if (activeOnly) {
      query.isActive = true;
    }
    
    return LeaveType.find(query)
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email')
      .sort({ name: 1 });
  }

  async getLeaveTypeById(id: string, organizationCode: string): Promise<ILeaveType> {
    const leaveType = await LeaveType.findOne({ _id: id, organizationCode })
      .populate('createdBy', 'fullName email')
      .populate('updatedBy', 'fullName email');

    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }

    return leaveType;
  }

  async updateLeaveType(
    id: string,
    updateData: Partial<CreateLeaveTypeData>,
    updatedBy: string,
    organizationCode: string
  ): Promise<ILeaveType> {
    // Get current leave type to check current values
    const currentLeaveType = await LeaveType.findOne({ _id: id, organizationCode });
    if (!currentLeaveType) {
      throw new AppError('Leave type not found', 404);
    }

    // Check if another leave type with the same name exists in the organization
    if (updateData.name) {
      const existingLeaveType = await LeaveType.findOne({ 
        name: updateData.name,
        organizationCode,
        _id: { $ne: id } 
      });
      if (existingLeaveType) {
        throw new AppError('Leave type with this name already exists in your organization', 400);
      }
    }

    // Validate maxConsecutiveDays against daysAllowed
    const finalDaysAllowed = updateData.daysAllowed !== undefined ? updateData.daysAllowed : currentLeaveType.daysAllowed;
    const currentMaxConsecutive = (currentLeaveType as any).maxConsecutiveDays || null;
    const finalMaxConsecutiveDays = updateData.maxConsecutiveDays !== undefined ? updateData.maxConsecutiveDays : currentMaxConsecutive;
    
    if (finalMaxConsecutiveDays && finalDaysAllowed && finalMaxConsecutiveDays > finalDaysAllowed) {
      throw new AppError('Maximum consecutive days cannot exceed total days allowed', 400);
    }

    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: id, organizationCode },
      { ...updateData, updatedBy },
      { new: true }
    )
      .populate('updatedBy', 'fullName email');

    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }

    return leaveType;
  }

  async deleteLeaveType(id: string, organizationCode: string): Promise<void> {
    // Check if leave type exists in organization
    const leaveType = await LeaveType.findOne({ _id: id, organizationCode });
    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }

    // Check if any leaves are using this leave type
    const leavesUsingType = await Leave.countDocuments({ leaveType: id });
    if (leavesUsingType > 0) {
      throw new AppError('Cannot delete leave type that has been used in leave applications', 400);
    }

    await LeaveType.findOneAndDelete({ _id: id, organizationCode });
  }

  // Leave Application Management
  async applyLeave(leaveData: ApplyLeaveData): Promise<ILeave> {
    // Verify employee exists
    const employee = await User.findById(leaveData.employeeId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Verify leave type exists and is active
    const leaveType = await LeaveType.findById(leaveData.leaveType);
    if (!leaveType) {
      throw new AppError('Leave type not found', 404);
    }

    if (!leaveType.isActive) {
      throw new AppError('Leave type is not active', 400);
    }

    // Validate dates
    const startDate = new Date(leaveData.startDate);
    const endDate = new Date(leaveData.endDate);

    if (startDate >= endDate) {
      throw new AppError('End date must be after start date', 400);
    }

    if (startDate < new Date()) {
      throw new AppError('Cannot apply for past dates', 400);
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employeeId: leaveData.employeeId,
      status: { $in: [LeaveStatus.APPROVED, LeaveStatus.PENDING] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
      ],
    });

    if (overlappingLeave) {
      throw new AppError('You have overlapping leave applications', 400);
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const leaveBalance = await (Leave as any).getEmployeeLeaveBalance(leaveData.employeeId, currentYear);
    
    const requestedDays = calculateWorkingDays(startDate, endDate);
    const usedDays = leaveBalance[leaveType.name]?.used || 0;
    const totalAllowed = leaveType.daysAllowed;

    if (usedDays + requestedDays > totalAllowed) {
      throw new AppError(
        `Insufficient leave balance. Available: ${totalAllowed - usedDays} days, Requested: ${requestedDays} days`,
        400
      );
    }

    // Create leave application
    const leave = await Leave.create({
      employeeId: leaveData.employeeId,
      leaveType: leaveData.leaveType,
      startDate,
      endDate,
      reason: leaveData.reason,
      totalDays: requestedDays,
      status: LeaveStatus.PENDING,
      appliedDate: new Date(),
    });

    return leave.populate([
      { path: 'employeeId', select: 'fullName employeeCode department designation' },
      { path: 'leaveType', select: 'name daysAllowed' },
    ]);
  }

  async getAllLeaves(
    page = 1,
    limit = 10,
    filters: LeaveFilters = {},
    sort?: string
  ): Promise<{
    leaves: ILeave[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.leaveType) {
      query.leaveType = filters.leaveType;
    }

    if (filters.startDate || filters.endDate) {
      query.startDate = {};
      if (filters.startDate) query.startDate.$gte = filters.startDate;
      if (filters.endDate) query.startDate.$lte = filters.endDate;
    }

    let sortOption: any = { appliedDate: -1 };
    
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .populate('employeeId', 'fullName employeeCode department designation')
        .populate('leaveType', 'name daysAllowed')
        .populate('approvedBy', 'fullName email')
        .populate('rejectedBy', 'fullName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Leave.countDocuments(query),
    ]);

    return {
      leaves,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getLeaveById(id: string): Promise<ILeave> {
    const leave = await Leave.findById(id)
      .populate('employeeId', 'fullName employeeCode department designation')
      .populate('leaveType', 'name daysAllowed')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email');

    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    return leave;
  }

  async approveLeave(id: string, approvedBy: string): Promise<ILeave> {
    const leave = await Leave.findById(id);
    
    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError('Only pending leaves can be approved', 400);
    }

    leave.status = LeaveStatus.APPROVED;
    leave.approvedBy = approvedBy as any;
    leave.approvedDate = new Date();
    await leave.save();

    return leave.populate([
      { path: 'employeeId', select: 'fullName employeeCode department designation' },
      { path: 'leaveType', select: 'name daysAllowed' },
      { path: 'approvedBy', select: 'fullName email' },
    ]);
  }

  async rejectLeave(id: string, rejectedBy: string, rejectionReason: string): Promise<ILeave> {
    const leave = await Leave.findById(id);
    
    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError('Only pending leaves can be rejected', 400);
    }

    leave.status = LeaveStatus.REJECTED;
    leave.rejectedBy = rejectedBy as any;
    leave.rejectedDate = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    return leave.populate([
      { path: 'employeeId', select: 'fullName employeeCode department designation' },
      { path: 'leaveType', select: 'name daysAllowed' },
      { path: 'rejectedBy', select: 'fullName email' },
    ]);
  }

  async cancelLeave(id: string, employeeId?: string): Promise<ILeave> {
    const leave = await Leave.findById(id);
    
    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    // If employeeId is provided, ensure it matches the leave's employee
    if (employeeId && leave.employeeId.toString() !== employeeId) {
      throw new AppError('You can only cancel your own leave applications', 403);
    }

    if (leave.status !== LeaveStatus.PENDING && leave.status !== LeaveStatus.APPROVED) {
      throw new AppError('Only pending or approved leaves can be cancelled', 400);
    }

    // Check if leave start date has passed
    if (leave.startDate <= new Date()) {
      throw new AppError('Cannot cancel leave that has already started', 400);
    }

    leave.status = LeaveStatus.CANCELLED;
    await leave.save();

    return leave.populate([
      { path: 'employeeId', select: 'fullName employeeCode department designation' },
      { path: 'leaveType', select: 'name daysAllowed' },
    ]);
  }

  async getEmployeeLeaveBalance(employeeId: string, year?: number): Promise<Record<string, { used: number; total: number; available: number }>> {
    const targetYear = year || new Date().getFullYear();
    const balance = await (Leave as any).getEmployeeLeaveBalance(employeeId, targetYear);
    
    // Add available days calculation
    const result: Record<string, { used: number; total: number; available: number }> = {};
    
    for (const [leaveType, data] of Object.entries(balance)) {
      const balanceData = data as any;
      result[leaveType] = {
        used: balanceData.used,
        total: balanceData.total,
        available: Math.max(0, balanceData.total - balanceData.used),
      };
    }

    return result;
  }

  async getLeaveReport(
    startDate: Date,
    endDate: Date,
    filters: LeaveFilters = {}
  ): Promise<{
    leaves: ILeave[];
    summary: {
      totalApplications: number;
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      cancelledCount: number;
      byLeaveType: Array<{ _id: string; count: number; name: string }>;
    };
  }> {
    let query: any = {
      appliedDate: { $gte: startDate, $lte: endDate },
    };

    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.leaveType) {
      query.leaveType = filters.leaveType;
    }

    const [leaves, summary] = await Promise.all([
      Leave.find(query)
        .populate('employeeId', 'fullName employeeCode department designation')
        .populate('leaveType', 'name daysAllowed')
        .populate('approvedBy', 'fullName email')
        .populate('rejectedBy', 'fullName email')
        .sort({ appliedDate: -1 }),
      Leave.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalApplications: { $sum: 1 },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', LeaveStatus.PENDING] }, 1, 0] },
            },
            approvedCount: {
              $sum: { $cond: [{ $eq: ['$status', LeaveStatus.APPROVED] }, 1, 0] },
            },
            rejectedCount: {
              $sum: { $cond: [{ $eq: ['$status', LeaveStatus.REJECTED] }, 1, 0] },
            },
            cancelledCount: {
              $sum: { $cond: [{ $eq: ['$status', LeaveStatus.CANCELLED] }, 1, 0] },
            },
          },
        },
      ]),
      Leave.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'leavetypes',
            localField: 'leaveType',
            foreignField: '_id',
            as: 'leaveTypeDetails',
          },
        },
        { $unwind: '$leaveTypeDetails' },
        {
          $group: {
            _id: '$leaveType',
            count: { $sum: 1 },
            name: { $first: '$leaveTypeDetails.name' },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      leaves,
      summary: summary[0] || {
        totalApplications: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        cancelledCount: 0,
      },
    };
  }

  async updateLeave(id: string, updateData: any, updatedBy: string): Promise<ILeave> {
    const leave = await Leave.findById(id);
    
    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError('Only pending leaves can be updated', 400);
    }

    // Manual validation for date range
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);
      if (endDate < startDate) {
        throw new AppError('End date must be greater than or equal to start date', 400);
      }
    } else if (updateData.startDate && leave.endDate) {
      const startDate = new Date(updateData.startDate);
      if (leave.endDate < startDate) {
        throw new AppError('End date must be greater than or equal to start date', 400);
      }
    } else if (updateData.endDate && leave.startDate) {
      const endDate = new Date(updateData.endDate);
      if (endDate < leave.startDate) {
        throw new AppError('End date must be greater than or equal to start date', 400);
      }
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      { ...updateData, updatedBy },
      { new: true }
    )
      .populate('employeeId', 'fullName employeeCode department designation')
      .populate('leaveType', 'name daysAllowed');

    return updatedLeave!;
  }

  async deleteLeave(id: string): Promise<void> {
    const leave = await Leave.findById(id);
    
    if (!leave) {
      throw new AppError('Leave application not found', 404);
    }

    if (leave.status === LeaveStatus.APPROVED) {
      throw new AppError('Cannot delete approved leave applications', 400);
    }

    await Leave.findByIdAndDelete(id);
  }

  async getUpcomingLeaves(days = 7): Promise<ILeave[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return Leave.find({
      status: LeaveStatus.APPROVED,
      startDate: { $gte: today, $lte: futureDate },
    })
      .populate('employeeId', 'fullName employeeCode department designation')
      .populate('leaveType', 'name')
      .sort({ startDate: 1 });
  }

  async getLeaveCalendar(year: number, month?: number): Promise<ILeave[]> {
    let startDate: Date;
    let endDate: Date;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    return Leave.find({
      status: LeaveStatus.APPROVED,
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    })
      .populate('employeeId', 'fullName employeeCode department designation')
      .populate('leaveType', 'name')
      .sort({ startDate: 1 });
  }
}

export default new LeaveService();
