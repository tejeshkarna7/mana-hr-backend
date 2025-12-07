import { Request, Response, NextFunction } from 'express';
import { sendError } from '@/utils/response.js';

export interface OrganizationRequest extends Request {
  organizationCode?: string;
}

/**
 * Middleware to extract and validate organization code from request headers
 */
export const extractOrganizationCode = (
  req: OrganizationRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Try to get organization code from header first
    let orgCode = req.headers['x-organization-code'] as string;
    
    // If not in header, try to get from body
    if (!orgCode && req.body?.organizationCode) {
      orgCode = req.body.organizationCode;
    }
    
    // If not in body, try to get from query params
    if (!orgCode && req.query?.organizationCode) {
      orgCode = req.query.organizationCode as string;
    }
    
    if (!orgCode || typeof orgCode !== 'string') {
      sendError(res, 400, 'Organization code is required. Please provide it in X-Organization-Code header, request body, or query parameter.');
      return;
    }
    
    // Validate organization code format
    const trimmedOrgCode = orgCode.trim().toUpperCase();
    
    if (!/^[A-Z0-9]{2,10}$/.test(trimmedOrgCode)) {
      sendError(res, 400, 'Invalid organization code format. Must be 2-10 characters, alphanumeric only.');
      return;
    }
    
    // Add to request object
    req.organizationCode = trimmedOrgCode;
    
    next();
  } catch (error) {
    sendError(res, 500, 'Failed to process organization code');
  }
};

/**
 * Optional organization code middleware - doesn't fail if not provided
 */
export const optionalOrganizationCode = (
  req: OrganizationRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Try to get organization code from header first
    let orgCode = req.headers['x-organization-code'] as string;
    
    // If not in header, try to get from body
    if (!orgCode && req.body?.organizationCode) {
      orgCode = req.body.organizationCode;
    }
    
    // If not in body, try to get from query params
    if (!orgCode && req.query?.organizationCode) {
      orgCode = req.query.organizationCode as string;
    }
    
    if (orgCode && typeof orgCode === 'string') {
      // Validate organization code format if provided
      const trimmedOrgCode = orgCode.trim().toUpperCase();
      
      if (/^[A-Z0-9]{2,10}$/.test(trimmedOrgCode)) {
        req.organizationCode = trimmedOrgCode;
      }
    }
    
    next();
  } catch (error) {
    next(); // Continue even if there's an error with optional middleware
  }
};