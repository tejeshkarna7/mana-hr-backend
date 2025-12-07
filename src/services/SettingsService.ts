import { CompanySettings, AttendanceSettings } from '@/models/index.js';
import { ICompanySettings, IAttendanceSettings } from '@/types/index.js';
import { AppError } from '@/middlewares/error.js';

export interface UpdateCompanySettingsData {
  companyName?: string;
  companyLogo?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  contactInfo?: {
    email: string;
    phone: string;
    website?: string;
  };
  workingDays?: string[];
  workingHours?: {
    startTime: string;
    endTime: string;
    totalHours: number;
    breakDuration: number;
  };
  currency?: string;
  timezone?: string;
}

export interface UpdateAttendanceSettingsData {
  autoCheckOut?: boolean;
  autoCheckOutTime?: string;
  lateThreshold?: number;
  earlyDepartureThreshold?: number;
  overtimeThreshold?: number;
  requireLocationTracking?: boolean;
  allowedLocations?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  }>;
}

class SettingsService {
  // Company Settings
  async getAttendanceSettings(): Promise<IAttendanceSettings | null> {
    return AttendanceSettings.findOne().sort({ createdAt: -1 });
  }

  async updateCompanySettings(updateData: any, updatedBy: string): Promise<ICompanySettings> {
    let settings = await CompanySettings.findOne();
    
    if (settings) {
      Object.assign(settings, updateData);
      settings.updatedBy = updatedBy;
      await settings.save();
    } else {
      settings = await CompanySettings.create({ ...updateData, createdBy: updatedBy, updatedBy });
    }
    
    return settings;
  }

  async updateAttendanceSettings(updateData: any, updatedBy: string): Promise<IAttendanceSettings> {
    let settings = await AttendanceSettings.findOne();
    
    if (settings) {
      Object.assign(settings, updateData);
      settings.updatedBy = updatedBy;
      await settings.save();
    } else {
      settings = await AttendanceSettings.create({ ...updateData, createdBy: updatedBy, updatedBy });
    }
    
    return settings;
  }

  async resetToDefault(settingsType: string, _userId: string): Promise<void> {
    // Mock implementation - reset settings to default
    if (settingsType === 'company') {
      await CompanySettings.deleteMany({});
    } else if (settingsType === 'attendance') {
      await AttendanceSettings.deleteMany({});
    }
  }

  async createSettingsBackup(userId: string): Promise<any> {
    const companySettings = await this.getCompanySettings();
    const attendanceSettings = await this.getAttendanceSettings();
    
    return {
      id: Date.now().toString(),
      companySettings,
      attendanceSettings,
      createdBy: userId,
      createdAt: new Date()
    };
  }

  async restoreFromBackup(backupId: string, userId: string): Promise<void> {
    // Mock implementation - restore from backup
    console.log(`Restoring backup ${backupId} by user ${userId}`);
  }

  async getSettingsHistory(page: number, _limit: number, _settingsType?: string): Promise<any> {
    return {
      history: [],
      total: 0,
      pages: 0,
      currentPage: page
    };
  }

  async getCompanySettings(): Promise<ICompanySettings | null> {
    return CompanySettings.findOne().populate('updatedBy', 'fullName email');
  }

  async createOrUpdateCompanySettings(
    settingsData: UpdateCompanySettingsData,
    updatedBy: string
  ): Promise<ICompanySettings> {
    let settings = await CompanySettings.findOne();

    if (settings) {
      // Update existing settings
      Object.assign(settings, settingsData);
      settings.updatedBy = updatedBy as any;
      await settings.save();
    } else {
      // Create new settings
      const defaultSettings = {
        companyName: 'ManaHR Technologies',
        address: {
          street: '123 Business Street',
          city: 'Business City',
          state: 'Business State',
          country: 'India',
          zipCode: '123456',
        },
        contactInfo: {
          email: 'hr@manahr.com',
          phone: '+1-234-567-8900',
          website: 'https://manahr.com',
        },
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: {
          startTime: '09:00',
          endTime: '17:00',
          totalHours: 8,
          breakDuration: 60, // 1 hour break
        },
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        ...settingsData,
        updatedBy,
      };

      settings = await CompanySettings.create(defaultSettings);
    }

    return settings.populate('updatedBy', 'fullName email');
  }

  async updateCompanyLogo(logoUrl: string, updatedBy: string): Promise<ICompanySettings> {
    let settings = await CompanySettings.findOne();

    if (!settings) {
      throw new AppError('Company settings not found. Please create settings first.', 404);
    }

    settings.companyLogo = logoUrl;
    settings.updatedBy = updatedBy as any;
    await settings.save();

    return settings.populate('updatedBy', 'fullName email');
  }



  async createOrUpdateAttendanceSettings(
    settingsData: UpdateAttendanceSettingsData,
    updatedBy: string
  ): Promise<IAttendanceSettings> {
    let settings = await AttendanceSettings.findOne();

    if (settings) {
      // Update existing settings
      Object.assign(settings, settingsData);
      settings.updatedBy = updatedBy as any;
      await settings.save();
    } else {
      // Create new settings with defaults
      const defaultSettings = {
        autoCheckOut: false,
        autoCheckOutTime: '18:00',
        lateThreshold: 15, // 15 minutes
        earlyDepartureThreshold: 15, // 15 minutes
        overtimeThreshold: 480, // 8 hours
        requireLocationTracking: false,
        allowedLocations: [],
        ...settingsData,
        updatedBy,
      };

      settings = await AttendanceSettings.create(defaultSettings);
    }

    return settings.populate('updatedBy', 'fullName email');
  }

