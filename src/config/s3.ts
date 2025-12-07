import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '@/utils/logger.js';

class S3Service {
  private static instance: S3Service;
  private s3Client: S3Client;
  private bucketName: string;

  private constructor() {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET } = process.env;

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
      logger.warn('AWS S3 configuration missing. S3 functionality will be disabled.');
      this.s3Client = null as any;
      this.bucketName = '';
      return;
    }

    this.s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = AWS_S3_BUCKET;
    logger.info('S3 Service initialized successfully');
  }

  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  public getS3Client(): S3Client {
    if (!this.s3Client) {
      throw new Error('S3 service not configured');
    }
    return this.s3Client;
  }

  public getBucketName(): string {
    if (!this.bucketName) {
      throw new Error('S3 service not configured');
    }
    return this.bucketName;
  }

  public generateFileKey(folder: string, fileName: string, employeeId?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const prefix = employeeId ? `${folder}/${employeeId}` : folder;
    return `${prefix}/${timestamp}-${randomString}-${fileName}`;
  }

  public getFileUrl(key: string): string {
    if (!this.bucketName) {
      return '/placeholder-file-url';
    }
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}

export default S3Service;