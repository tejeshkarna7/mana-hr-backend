// Helper functions for the application

export const generateRandomPassword = (): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  let password = '';
  
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
};

export const generateEmployeeCode = (count: number): string => {
  return `EMP${String(count + 1).padStart(4, '0')}`;
};

export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date, format = 'dd/mm/yyyy'): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  switch (format) {
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    default:
      return date.toLocaleDateString();
  }
};

export const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 8);
};

export const calculateAge = (dob: Date): number => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const calculateWorkingDays = (startDate: Date, endDate: Date, workingDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']): number => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayName = days[currentDate.getDay()];
    if (workingDays.includes(dayName)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
};

export const calculateWorkingHours = (checkIn: Date, checkOut: Date, breakDuration = 0): number => {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const workingMinutes = totalMinutes - breakDuration;
  return Math.max(0, workingMinutes / 60);
};

export const isLateArrival = (checkIn: Date, workingStartTime: string, lateThreshold = 0): boolean => {
  const [hours, minutes] = workingStartTime.split(':').map(Number);
  const workingStart = new Date(checkIn);
  workingStart.setHours(hours, minutes, 0, 0);
  
  const thresholdTime = new Date(workingStart.getTime() + (lateThreshold * 60 * 1000));
  return checkIn > thresholdTime;
};

export const isEarlyDeparture = (checkOut: Date, workingEndTime: string, earlyThreshold = 0): boolean => {
  const [hours, minutes] = workingEndTime.split(':').map(Number);
  const workingEnd = new Date(checkOut);
  workingEnd.setHours(hours, minutes, 0, 0);
  
  const thresholdTime = new Date(workingEnd.getTime() - (earlyThreshold * 60 * 1000));
  return checkOut < thresholdTime;
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const validateFileType = (filename: string, allowedTypes: string[] = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']): boolean => {
  const extension = getFileExtension(filename);
  return allowedTypes.includes(extension);
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  if (bytes === 0) return '0 Byte';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const mask = (value: string, visibleChars = 4, maskChar = '*'): string => {
  if (value.length <= visibleChars) return value;
  
  const visible = value.slice(-visibleChars);
  const masked = maskChar.repeat(value.length - visibleChars);
  return masked + visible;
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const debounce = <T extends (...args: unknown[]) => unknown>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};