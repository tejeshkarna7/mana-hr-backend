import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T
): void => {
  const response: ApiResponse<T> = {
    success,
    message,
    ...(data && { data }),
  };
  
  res.status(statusCode).json(response);
};

export const successResponse = <T = unknown>(
  data: T,
  message = 'Success'
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  
  res.status(statusCode).json(response);
};