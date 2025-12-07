import { User, Attendance, Leave } from '@/models/index.js';
import { AppError } from '@/middlewares/error.js';
import { LeaveStatus } from '@/types/index.js';

interface UserDisplayInfo {
  displayname: string;
  shortname: string;
}

interface HolidayInfo {
  date: string;
  description: string;
  active: boolean;
}

interface DashboardData {
  totaluserscount: number;
  userspersentcount: number;
  usersabsentcount: number;
  usersonleavecount: number;
  totalusers: UserDisplayInfo[];
  totalpersentusers: UserDisplayInfo[];
  totalabsentusers: UserDisplayInfo[];
  totalonleaveusers: UserDisplayInfo[];
  holidaycalender: HolidayInfo[];
  workanniverseries: UserDisplayInfo[];
  birthdays: UserDisplayInfo[];
  upcommigworkanniverseries: UserDisplayInfo[];
  upcommingbirthdays: UserDisplayInfo[];
  newjoinies: UserDisplayInfo[];
}

class DashboardService {
  /**
   * Generate display name and short name from user's full name
   */
  private generateUserDisplayInfo(fullName: string): UserDisplayInfo {
    const nameParts = fullName.toLowerCase().split(' ').filter(part => part.length > 0);
    
    let shortname = '';
    if (nameParts.length === 1) {
      shortname = nameParts[0].charAt(0);
    } else if (nameParts.length === 2) {
      shortname = nameParts[0].charAt(0) + nameParts[1].charAt(0);
    } else if (nameParts.length >= 3) {
      shortname = nameParts[0].charAt(0) + nameParts[1].charAt(0) + nameParts[2].charAt(0);
    }

    return {
      displayname: fullName,
      shortname: shortname.toUpperCase()
    };
  }

  /**
   * Get today's attendance data
   */
  private async getTodayAttendanceData(organizationCode: string): Promise<{
    presentUsers: UserDisplayInfo[];
    absentUsers: UserDisplayInfo[];
    onLeaveUsers: UserDisplayInfo[];
    presentCount: number;
    absentCount: number;
    onLeaveCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active users in the organization
    const allUsers = await User.find({
      organizationCode,
      status: 'active'
    }).select('fullName').lean();

    // Get today's attendance records
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('employeeId', 'fullName organizationCode').lean();

    // Filter by organization and get present user IDs
    const orgAttendance = todayAttendance.filter(att => 
      att.employeeId && typeof att.employeeId === 'object' && 
      (att.employeeId as any).organizationCode === organizationCode
    );
    
    const presentUserIds = new Set(orgAttendance.map(att => (att.employeeId as any)._id.toString()));
    
    const presentUsers = allUsers
      .filter(user => presentUserIds.has(user._id.toString()))
      .map(user => this.generateUserDisplayInfo(user.fullName));

    const absentUsers = allUsers
      .filter(user => !presentUserIds.has(user._id.toString()))
      .map(user => this.generateUserDisplayInfo(user.fullName));

    // Get today's approved leave records
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const todayLeaves = await Leave.find({
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      status: LeaveStatus.APPROVED
    }).populate('employeeId', 'fullName organizationCode').lean();

    // Filter by organization and get on-leave user information
    const orgLeaves = todayLeaves.filter(leave => 
      leave.employeeId && typeof leave.employeeId === 'object' && 
      (leave.employeeId as any).organizationCode === organizationCode
    );
    
    const onLeaveUsers = orgLeaves.map(leave => 
      this.generateUserDisplayInfo((leave.employeeId as any).fullName)
    );

    return {
      presentUsers,
      absentUsers,
      onLeaveUsers,
      presentCount: presentUsers.length,
      absentCount: absentUsers.length,
      onLeaveCount: onLeaveUsers.length
    };
  }

  /**
   * Get upcoming birthdays (next 30 days)
   */
  private async getUpcomingBirthdays(organizationCode: string): Promise<UserDisplayInfo[]> {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    const users = await User.find({
      organizationCode,
      status: 'active',
      dob: { $exists: true }
    }).select('fullName dob').lean();

    const upcomingBirthdays = users.filter(user => {
      if (!user.dob) return false;
      
      const birthday = new Date(user.dob);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      
      // If birthday has passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearBirthday >= today && thisYearBirthday <= nextMonth;
    });

    return upcomingBirthdays.map(user => this.generateUserDisplayInfo(user.fullName));
  }

  /**
   * Get today's birthdays
   */
  private async getTodaysBirthdays(organizationCode: string): Promise<UserDisplayInfo[]> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const users = await User.find({
      organizationCode,
      status: 'active',
      dob: { $exists: true }
    }).select('fullName dob').lean();

