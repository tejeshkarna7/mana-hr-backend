import { Response, NextFunction } from 'express';
import { UserProfileService } from '@/services/index.js';
import { sendResponse, ApiError } from '@/utils/response.js';
import { logger } from '@/utils/logger.js';
import { AuthenticatedRequest } from '@/middlewares/auth.js';

const userProfileService = new UserProfileService();

export class UserProfileController {
  
  /**
   * Get user profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { organizationCode } = req.user;

      const profile = await userProfileService.getProfile(userId, organizationCode);

      if (!profile) {
        return sendResponse(res, 404, false, 'User profile not found');
      }

      logger.info(`Profile retrieved for user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Profile retrieved successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, organizationCode } = req.user;

      const profile = await userProfileService.getProfile(userId, organizationCode);

      if (!profile) {
        return sendResponse(res, 404, false, 'Profile not found. Please complete your profile setup.');
      }

      logger.info(`Profile retrieved for current user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Profile retrieved successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user's own profile
   */
  async updateMyProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, organizationCode } = req.user;
      const profileData = req.body;

      const profile = await userProfileService.upsertProfile(userId, profileData, organizationCode);

      logger.info(`Profile updated for current user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Profile updated successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile by ID (Also works for current user if userId matches token)
   */
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { organizationCode, role } = req.user;
      const profileData = req.body;

      // Convert both IDs to strings for proper comparison
      const requestUserId = userId.toString();
      const tokenUserId = req.user.userId.toString();

      // Check if user can update this profile
      // Allow if: 1) Own profile, 2) HR role, 3) Admin role
      if (tokenUserId !== requestUserId && !['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to update this profile', 403);
      }

      const profile = await userProfileService.upsertProfile(userId, profileData, organizationCode);

      logger.info(`Profile updated for user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Profile updated successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Support both /me and /:userId routes
      const userId = req.params.userId || req.user.userId;
      const { organizationCode, role } = req.user;
      const contactData = req.body;

      // Convert both IDs to strings for proper comparison
      const requestUserId = userId.toString();
      const tokenUserId = req.user.userId.toString();

      // Check if user can update this profile
      if (tokenUserId !== requestUserId && !['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to update this profile', 403);
      }

      const profile = await userProfileService.addEmergencyContact(userId, contactData, organizationCode);

      logger.info(`Emergency contact added for user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Emergency contact added successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get incomplete profiles (Admin/HR only)
   */
  async getIncompleteProfiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { organizationCode, role } = req.user;

      if (!['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to access this resource', 403);
      }

      const profiles = await userProfileService.getIncompleteProfiles(organizationCode);

      logger.info(`Incomplete profiles retrieved by ${role}`, { organizationCode, count: profiles.length });
      return sendResponse(res, 200, true, 'Incomplete profiles retrieved successfully', profiles);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profile statistics (Admin/HR only)
   */
  async getProfileStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { organizationCode, role } = req.user;

      if (!['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to access this resource', 403);
      }

      const stats = await userProfileService.getProfileStats(organizationCode);

      logger.info(`Profile statistics retrieved by ${role}`, { organizationCode });
      return sendResponse(res, 200, true, 'Profile statistics retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user profile (Admin only)
   */
  async deleteProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { organizationCode, role } = req.user;

      if (role.toString() !== 'Admin') {
        throw new ApiError('Unauthorized to delete profiles', 403);
      }

      await userProfileService.deleteProfile(userId, organizationCode);

      logger.info(`Profile deleted for user: ${userId}`, { userId, organizationCode, deletedBy: req.user.userId });
      return sendResponse(res, 200, true, 'Profile deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload profile photo
   * POST /api/v1/profiles/:userId/photo
   */
  async uploadProfilePhoto(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { organizationCode, role } = req.user;

      // Check if user can update this profile
      if (req.user.userId.toString() !== userId && !['Admin', 'HR'].includes(role.toString())) {
        throw new ApiError('Unauthorized to update this profile', 403);
      }

      if (!req.file) {
        throw new ApiError('No image file uploaded', 400);
      }

      const file = req.file;

      // Validate file type - only images
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ApiError('Invalid file type. Only JPEG, PNG, and GIF images are allowed', 400);
      }

      // Save file locally (or to S3 if configured)
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles', userId);
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `profile-${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Save file
      await fs.writeFile(filePath, file.buffer);
      
      // Generate URL
      const photoUrl = `/uploads/profiles/${userId}/${fileName}`;

      // Update profile
      const profile = await userProfileService.updateProfilePhoto(userId, photoUrl, organizationCode);

      logger.info(`Profile photo uploaded for user: ${userId}`, { userId, organizationCode });
      return sendResponse(res, 200, true, 'Profile photo uploaded successfully', profile);
    } catch (error) {
      next(error);
    }
  }
}