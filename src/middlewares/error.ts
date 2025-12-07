import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.js';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number): AppError => {
  return new AppError(message, statusCode);
};

export const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

export const handleDuplicateFieldsError = (error: any): AppError => {
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

export const handleValidationError = (error: any): AppError => {
  const errors = Object.values(error.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

export const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again!', 401);
};

export const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

export const sendErrorDev = (error: AppError, res: Response): void => {
  res.status(error.statusCode).json({
    success: false,
    error: error,
    message: error.message,
    stack: error.stack,
  });
};

export const sendErrorProd = (error: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (error.isOperational) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', error);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
    });
  }
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    status: 'error',
    message,
    statusCode: 404,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

export const globalErrorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    let err = { ...error };
    err.message = error.message;

    if (error.name === 'CastError') err = handleCastError(err);
    if (error.code === 11000) err = handleDuplicateFieldsError(err);
    if (error.name === 'ValidationError') err = handleValidationError(err);
    if (error.name === 'JsonWebTokenError') err = handleJWTError();
    if (error.name === 'TokenExpiredError') err = handleJWTExpiredError();

    sendErrorProd(err, res);
  }
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};