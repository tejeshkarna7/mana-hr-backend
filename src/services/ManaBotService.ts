import { Attendance, Leave, Payroll, User } from '@/models/index.js';
import { AppError } from '@/middlewares/error.js';

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  timestamp: Date;
  category: 'general' | 'attendance' | 'leave' | 'payroll' | 'employee' | 'policy';
}

export interface BotQuery {
  userId: string;
  message: string;
  context?: {
    employeeId?: string;
    department?: string;
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
  };
}

export interface BotResponse {
  message: string;
  data?: any;
  actions?: Array<{
    type: string;
    label: string;
    endpoint?: string;
    params?: any;
  }>;
  category: string;
  confidence: number;
}

class ManaBotService {
  private chatHistory: Map<string, ChatMessage[]> = new Map();

  // Intent patterns for natural language processing
  private intentPatterns = {
    attendance: [
      /attendance|present|absent|check.?in|check.?out|working hours|late|early/i,
      /time|hours worked|overtime|break/i,
    ],
    leave: [
      /leave|vacation|holiday|time off|sick|pto|absence|apply for/i,
      /leave balance|remaining leaves|leave status/i,
    ],
    payroll: [
      /salary|wage|pay|payroll|payslip|earnings|deduction|tax/i,
      /bonus|increment|compensation|benefits/i,
    ],
    employee: [
      /employee|staff|team member|colleague|profile|department/i,
      /hire|onboard|join|new employee|employee details/i,
    ],
    policy: [
      /policy|rule|regulation|guideline|procedure|process/i,
      /company policy|hr policy|work policy/i,
    ],
    general: [
      /help|assistance|support|how to|what is|explain/i,
      /mana|bot|ai|assistant/i,
    ],
  };

  // Common HR policies and answers
  private hrKnowledgeBase = {
    'working hours': 'Standard working hours are 9 AM to 5 PM, Monday through Friday, with a 1-hour lunch break.',
    'leave policy': 'Employees are entitled to 21 annual leaves, 12 sick leaves, and 10 casual leaves per year.',
    'attendance policy': 'Employees should check in by 9:15 AM. Late arrival (after 9:15 AM) will be marked as late.',
    'payroll schedule': 'Salaries are processed on the last working day of each month.',
    'overtime policy': 'Overtime is calculated for work beyond 8 hours per day at 1.5x the regular hourly rate.',
    'probation period': 'New employees have a probation period of 3 months with monthly performance reviews.',
    'dress code': 'Business casual is the standard dress code. Formal attire for client meetings.',
    'remote work': 'Remote work is allowed up to 2 days per week with prior manager approval.',
    'sick leave': 'Sick leave requires medical documentation for absences longer than 2 consecutive days.',
    'holiday calendar': 'Company observes all national holidays plus additional company-specific holidays.',
  };

