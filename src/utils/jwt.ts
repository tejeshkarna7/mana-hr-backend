import jwt from 'jsonwebtoken';
import { IUser } from '@/types/index.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: number; // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
}

export const generateToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);

  return token;
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: JWTPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

  return refreshToken;
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key') as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key') as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

export const generateResetToken = (): string => {
  return jwt.sign(
    { timestamp: Date.now() },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: '1h' }
  );
};

export const verifyResetToken = (token: string): boolean => {
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    return true;
  } catch (error) {
    return false;
  }
};