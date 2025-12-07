import { Router } from 'express';
import { PermissionService } from '@/services/PermissionService.js';
import { auth } from '@/middlewares/auth.js';
import { extractOrganizationCode, optionalOrganizationCode, OrganizationRequest } from '@/middlewares/organizationCode.js';
import { validate } from '@/middlewares/validation.js';
import { permissionValidation } from '@/validations/index.js';
import { successResponse } from '@/utils/response.js';

const router = Router();

/**
 * @route GET /api/permissions
 * @desc Get all permissions for an organization
 * @access Private (Admin/HR)
 */
router.get(
  '/',
  auth,
  extractOrganizationCode,
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const module = req.query.module as string;
      const includeSystem = req.query.includeSystem !== 'false'; // Default to true
      const permissions = await PermissionService.getAllPermissions(orgReq.organizationCode!, module as any, includeSystem);
      
      res.json(successResponse(permissions, 'Permissions fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/permissions/grouped
 * @desc Get permissions grouped by module
 * @access Private (Admin/HR)
 */
router.get(
  '/grouped',
  auth,
  async (_req, res, next) => {
    try {
      const groupedPermissions = await PermissionService.getPermissionsByModule();
      
      res.json(successResponse(groupedPermissions, 'Grouped permissions fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/permissions/search
 * @desc Search permissions
 * @access Private (Admin/HR)
 */
router.get(
  '/search',
  auth,
  async (req, res, next) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      
      const permissions = await PermissionService.searchPermissions(query);
      
      res.json(successResponse(permissions, 'Search results fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/permissions/:id
 * @desc Get permission by ID
 * @access Private (Admin/HR)
 */
router.get(
  '/:id',
  auth,
  async (req, res, next) => {
    try {
      const permission = await PermissionService.getPermissionById(req.params.id);
      
      res.json(successResponse(permission, 'Permission fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/permissions
 * @desc Create a new permission (organization-specific or system-wide)
 * @access Private (Admin only)
 */
router.post(
  '/',
  auth,
  optionalOrganizationCode, // Optional for system permissions
  validate(permissionValidation.createPermission),
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const permission = await PermissionService.createPermission(req.body, (req as any).user.userId, orgReq.organizationCode);
      
      res.status(201).json(successResponse(permission, 'Permission created successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/permissions/bulk
 * @desc Bulk create permissions
 * @access Private (Admin only)
 */
router.post(
  '/bulk',
  auth,
  validate(permissionValidation.bulkCreatePermissions),
  async (req, res, next) => {
    try {
      const permissions = await PermissionService.bulkCreatePermissions(req.body.permissions, (req as any).user.userId);
      
      res.status(201).json(successResponse(permissions, 'Permissions created successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/permissions/initialize
 * @desc Initialize default permissions
 * @access Private (Admin only)
 */
router.post(
  '/initialize',
  auth,
  async (req, res, next) => {
    try {
      const permissions = await PermissionService.initializeDefaultPermissions((req as any).user.userId);
      
      res.json(successResponse(permissions, 'Default permissions initialized successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/permissions/:id
 * @desc Update permission
 * @access Private (Admin only)
 */
router.put(
  '/:id',
  auth,
  validate(permissionValidation.updatePermission),
  async (req, res, next) => {
    try {
      const permission = await PermissionService.updatePermission(req.params.id, req.body, (req as any).user.userId);
      
      res.json(successResponse(permission, 'Permission updated successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/permissions/:id
 * @desc Delete permission
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  auth,
  async (req, res, next) => {
    try {
      await PermissionService.deletePermission(req.params.id);
      
      res.json(successResponse(null, 'Permission deleted successfully'));
    } catch (error) {
      next(error);
    }
  }
);

export default router;