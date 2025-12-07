import { Payroll, User } from '@/models/index.js';
import { IPayroll, PayrollStatus } from '@/types/index.js';
import { AppError } from '@/middlewares/error.js';
import { formatCurrency, formatDate } from '@/utils/helpers.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import S3Service from '@/config/s3.js';
import MailService from '@/config/mailer.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface PayrollFilters {
  userId?: string;
  month?: string;
  year?: number;
  status?: PayrollStatus;
}

class PayrollService {
  private s3Service = S3Service.getInstance();
  private mailService = MailService.getInstance();

  async generatePayrollForEmployee(
    userId: string,
    month: string,
    year: number,
    generatedBy: string
  ): Promise<IPayroll> {
    // Verify employee exists
    const employee = await User.findById(userId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (employee.status !== 'active') {
      throw new AppError('Cannot generate payroll for inactive employee', 400);
    }

    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({
      userId,
      month,
      year,
    });

    if (existingPayroll) {
      throw new AppError('Payroll already generated for this month', 400);
    }

    // Create payroll
    const payroll = await Payroll.create({
      userId,
      month,
      year,
      basicSalary: employee.salaryStructure?.basicSalary || 0,
      allowances: employee.salaryStructure?.allowances || [],
      deductions: employee.salaryStructure?.deductions || [],
      generatedBy,
    });

    return payroll.populate([
      { path: 'userId', select: 'fullName employeeCode department designation' },
      { path: 'generatedBy', select: 'fullName email' },
    ]);
  }

  async generateMonthlyPayroll(month: string, year: number, generatedBy: string): Promise<{
    successful: IPayroll[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const employees = await User.find({ 
      status: 'active',
      role: { $in: [3, 4, 5] }, // HR, MANAGER, EMPLOYEE
      employeeCode: { $exists: true }
    });
    const successful: IPayroll[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const employee of employees) {
      try {
        const payroll = await this.generatePayrollForEmployee(
          employee._id,
          month,
          year,
          generatedBy
        );
        successful.push(payroll);
      } catch (error) {
        failed.push({
          userId: employee._id,
          error: (error as Error).message,
        });
      }
    }

    return { successful, failed };
  }

  async getAllPayrolls(
    page = 1,
    limit = 10,
    filters: PayrollFilters = {},
    sort?: string
  ): Promise<{
    payrolls: IPayroll[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.month) {
      query.month = filters.month;
    }

    if (filters.year) {
      query.year = filters.year;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    let sortOption: any = { generatedDate: -1 };
    
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .populate('userId', 'fullName employeeCode department designation')
        .populate('generatedBy', 'fullName email')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payroll.countDocuments(query),
    ]);

    return {
      payrolls,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getPayrollById(id: string): Promise<IPayroll> {
    const payroll = await Payroll.findById(id)
      .populate('userId', 'fullName employeeCode department designation bankDetails')
      .populate('generatedBy', 'fullName email');

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    return payroll;
  }

  async getEmployeePayroll(
    userId: string,
    month?: string,
    year?: number
  ): Promise<IPayroll[]> {
    let query: any = { userId };

    if (month) {
      query.month = month;
    }

    if (year) {
      query.year = year;
    }

    return Payroll.find(query)
      .populate('generatedBy', 'fullName email')
      .sort({ year: -1, month: -1 });
  }

  async updatePayrollStatus(
    id: string,
    status: PayrollStatus,
    _updatedBy: string
  ): Promise<IPayroll> {
    const payroll = await Payroll.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('userId', 'fullName employeeCode department designation')
      .populate('generatedBy', 'fullName email');

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    return payroll;
  }

  async updatePayroll(
    id: string,
    updateData: Partial<IPayroll>,
    _updatedBy: string,
    organizationCode?: string
  ): Promise<IPayroll> {
    // Build query with organization filter if provided
    const query: any = { _id: id };
    if (organizationCode) {
      query.organizationCode = organizationCode;
    }

    // Remove fields that shouldn't be updated directly
    const { _id, createdAt, updatedAt, generatedBy, organizationCode: orgCode, ...allowedUpdates } = updateData;

    // Add updatedBy to track who made the changes
    const finalUpdateData = {
      ...allowedUpdates,
      // Don't override generatedBy, but we could add an updatedBy field if needed
    };

    const payroll = await Payroll.findOneAndUpdate(
      query,
      finalUpdateData,
      { new: true, runValidators: true }
    )
      .populate('userId', 'fullName employeeCode department designation')
      .populate('generatedBy', 'fullName email');

    if (!payroll) {
      throw new AppError('Payroll record not found or access denied', 404);
    }

    return payroll;
  }

  async generatePayslipPDF(payrollId: string): Promise<string> {
    const payroll = await Payroll.findById(payrollId)
      .populate('userId', 'fullName employeeCode department designation bankDetails');

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    const employee = payroll.userId as any;
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Company header
    page.drawText('ManaHR Technologies', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0.2, 0.5),
    });

    page.drawText('Payslip', {
      x: width - 100,
      y: height - 50,
      size: 18,
      font: boldFont,
    });

    // Employee details
    let yPos = height - 120;
    
    page.drawText(`Employee: ${employee.fullName}`, {
      x: 50,
      y: yPos,
      size: 12,
      font: boldFont,
    });

    page.drawText(`Employee Code: ${employee.employeeCode}`, {
      x: 300,
      y: yPos,
      size: 12,
      font,
    });

    yPos -= 20;
    page.drawText(`Department: ${employee.department}`, {
      x: 50,
      y: yPos,
      size: 12,
      font,
    });

    page.drawText(`Designation: ${employee.designation}`, {
      x: 300,
      y: yPos,
      size: 12,
      font,
    });

    yPos -= 20;
    page.drawText(`Pay Period: ${payroll.month} ${payroll.year}`, {
      x: 50,
      y: yPos,
      size: 12,
      font,
    });

    // Salary breakdown
    yPos -= 50;
    page.drawText('EARNINGS', {
      x: 50,
      y: yPos,
      size: 14,
      font: boldFont,
    });

    page.drawText('DEDUCTIONS', {
      x: 350,
      y: yPos,
      size: 14,
      font: boldFont,
    });

    yPos -= 30;
    
    // Basic salary
    page.drawText(`Basic Salary: ${formatCurrency(payroll.basicSalary)}`, {
      x: 50,
      y: yPos,
      size: 10,
      font,
    });

    // Allowances
    let allowanceTotal = 0;
    payroll.allowances.forEach((allowance) => {
      yPos -= 15;
      const amount = allowance.isPercentage 
        ? (payroll.basicSalary * allowance.amount) / 100 
        : allowance.amount;
      allowanceTotal += amount;
      
      page.drawText(`${allowance.type}: ${formatCurrency(amount)}`, {
        x: 50,
        y: yPos,
        size: 10,
        font,
      });
    });

    // Deductions
    let deductionY = yPos - 30;
    payroll.deductions.forEach((deduction) => {
      const amount = deduction.isPercentage 
        ? (payroll.basicSalary * deduction.amount) / 100 
        : deduction.amount;
      
      page.drawText(`${deduction.type}: ${formatCurrency(amount)}`, {
        x: 350,
        y: deductionY,
        size: 10,
        font,
      });
      
      deductionY -= 15;
    });

    // Totals
    yPos -= 80;
    page.drawText(`Gross Salary: ${formatCurrency(payroll.grossSalary)}`, {
      x: 50,
      y: yPos,
      size: 12,
      font: boldFont,
    });

    page.drawText(`Total Deductions: ${formatCurrency(payroll.totalDeductions)}`, {
      x: 350,
      y: yPos,
      size: 12,
      font: boldFont,
    });

    yPos -= 30;
    page.drawText(`NET SALARY: ${formatCurrency(payroll.netSalary)}`, {
      x: 50,
      y: yPos,
      size: 16,
      font: boldFont,
      color: rgb(0, 0.5, 0),
    });

    // Bank details
    if (employee.bankDetails) {
      yPos -= 50;
      page.drawText('Bank Details:', {
        x: 50,
        y: yPos,
        size: 12,
        font: boldFont,
      });

      yPos -= 20;
      page.drawText(`Account Holder: ${employee.bankDetails.accountHolderName}`, {
        x: 50,
        y: yPos,
        size: 10,
        font,
      });

      yPos -= 15;
      page.drawText(`Account Number: ****${employee.bankDetails.accountNumber.slice(-4)}`, {
        x: 50,
        y: yPos,
        size: 10,
        font,
      });

      yPos -= 15;
      page.drawText(`Bank: ${employee.bankDetails.bankName}`, {
        x: 50,
        y: yPos,
        size: 10,
        font,
      });

      yPos -= 15;
      page.drawText(`IFSC: ${employee.bankDetails.ifscCode}`, {
        x: 50,
        y: yPos,
        size: 10,
        font,
      });
    }

    // Footer
    page.drawText(
      `Generated on: ${formatDate(new Date())} | This is a system generated payslip.`,
      {
        x: 50,
        y: 50,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      }
    );

    // Save PDF to buffer
    const pdfBytes = await pdfDoc.save();

    // Upload to S3
    const fileName = `payslip-${employee.employeeCode}-${payroll.month}-${payroll.year}.pdf`;
    const s3Key = this.s3Service.generateFileKey('payslips', fileName, employee._id);

    const uploadCommand = new PutObjectCommand({
      Bucket: this.s3Service.getBucketName(),
      Key: s3Key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    });

    await this.s3Service.getS3Client().send(uploadCommand);

    const fileUrl = this.s3Service.getFileUrl(s3Key);

    // Update payroll with PDF URL
    payroll.payslipPdfUrl = fileUrl;
    await payroll.save();

    return fileUrl;
  }

  async sendPayslipEmail(payrollId: string): Promise<boolean> {
    const payroll = await Payroll.findById(payrollId)
      .populate('userId', 'fullName email employeeCode');

    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    if (!payroll.payslipPdfUrl) {
      // Generate PDF first
      await this.generatePayslipPDF(payrollId);
      // Refresh payroll data
      await payroll.populate('userId', 'fullName email employeeCode');
    }

    const employee = payroll.userId as any;

    return this.mailService.sendPayslipEmail(
      employee.email,
      employee.fullName,
      `${payroll.month} ${payroll.year}`,
      payroll.payslipPdfUrl!
    );
  }

  async generatePayroll(userId: string, month: number, year: number, createdBy: string, organizationCode: string): Promise<IPayroll> {
    // Check if payroll already exists for this period
    const existingPayroll = await Payroll.findOne({ userId, month, year, organizationCode });
    if (existingPayroll) {
      throw new AppError('Payroll already generated for this period', 400);
    }

    // Get employee details
    const employee = await User.findById(userId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Create payroll record
    const payroll = await Payroll.create({
      userId,
      month,
      year,
      basicSalary: employee.salaryStructure?.basicSalary || 0,
      allowances: employee.salaryStructure?.allowances || [],
      deductions: employee.salaryStructure?.deductions || [],
      grossSalary: (employee.salaryStructure?.basicSalary || 0) + (employee.salaryStructure?.allowances?.reduce((sum: number, allowance: any) => sum + allowance.amount, 0) || 0),
      netSalary: 0, // Will be calculated
      status: PayrollStatus.DRAFT,
      generatedBy: createdBy,
      organizationCode
    });

    return payroll;
  }

  async createPayroll(payrollData: {
    userId: string;
    month: string;
    year: number;
    basicSalary: number;
    allowances?: Array<{type: string; amount: number; isPercentage: boolean}>;
    deductions?: Array<{type: string; amount: number; isPercentage: boolean}>;
  }, createdBy: string, organizationCode: string): Promise<IPayroll> {
    // Check if payroll already exists for this period
    const existingPayroll = await Payroll.findOne({
      userId: payrollData.userId,
      month: payrollData.month,
      year: payrollData.year,
      organizationCode
    });
    
    if (existingPayroll) {
      throw new AppError('Payroll already exists for this period', 400);
    }

    // Verify employee exists
    const employee = await User.findById(payrollData.userId);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Create payroll with manual data
    const payroll = await Payroll.create({
      ...payrollData,
      allowances: payrollData.allowances || [],
      deductions: payrollData.deductions || [],
      generatedBy: createdBy,
      organizationCode,
    });

    return payroll.populate([
      { path: 'userId', select: 'fullName employeeCode department designation' },
      { path: 'generatedBy', select: 'fullName email' },
    ]);
  }


  async deletePayroll(id: string): Promise<void> {
    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      throw new AppError('Payroll record not found', 404);
    }

    if (payroll.status === PayrollStatus.PAID) {
      throw new AppError('Cannot delete paid payroll', 400);
    }

    await Payroll.findByIdAndDelete(id);
  }

  async getPayrollReport(
    month: string,
    year: number
  ): Promise<{
    summary: {
      totalEmployees: number;
      totalGrossSalary: number;
      totalDeductions: number;
      totalNetSalary: number;
      byDepartment: Array<{
        department: string;
        employeeCount: number;
        totalGross: number;
        totalNet: number;
      }>;
      byStatus: Array<{
        status: string;
        count: number;
      }>;
    };
    details: IPayroll[];
  }> {
    const [summary, byDepartment, byStatus, details] = await Promise.all([
      Payroll.aggregate([
        { $match: { month, year } },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalGrossSalary: { $sum: '$grossSalary' },
            totalDeductions: { $sum: '$totalDeductions' },
            totalNetSalary: { $sum: '$netSalary' },
          },
        },
      ]),
      Payroll.aggregate([
        { $match: { month, year } },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $group: {
            _id: '$employee.department',
            employeeCount: { $sum: 1 },
            totalGross: { $sum: '$grossSalary' },
            totalNet: { $sum: '$netSalary' },
          },
        },
        {
          $project: {
            department: '$_id',
            employeeCount: 1,
            totalGross: 1,
            totalNet: 1,
            _id: 0,
          },
        },
        { $sort: { totalGross: -1 } },
      ]),
      Payroll.aggregate([
        { $match: { month, year } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0,
          },
        },
      ]),
      Payroll.find({ month, year })
        .populate('userId', 'fullName employeeCode department designation')
        .populate('generatedBy', 'fullName email')
        .sort({ 'userId.fullName': 1 }),
    ]);

    return {
      summary: {
        ...summary[0],
        byDepartment,
        byStatus,
      },
      details,
    };
  }

  async getPayrollStats(): Promise<{
    thisMonth: {
      total: number;
      generated: number;
      paid: number;
      pending: number;
    };
    lastMonth: {
      total: number;
      generated: number;
      paid: number;
    };
  }> {
    const now = new Date();
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0');
    const thisYear = now.getFullYear();
    
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthYear = now.getMonth() === 0 ? thisYear - 1 : thisYear;
    const lastMonthStr = String(lastMonth).padStart(2, '0');

    const [thisMonthStats, lastMonthStats] = await Promise.all([
      Payroll.aggregate([
        { $match: { month: thisMonth, year: thisYear } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            generated: {
              $sum: { $cond: [{ $ne: ['$status', PayrollStatus.DRAFT] }, 1, 0] },
            },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', PayrollStatus.PAID] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', PayrollStatus.GENERATED] }, 1, 0] },
            },
          },
        },
      ]),
      Payroll.aggregate([
        { $match: { month: lastMonthStr, year: lastMonthYear } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            generated: {
              $sum: { $cond: [{ $ne: ['$status', PayrollStatus.DRAFT] }, 1, 0] },
            },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', PayrollStatus.PAID] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    return {
      thisMonth: thisMonthStats[0] || { total: 0, generated: 0, paid: 0, pending: 0 },
      lastMonth: lastMonthStats[0] || { total: 0, generated: 0, paid: 0 },
    };
  }

  async getPayrollsByOrganization(
    organizationCode: string,
    options: {
      page?: number;
      limit?: number;
      month?: string;
      year?: number;
      status?: string;
      userId?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ): Promise<{
    payrolls: IPayroll[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    summary: {
      totalPayrolls: number;
      totalGrossSalary: number;
      totalNetSalary: number;
      totalDeductions: number;
      averageGrossSalary: number;
      averageNetSalary: number;
    };
    organizationInfo: {
      organizationCode: string;
      totalEmployees: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      month,
      year,
      status,
      userId,
      sortBy = 'generatedDate',
      sortOrder = 'desc'
    } = options;

    // Build filter query
    const filter: any = { organizationCode };
    
    if (month) filter.month = month;
    if (year) filter.year = year;
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get payrolls with pagination
    const [payrolls, totalCount] = await Promise.all([
      Payroll.find(filter)
        .populate('userId', 'fullName employeeCode department designation email')
        .populate('generatedBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Payroll.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate summary statistics for this organization
    const summaryPipeline = [
      { $match: { organizationCode } },
      {
        $group: {
          _id: null,
          totalPayrolls: { $sum: 1 },
          totalGrossSalary: { $sum: '$grossSalary' },
          totalNetSalary: { $sum: '$netSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          avgGrossSalary: { $avg: '$grossSalary' },
          avgNetSalary: { $avg: '$netSalary' }
        }
      }
    ];

    const [summaryResult] = await Payroll.aggregate(summaryPipeline);
    
    // Get total employees in organization
    const totalEmployees = await User.countDocuments({ organizationCode, role: { $in: [3, 4, 5] } });

    const summary = {
      totalPayrolls: summaryResult?.totalPayrolls || 0,
      totalGrossSalary: summaryResult?.totalGrossSalary || 0,
      totalNetSalary: summaryResult?.totalNetSalary || 0,
      totalDeductions: summaryResult?.totalDeductions || 0,
      averageGrossSalary: Math.round(summaryResult?.avgGrossSalary || 0),
      averageNetSalary: Math.round(summaryResult?.avgNetSalary || 0)
    };

    const organizationInfo = {
      organizationCode,
      totalEmployees
    };

    return {
      payrolls: payrolls as IPayroll[],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      },
      summary,
      organizationInfo
    };
  }
}

export default new PayrollService();