  async addAllowedLocation(
    locationData: {
      name: string;
      latitude: number;
      longitude: number;
      radius: number;
    },
    updatedBy: string
  ): Promise<IAttendanceSettings> {
    let settings = await AttendanceSettings.findOne();

    if (!settings) {
      // Create default settings if they don't exist
      const newSettings = await this.createOrUpdateAttendanceSettings({}, updatedBy);
      settings = await AttendanceSettings.findById(newSettings._id);
      if (!settings) {
        throw new AppError('Failed to create attendance settings', 500);
      }
    }

    // Check if location with same name already exists
    const existingLocation = settings.allowedLocations.find(
      loc => loc.name.toLowerCase() === locationData.name.toLowerCase()
    );

    if (existingLocation) {
      throw new AppError('Location with this name already exists', 400);
    }

    settings.allowedLocations.push(locationData);
    settings.updatedBy = updatedBy as any;
    await settings.save();

    return settings.populate('updatedBy', 'fullName email');
  }

  async updateAllowedLocation(
    locationIndex: number,
    locationData: {
      name: string;
      latitude: number;
      longitude: number;
      radius: number;
    },
    updatedBy: string
  ): Promise<IAttendanceSettings> {
    const settings = await AttendanceSettings.findOne();

    if (!settings) {
      throw new AppError('Attendance settings not found', 404);
    }

    if (locationIndex < 0 || locationIndex >= settings.allowedLocations.length) {
      throw new AppError('Invalid location index', 400);
    }

    // Check if another location with same name exists (excluding current location)
    const existingLocation = settings.allowedLocations.find(
      (loc, index) => 
        index !== locationIndex && 
        loc.name.toLowerCase() === locationData.name.toLowerCase()
    );

    if (existingLocation) {
      throw new AppError('Location with this name already exists', 400);
    }

    settings.allowedLocations[locationIndex] = locationData;
    settings.updatedBy = updatedBy as any;
    await settings.save();

    return settings.populate('updatedBy', 'fullName email');
  }

  async removeAllowedLocation(locationIndex: number, updatedBy: string): Promise<IAttendanceSettings> {
    const settings = await AttendanceSettings.findOne();

    if (!settings) {
      throw new AppError('Attendance settings not found', 404);
    }

    if (locationIndex < 0 || locationIndex >= settings.allowedLocations.length) {
      throw new AppError('Invalid location index', 400);
    }

    settings.allowedLocations.splice(locationIndex, 1);
    settings.updatedBy = updatedBy as any;
    await settings.save();

    return settings.populate('updatedBy', 'fullName email');
  }

  async getAllSettings(): Promise<{
    company: ICompanySettings | null;
    attendance: IAttendanceSettings | null;
  }> {
    const [company, attendance] = await Promise.all([
      this.getCompanySettings(),
      this.getAttendanceSettings(),
    ]);

    return { company, attendance };
  }

  async initializeDefaultSettings(createdBy: string): Promise<{
    company: ICompanySettings;
    attendance: IAttendanceSettings;
  }> {
    const [company, attendance] = await Promise.all([
      this.createOrUpdateCompanySettings({}, createdBy),
      this.createOrUpdateAttendanceSettings({}, createdBy),
    ]);

    return { company, attendance };
  }

  async validateWorkingHours(startTime: string, endTime: string): Promise<boolean> {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return endMinutes > startMinutes;
  }

  async calculateTotalWorkingHours(startTime: string, endTime: string, breakDuration: number): Promise<number> {
    if (!this.validateWorkingHours(startTime, endTime)) {
      throw new AppError('End time must be after start time', 400);
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    const totalMinutes = endMinutes - startMinutes - breakDuration;
    return Math.max(0, totalMinutes / 60);
  }

  async validateLocationCoordinates(latitude: number, longitude: number): Promise<boolean> {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  async getSystemConfiguration(): Promise<{
    version: string;
    environment: string;
    features: {
      attendance: boolean;
      payroll: boolean;
      leave: boolean;
      documents: boolean;
      settings: boolean;
    };
    limits: {
      maxFileSize: number;
      allowedFileTypes: string[];
      maxEmployees: number;
    };
  }> {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        attendance: true,
        payroll: true,
        leave: true,
        documents: true,
        settings: true,
      },
      limits: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
        allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png').split(','),
        maxEmployees: 1000,
      },
    };
  }

  async backupSettings(): Promise<{
    company: ICompanySettings | null;
    attendance: IAttendanceSettings | null;
    timestamp: Date;
  }> {
    const [company, attendance] = await Promise.all([
      this.getCompanySettings(),
      this.getAttendanceSettings(),
    ]);

    return {
      company,
      attendance,
      timestamp: new Date(),
    };
  }

  async restoreSettings(
    backup: {
      company?: ICompanySettings;
      attendance?: IAttendanceSettings;
    },
    restoredBy: string
  ): Promise<{
    company: ICompanySettings | null;
    attendance: IAttendanceSettings | null;
  }> {
    const results: {
      company: ICompanySettings | null;
      attendance: IAttendanceSettings | null;
    } = {
      company: null,
      attendance: null,
    };

    if (backup.company) {
      const { _id, createdAt, updatedAt, ...companyData } = backup.company as any;
      results.company = await this.createOrUpdateCompanySettings(companyData, restoredBy);
    }

    if (backup.attendance) {
      const { _id, createdAt, updatedAt, ...attendanceData } = backup.attendance as any;
      results.attendance = await this.createOrUpdateAttendanceSettings(attendanceData, restoredBy);
    }

    return results;
  }
}

export default new SettingsService();