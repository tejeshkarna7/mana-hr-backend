import { Router } from 'express';
import { RoleService } from '@/services/RoleService.js';
import { auth } from '@/middlewares/auth.js';
import { extractOrganizationCode, OrganizationRequest } from '@/middlewares/organizationCode.js';
import { validate } from '@/middlewares/validation.js';
import { roleValidation } from '@/validations/index.js';
import { successResponse } from '@/utils/response.js';

const router = Router();

/**
 * @route GET /api/roles
 * @desc Get all roles for an organization
 * @access Private (Admin/HR)
 */
router.get(
  '/',
  auth,
  extractOrganizationCode,
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const includeSystemRoles = req.query.includeSystem === 'true';
      const roles = await RoleService.getAllRoles(orgReq.organizationCode!, includeSystemRoles);
      
      res.json(successResponse(roles, 'Roles fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/roles/by-level/:maxLevel
 * @desc Get roles by maximum level
 * @access Private (Admin/HR)
 */
router.get(
  '/by-level/:maxLevel',
  auth,
  async (req, res, next) => {
    try {
      const maxLevel = parseInt(req.params.maxLevel);
      const roles = await RoleService.getRolesByLevel(maxLevel);
      
      res.json(successResponse(roles, 'Roles fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/roles/:id
 * @desc Get role by ID within an organization
 * @access Private (Admin/HR)
 */
router.get(
  '/:id',
  auth,
  extractOrganizationCode,
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const role = await RoleService.getRoleById(req.params.id, orgReq.organizationCode!);
      
      res.json(successResponse(role, 'Role fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/roles
 * @desc Create a new role for an organization
 * @access Private (Admin only)
 */
router.post(
  '/',
  auth,
  extractOrganizationCode,
  validate(roleValidation.createRole),
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const role = await RoleService.createRole(req.body, orgReq.organizationCode!, (req as any).user.userId);
      
      res.status(201).json(successResponse(role, 'Role created successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/roles/:id
 * @desc Update role within an organization
 * @access Private (Admin only)
 */
router.put(
  '/:id',
  auth,
  extractOrganizationCode,
  validate(roleValidation.updateRole),
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      const role = await RoleService.updateRole(req.params.id, req.body, orgReq.organizationCode!, (req as any).user.userId);
      
      res.json(successResponse(role, 'Role updated successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/roles/:id
 * @desc Delete role within an organization
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  auth,
  extractOrganizationCode,
  async (req, res, next) => {
    try {
      const orgReq = req as OrganizationRequest;
      await RoleService.deleteRole(req.params.id, orgReq.organizationCode!);
      
      res.json(successResponse(null, 'Role deleted successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/roles/:id/permissions
 * @desc Add permissions to role
 * @access Private (Admin only)
 */
router.post(
  '/:id/permissions',
  auth,
  validate(roleValidation.managePermissions),
  async (req, res, next) => {
    try {
      const role = await RoleService.addPermissions(req.params.id, req.body.permissions);
      
      res.json(successResponse(role, 'Permissions added successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/roles/:id/permissions
 * @desc Remove permissions from role
 * @access Private (Admin only)
 */
router.delete(
  '/:id/permissions',
  auth,
  validate(roleValidation.managePermissions),
  async (req, res, next) => {
    try {
      const role = await RoleService.removePermissions(req.params.id, req.body.permissions);
      
      res.json(successResponse(role, 'Permissions removed successfully'));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/roles/:id/check-permission/:permission
 * @desc Check if role has specific permission
 * @access Private (Admin/HR)
 */
router.get(
  '/:id/check-permission/:permission',
  auth,
  async (req, res, next) => {
    try {
      const hasPermission = await RoleService.hasPermission(
        req.params.id,
        req.params.permission
      );
      
      res.json(successResponse(
        { hasPermission }, 
        `Role ${hasPermission ? 'has' : 'does not have'} permission`
      ));
    } catch (error) {
      next(error);
    }
  }
);

export default router;