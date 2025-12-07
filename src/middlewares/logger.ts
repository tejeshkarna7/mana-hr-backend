import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

export interface LogRequest extends Request {
  startTime?: number;
}

export const requestLogger = (req: LogRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  req.startTime = startTime;

  // Log request start
  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  (res as any).end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;
    
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString(),
    });

    // Call original end method
    return originalEnd(chunk, encoding, callback);
  };

  next();
};

export const errorLogger = (error: any, req: Request, _res: Response, next: NextFunction): void => {
  logger.error(`Error in ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    statusCode: error.statusCode || 500,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  next(error);
};