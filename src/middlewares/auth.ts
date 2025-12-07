import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/index.js';
import { verifyToken, JWTPayload } from '@/utils/jwt.js';
import { sendError } from '@/utils/response.js';
import { UserStatus } from '@/types/index.js';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: number; // Role ID: 1=SUPER_ADMIN, 2=ADMIN, 3=HR, 4=MANAGER, 5=EMPLOYEE
    fullName?: string;
    organizationCode: string;
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 401, 'Access token is required');
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      sendError(res, 401, 'Access token is required');
      return;
    }

    const decoded: JWTPayload = verifyToken(token);
    
    const user = await User.findById(decoded.userId).select('+status');
    
    if (!user) {
      sendError(res, 401, 'Invalid token - user not found');
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      sendError(res, 401, 'Account is not active');
      return;
    }

    (req as AuthenticatedRequest).user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      organizationCode: user.organizationCode,
    };

    next();
  } catch (error) {
    sendError(res, 401, 'Invalid or expired token');
  }
};

export const authorize = (/* roles: string[] */) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    // For now, allow all authenticated users - proper role checking will be added later
    // if (!roles.includes(user.role)) {
    //   sendError(res, 403, 'Insufficient permissions');
    //   return;
    // }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return next();
  }

  try {
    const decoded: JWTPayload = verifyToken(token);
    const user = await User.findById(decoded.userId).select('+status');
    
    if (user && user.status === UserStatus.ACTIVE) {
      (req as AuthenticatedRequest).user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        organizationCode: user.organizationCode,
      };
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
};

// Export auth as alias for authenticate
export const auth = authenticate;

// Middleware to extract organization code - used when organizationCode is needed
export const extractOrganizationCode = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    sendError(res, 401, 'Authentication required');
    return;
  }

  if (!user.organizationCode) {
    sendError(res, 400, 'Organization code not found');
    return;
  }

  next();
};