    const todaysBirthdays = users.filter(user => {
      if (!user.dob) return false;
      
      const birthday = new Date(user.dob);
      return birthday.getMonth() + 1 === todayMonth && birthday.getDate() === todayDate;
    });

    return todaysBirthdays.map(user => this.generateUserDisplayInfo(user.fullName));
  }

  /**
   * Get work anniversaries (joining date anniversaries)
   */
  private async getWorkAnniversaries(organizationCode: string): Promise<UserDisplayInfo[]> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const users = await User.find({
      organizationCode,
      status: 'active',
      joiningDate: { $exists: true }
    }).select('fullName joiningDate').lean();

    const anniversaries = users.filter(user => {
      if (!user.joiningDate) return false;
      
      const joinDate = new Date(user.joiningDate);
      return joinDate.getMonth() + 1 === todayMonth && joinDate.getDate() === todayDate;
    });

    return anniversaries.map(user => this.generateUserDisplayInfo(user.fullName));
  }

  /**
   * Get upcoming work anniversaries (next 30 days)
   */
  private async getUpcomingWorkAnniversaries(organizationCode: string): Promise<UserDisplayInfo[]> {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    const users = await User.find({
      organizationCode,
      status: 'active',
      joiningDate: { $exists: true }
    }).select('fullName joiningDate').lean();

    const upcomingAnniversaries = users.filter(user => {
      if (!user.joiningDate) return false;
      
      const joinDate = new Date(user.joiningDate);
      const thisYearAnniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
      
      // If anniversary has passed this year, check next year
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearAnniversary >= today && thisYearAnniversary <= nextMonth;
    });

    return upcomingAnniversaries.map(user => this.generateUserDisplayInfo(user.fullName));
  }

  /**
   * Get new joiners (joined in last 30 days)
   */
  private async getNewJoiners(organizationCode: string): Promise<UserDisplayInfo[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.find({
      organizationCode,
      status: 'active',
      createdAt: { $gte: thirtyDaysAgo }
    }).select('fullName').lean();

    return newUsers.map(user => this.generateUserDisplayInfo(user.fullName));
  }

  /**
   * Get holiday calendar (mock data - in real app, this would come from a holidays collection)
   */
  private getHolidayCalendar(): HolidayInfo[] {
    return [
      {
        date: "November 5",
        description: "Diwali",
        active: true
      },
      {
        date: "November 10", 
        description: "Dasara",
        active: true
      },
      {
        date: "December 25",
        description: "Christmas",
        active: true
      },
      {
        date: "January 1",
        description: "New Year",
        active: true
      },
      {
        date: "January 26",
        description: "Republic Day",
        active: true
      }
    ];
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(organizationCode: string): Promise<DashboardData> {
    try {
      // Get all users for total count
      const allUsers = await User.find({
        organizationCode,
        status: 'active'
      }).select('fullName').lean();

      // Get attendance data
      const attendanceData = await this.getTodayAttendanceData(organizationCode);

      // Get birthday data
      const todaysBirthdays = await this.getTodaysBirthdays(organizationCode);
      const upcomingBirthdays = await this.getUpcomingBirthdays(organizationCode);

      // Get work anniversary data
      const workAnniversaries = await this.getWorkAnniversaries(organizationCode);
      const upcomingWorkAnniversaries = await this.getUpcomingWorkAnniversaries(organizationCode);

      // Get new joiners
      const newJoiners = await this.getNewJoiners(organizationCode);

      // Get holiday calendar
      const holidayCalendar = this.getHolidayCalendar();

      // Generate total users display info
      const totalUsers = allUsers.map(user => this.generateUserDisplayInfo(user.fullName));

      return {
        totaluserscount: allUsers.length,
        userspersentcount: attendanceData.presentCount,
        usersabsentcount: attendanceData.absentCount,
        usersonleavecount: attendanceData.onLeaveCount,
        totalusers: totalUsers,
        totalpersentusers: attendanceData.presentUsers,
        totalabsentusers: attendanceData.absentUsers,
        totalonleaveusers: attendanceData.onLeaveUsers,
        holidaycalender: holidayCalendar,
        workanniverseries: workAnniversaries,
        birthdays: todaysBirthdays,
        upcommigworkanniverseries: upcomingWorkAnniversaries,
        upcommingbirthdays: upcomingBirthdays,
        newjoinies: newJoiners
      };

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new AppError('Failed to fetch dashboard data', 500);
    }
  }
}

export default new DashboardService();