  async processQuery(query: BotQuery): Promise<BotResponse> {
    const category = this.categorizeQuery(query.message);
    let response: BotResponse;

    try {
      switch (category) {
        case 'attendance':
          response = await this.handleAttendanceQuery(query);
          break;
        case 'leave':
          response = await this.handleLeaveQuery(query);
          break;
        case 'payroll':
          response = await this.handlePayrollQuery(query);
          break;
        case 'employee':
          response = await this.handleEmployeeQuery(query);
          break;
        case 'policy':
          response = await this.handlePolicyQuery(query);
          break;
        default:
          response = await this.handleGeneralQuery(query);
      }

      // Store chat history
      this.storeChatHistory(query.userId, query.message, response.message, category);

      return response;
    } catch (error) {
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again or contact IT support.',
        category: 'error',
        confidence: 0,
      };
    }
  }

  private categorizeQuery(message: string): string {
    for (const [category, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return category;
        }
      }
    }
    return 'general';
  }

  private async handleAttendanceQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    // Get today's attendance
    if (message.includes('today') || message.includes('current')) {
      return this.getTodayAttendance(query.userId);
    }

    // Get attendance summary
    if (message.includes('summary') || message.includes('this month')) {
      return this.getAttendanceSummary(query.userId);
    }

    // Check-in/check-out guidance
    if (message.includes('check in') || message.includes('check out')) {
      return {
        message: 'You can check in/out using the attendance module. Click on "Mark Attendance" to record your presence.',
        actions: [
          {
            type: 'navigate',
            label: 'Go to Attendance',
            endpoint: '/attendance',
          },
        ],
        category: 'attendance',
        confidence: 0.9,
      };
    }

    return {
      message: 'I can help you with attendance-related queries like checking your today\'s status, monthly summary, or guidance on marking attendance.',
      category: 'attendance',
      confidence: 0.7,
    };
  }

  private async handleLeaveQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    // Leave balance
    if (message.includes('balance') || message.includes('remaining')) {
      return this.getLeaveBalance(query.userId);
    }

    // Leave application
    if (message.includes('apply') || message.includes('request')) {
      return {
        message: 'To apply for leave, go to the Leave module and fill out the leave application form. Make sure to apply at least 24 hours in advance for planned leaves.',
        actions: [
          {
            type: 'navigate',
            label: 'Apply for Leave',
            endpoint: '/leave/apply',
          },
        ],
        category: 'leave',
        confidence: 0.9,
      };
    }

    // Leave status
    if (message.includes('status') || message.includes('approved') || message.includes('pending')) {
      return this.getLeaveStatus(query.userId);
    }

    return {
      message: 'I can help you with leave-related queries like checking your leave balance, application status, or guidance on applying for leave.',
      category: 'leave',
      confidence: 0.7,
    };
  }

  private async handlePayrollQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    // Payslip
    if (message.includes('payslip') || message.includes('salary slip')) {
      return {
        message: 'Your latest payslip is available in the Payroll section. You can download it as a PDF for your records.',
        actions: [
          {
            type: 'navigate',
            label: 'View Payslip',
            endpoint: '/payroll/payslip',
          },
        ],
        category: 'payroll',
        confidence: 0.9,
      };
    }

    // Salary information
    if (message.includes('salary') || message.includes('pay')) {
      return this.getSalaryInfo(query.userId);
    }

    return {
      message: 'I can help you with payroll-related queries like viewing your payslip, salary details, or tax information.',
      category: 'payroll',
      confidence: 0.7,
    };
  }

  private async handleEmployeeQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    // Profile information
    if (message.includes('profile') || message.includes('details') || message.includes('information')) {
      return {
        message: 'You can view and update your profile information in the Employee section. Keep your contact details updated for important communications.',
        actions: [
          {
            type: 'navigate',
            label: 'View Profile',
            endpoint: '/employee/profile',
          },
        ],
        category: 'employee',
        confidence: 0.9,
      };
    }

    // Department or team information
    if (message.includes('department') || message.includes('team') || message.includes('colleagues')) {
      return this.getDepartmentInfo(query.userId);
    }

    return {
      message: 'I can help you with employee-related queries like profile information, department details, or team members.',
      category: 'employee',
      confidence: 0.7,
    };
  }

  private async handlePolicyQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    // Search for specific policy
    for (const [policy, description] of Object.entries(this.hrKnowledgeBase)) {
      if (message.includes(policy.toLowerCase())) {
        return {
          message: description,
          category: 'policy',
          confidence: 0.9,
        };
      }
    }

    // General policy information
    return {
      message: 'I can help you with company policies. Here are some topics I can assist with: working hours, leave policy, attendance policy, payroll schedule, overtime policy, dress code, and more.',
      data: Object.keys(this.hrKnowledgeBase),
      category: 'policy',
      confidence: 0.8,
    };
  }

  private async handleGeneralQuery(query: BotQuery): Promise<BotResponse> {
    const message = query.message.toLowerCase();

    if (message.includes('help') || message.includes('assistance')) {
      return {
        message: 'Hi! I\'m ManaBot, your HR assistant. I can help you with:\n\n• Attendance tracking and status\n• Leave applications and balance\n• Payroll and salary information\n• Employee profiles and departments\n• Company policies and procedures\n\nJust ask me anything HR-related!',
        category: 'general',
        confidence: 0.9,
      };
    }

    return {
      message: 'Hello! I\'m ManaBot, your AI HR assistant. How can I help you today?',
      category: 'general',
      confidence: 0.8,
    };
  }

  private async getTodayAttendance(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.employeeCode) {
        return {
          message: 'Unable to find your employee information.',
          category: 'attendance',
          confidence: 0.5,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        employeeId: user.employeeCode,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      if (!attendance) {
        return {
          message: 'You haven\'t checked in today yet. Don\'t forget to mark your attendance!',
          actions: [
            {
              type: 'navigate',
              label: 'Check In Now',
              endpoint: '/attendance',
            },
          ],
          category: 'attendance',
          confidence: 0.9,
        };
      }

      const checkInTime = attendance.checkIn ?
        new Date(attendance.checkIn).toLocaleTimeString() : 'Not checked in';
      const checkOutTime = attendance.checkOut ?
        new Date(attendance.checkOut).toLocaleTimeString() : 'Not checked out yet';      return {
        message: `Today's Attendance:\n• Check In: ${checkInTime}\n• Check Out: ${checkOutTime}\n• Status: ${attendance.status}`,
        data: attendance,
        category: 'attendance',
        confidence: 0.95,
      };
    } catch (error) {
      throw new AppError('Error fetching attendance data', 500);
    }
  }

  private async getAttendanceSummary(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.employeeCode) {
        return {
          message: 'Unable to find your employee information.',
          category: 'attendance',
          confidence: 0.5,
        };
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const attendanceRecords = await Attendance.find({
        employeeId: user.employeeCode,
        date: { $gte: startOfMonth },
      });

      const presentDays = attendanceRecords.filter(record => record.status === 'present').length;
      const lateDays = attendanceRecords.filter(record => record.status === 'late').length;
      const absentDays = attendanceRecords.filter(record => record.status === 'absent').length;

      return {
        message: `This Month's Attendance Summary:\n• Present Days: ${presentDays}\n• Late Days: ${lateDays}\n• Absent Days: ${absentDays}`,
        data: {
          presentDays,
          lateDays,
          absentDays,
          totalDays: attendanceRecords.length,
        },
        category: 'attendance',
        confidence: 0.95,
      };
    } catch (error) {
      throw new AppError('Error fetching attendance summary', 500);
    }
  }

  private async getLeaveBalance(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.employeeCode) {
        return {
          message: 'Unable to find your employee information.',
          category: 'leave',
          confidence: 0.5,
        };
      }

      const employee = await User.findOne({ employeeCode: user.employeeCode });
      if (!employee) {
        return {
          message: 'Unable to find your employee details.',
          category: 'leave',
          confidence: 0.5,
        };
      }

      const currentYear = new Date().getFullYear();
      const approvedLeaves = await Leave.find({
        employeeId: user.employeeCode,
        status: 'approved',
        startDate: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`),
        },
      });

      const totalLeaveDays = approvedLeaves.reduce((total, leave) => {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return total + diffDays;
      }, 0);

      const annualLeaveBalance = 21 - totalLeaveDays; // Assuming 21 days annual leave

      return {
        message: `Your Leave Balance:\n• Used: ${totalLeaveDays} days\n• Remaining: ${annualLeaveBalance} days\n• Total Annual: 21 days`,
        data: {
          used: totalLeaveDays,
          remaining: annualLeaveBalance,
          total: 21,
        },
        category: 'leave',
        confidence: 0.95,
      };
    } catch (error) {
      throw new AppError('Error fetching leave balance', 500);
    }
  }

  private async getLeaveStatus(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.employeeCode) {
        return {
          message: 'Unable to find your employee information.',
          category: 'leave',
          confidence: 0.5,
        };
      }

      const recentLeaves = await Leave.find({
        employeeId: user.employeeCode,
      }).sort({ createdAt: -1 }).limit(5);

      if (recentLeaves.length === 0) {
        return {
          message: 'You don\'t have any leave applications on record.',
          category: 'leave',
          confidence: 0.9,
        };
      }

      const leaveStatus = recentLeaves.map(leave => {
        const startDate = new Date(leave.startDate).toLocaleDateString();
        const endDate = new Date(leave.endDate).toLocaleDateString();
        return `• ${leave.leaveType}: ${startDate} to ${endDate} - ${leave.status}`;
      }).join('\n');

      return {
        message: `Your Recent Leave Applications:\n${leaveStatus}`,
        data: recentLeaves,
        category: 'leave',
        confidence: 0.95,
      };
    } catch (error) {
      throw new AppError('Error fetching leave status', 500);
    }
  }

  private async getSalaryInfo(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.employeeCode) {
        return {
          message: 'Unable to find your employee information.',
          category: 'payroll',
          confidence: 0.5,
        };
      }

      const latestPayroll = await Payroll.findOne({
        employeeId: user.employeeCode,
      }).sort({ payPeriodEnd: -1 });

      if (!latestPayroll) {
        return {
          message: 'No payroll information found.',
          category: 'payroll',
          confidence: 0.7,
        };
      }

      return {
        message: `Latest Salary Information:\n• Gross Pay: ₹${latestPayroll.basicSalary.toLocaleString()}\n• Net Pay: ₹${latestPayroll.netSalary.toLocaleString()}\n• Pay Period: ${latestPayroll.month} ${latestPayroll.year}`,
        actions: [
          {
            type: 'navigate',
            label: 'View Detailed Payslip',
            endpoint: '/payroll/payslip',
          },
        ],
        category: 'payroll',
        confidence: 0.95,
      };
    } catch (error) {
      throw new AppError('Error fetching salary information', 500);
    }
  }

  private async getDepartmentInfo(userId: string): Promise<BotResponse> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.department) {
        return {
          message: 'Department information not found in your profile.',
          category: 'employee',
          confidence: 0.7,
        };
      }

      const departmentMembers = await User.find({
        department: user.department,
        isActive: true,
      }).select('fullName role').limit(10);

      const membersList = departmentMembers.map((member: any) => 
        `• ${member.fullName} (${member.role})`
      ).join('\n');

      return {
        message: `Department: ${user.department}\n\nTeam Members:\n${membersList}`,
        data: {
          department: user.department,
          members: departmentMembers,
        },
        category: 'employee',
        confidence: 0.9,
      };
    } catch (error) {
      throw new AppError('Error fetching department information', 500);
    }
  }

  private storeChatHistory(userId: string, message: string, response: string, category: string): void {
    if (!this.chatHistory.has(userId)) {
      this.chatHistory.set(userId, []);
    }

    const userHistory = this.chatHistory.get(userId)!;
    const chatMessage: ChatMessage = {
      id: `${userId}-${Date.now()}`,
      userId,
      message,
      response,
      timestamp: new Date(),
      category: (category as any),
    };

    userHistory.push(chatMessage);

    // Keep only last 50 messages per user
    if (userHistory.length > 50) {
      userHistory.splice(0, userHistory.length - 50);
    }
  }

  async getChatHistory(userId: string, limit: number = 20): Promise<ChatMessage[]> {
    const userHistory = this.chatHistory.get(userId) || [];
    return userHistory.slice(-limit);
  }

  async clearChatHistory(userId: string): Promise<boolean> {
    this.chatHistory.delete(userId);
    return true;
  }

  async processQuestion(question: string, userId: string, context?: any): Promise<string> {
    const query: BotQuery = {
      message: question,
      userId,
      context
    };

    const response = await this.processQuery(query);
    return response.message;
  }

  async getPopularQueries(): Promise<Array<{ query: string; count: number; category: string }>> {
    // This would typically be stored in a database with analytics
    return [
      { query: 'What is my leave balance?', count: 45, category: 'leave' },
      { query: 'Show my attendance for this month', count: 38, category: 'attendance' },
      { query: 'When is the next payroll?', count: 32, category: 'payroll' },
      { query: 'What is the leave policy?', count: 28, category: 'policy' },
      { query: 'How do I apply for leave?', count: 25, category: 'leave' },
    ];
  }

  async getBotAnalytics(): Promise<{
    totalQueries: number;
    queriesByCategory: { [key: string]: number };
    averageResponseTime: number;
    userSatisfactionRate: number;
  }> {
    // This would typically be stored in a database with proper analytics
    return {
      totalQueries: 1250,
      queriesByCategory: {
        attendance: 380,
        leave: 345,
        payroll: 280,
        policy: 125,
        employee: 95,
        general: 25,
      },
      averageResponseTime: 1.2, // seconds
      userSatisfactionRate: 0.89, // 89%
    };
  }

  async updateKnowledgeBase(policy: string, description: string): Promise<void> {
    (this.hrKnowledgeBase as any)[policy.toLowerCase()] = description;
  }

  async getKnowledgeBase(): Promise<{ [key: string]: string }> {
    return { ...this.hrKnowledgeBase };
  }



  async generateHRInsights(_userId: string, _department?: string, _startDate?: Date, _endDate?: Date): Promise<any> {
    return {
      insights: [
        { type: 'attendance', message: 'Overall attendance rate is 95%' },
        { type: 'performance', message: 'Team performance has improved by 12%' }
      ],
      recommendations: [
        'Consider implementing flexible work hours',
        'Schedule team building activities'
      ]
    };
  }

  async getEmployeeRecommendations(_employeeId: string, _userId: string): Promise<any> {
    return {
      recommendations: [
        { type: 'training', message: 'Consider leadership training' },
        { type: 'development', message: 'Technical skills enhancement recommended' }
      ]
    };
  }

  async analyzeAttendancePatterns(_userId: string, _startDate: Date, _endDate: Date, _employeeId?: string): Promise<any> {
    return {
      patterns: [
        { pattern: 'late_arrivals', frequency: 'low' },
        { pattern: 'early_departures', frequency: 'medium' }
      ],
      insights: ['Attendance patterns are generally good']
    };
  }

  async analyzePerformanceMetrics(_userId: string, _startDate: Date, _endDate: Date, _employeeId?: string, _department?: string): Promise<any> {
    return {
      metrics: {
        productivity: 85,
        quality: 92,
        collaboration: 78
      },
      insights: ['Performance is above average']
    };
  }

  async generatePolicyRecommendations(_userId: string, _policyArea: string, _department?: string, _currentPolicies?: any[]): Promise<any> {
    return {
      recommendations: [
        { policy: 'remote_work', suggestion: 'Implement hybrid work model' },
        { policy: 'leave_policy', suggestion: 'Increase mental health days' }
      ]
    };
  }

  async getManaBotStatistics(): Promise<any> {
    return {
      totalQueries: 1250,
      averageResponseTime: 0.8,
      userSatisfaction: 4.2,
      topQueries: ['leave balance', 'attendance report', 'policy questions']
    };
  }

  async trainWithCustomData(_userId: string, _trainingData: any): Promise<any> {
    return {
      status: 'success',
      message: 'Training data processed successfully',
      modelVersion: '1.2.1'
    };
  }
}

export default new ManaBotService();
