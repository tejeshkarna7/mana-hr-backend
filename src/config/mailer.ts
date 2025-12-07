import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer/index.js';
import { logger } from '@/utils/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

class MailService {
  private static instance: MailService;
  private transporter: Mail;

  private constructor() {
    const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
      logger.warn('Email configuration missing. Email functionality will be disabled.');
      this.transporter = null as any;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT),
      secure: EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection
    this.verifyConnection();
  }

  public static getInstance(): MailService {
    if (!MailService.instance) {
      MailService.instance = new MailService();
    }
    return MailService.instance;
  }

  private async verifyConnection(): Promise<void> {
    if (!this.transporter) {
      return;
    }
    
    try {
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  public async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured. Skipping email send.');
      return false;
    }
    
    try {
      const mailOptions: Mail.Options = {
        from: `"${process.env.COMPANY_NAME || 'ManaHR'}" <${process.env.EMAIL_FROM || 'noreply@manahr.com'}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`, { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  public async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password for your ManaHR account.</p>
        <p>Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${process.env.COMPANY_NAME}. 
          If you have any questions, please contact us at ${process.env.COMPANY_EMAIL}.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request - ManaHR',
      html,
    });
  }

  public async sendWelcomeEmail(to: string, fullName: string, tempPassword: string): Promise<boolean> {
    const loginUrl = `${process.env.FRONTEND_URL}/auth/login`;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Welcome to ManaHR!</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created successfully in the ManaHR system.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <p><strong>Login Details:</strong></p>
          <p>Email: ${to}</p>
          <p>Temporary Password: ${tempPassword}</p>
        </div>
        <p>Please login and change your password immediately for security reasons.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Login to ManaHR
          </a>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${process.env.COMPANY_NAME}. 
          If you have any questions, please contact us at ${process.env.COMPANY_EMAIL}.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to ManaHR - Account Created',
      html,
    });
  }

  public async sendPayslipEmail(to: string, fullName: string, month: string, payslipUrl: string): Promise<boolean> {
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Payslip for ${month}</h2>
        <p>Hello ${fullName},</p>
        <p>Your payslip for ${month} is ready for download.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${payslipUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Download Payslip
          </a>
        </div>
        <p>Please keep this payslip for your records.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${process.env.COMPANY_NAME}. 
          If you have any questions, please contact us at ${process.env.COMPANY_EMAIL}.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Payslip - ${month}`,
      html,
    });
  }
}

export default MailService;