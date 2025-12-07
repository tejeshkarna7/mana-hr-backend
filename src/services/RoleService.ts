import { Role, Permission } from '@/models/index.js';
import { IRole, IRoleCreateInput, IRoleUpdateInput } from '@/types/index.js';
import { ApiError } from '@/utils/response.js';

export class RoleService {
  /**
   * Create a new role
   * @param roleData Role creation data
   * @param organizationCode Organization code for multi-tenancy
   * @param userId User ID creating the role
   * @returns Created role with populated permissions
   */
  static async createRole(roleData: IRoleCreateInput, organizationCode: string, userId: string): Promise<IRole> {
    try {
      console.log('Creating role with data:', roleData);
      console.log('Organization code:', organizationCode);
      
      // Check if role name already exists within the organization
      const existingRole = await Role.findOne({
        name: roleData.name,
        organizationCode: organizationCode.toUpperCase()
      });
      
      if (existingRole) {
        throw new ApiError('Role name already exists in this organization', 400);
      }

      console.log('Creating new Role instance...');
      const role = new Role({
        ...roleData,
        organizationCode: organizationCode.toUpperCase(),
        createdBy: userId,
        updatedBy: userId
      });
      
      console.log('Saving role to database...');
      await role.save();
      
      console.log('Role saved successfully, fetching with populated permissions...');
      const savedRole = await Role.findById(role._id)
        .populate('permissions')
        .lean() as any;
      
      console.log('Role creation completed successfully');
      return savedRole;
    } catch (error: any) {
      console.error('Role creation error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errors: error.errors,
        stack: error.stack
      });
      
      if (error instanceof ApiError) throw error;
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new ApiError(`Validation failed: ${validationErrors.join(', ')}`, 400);
      }
      
      // Handle duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        throw new ApiError(`Role with this ${field} already exists`, 400);
      }
      
      throw new ApiError(`Failed to create role: ${error.message}`, 500);
    }
  }

  /**
   * Get all roles for an organization
   * @param organizationCode Organization code for filtering
   * @param includeSystemRoles Whether to include system roles
   * @returns Array of roles with populated permissions
   */
  static async getAllRoles(organizationCode: string, includeSystemRoles = true): Promise<IRole[]> {
    try {
      const filter: any = { organizationCode: organizationCode.toUpperCase() };
      
      if (!includeSystemRoles) {
        filter.isSystemRole = { $ne: true };
      }
      
      return await Role.find(filter)
        .populate('permissions')
        .sort({ level: 1, name: 1 })
        .lean() as IRole[];
    } catch (error: any) {
      throw new ApiError('Failed to fetch roles', 500);
    }
  }

  /**
   * Get role by ID within an organization
   * @param roleId Role ID
   * @param organizationCode Organization code for filtering
   * @returns Role with populated permissions
   */
  static async getRoleById(roleId: string, organizationCode: string): Promise<IRole> {
    try {
      const role = await Role.findOne({ 
        _id: roleId, 
        organizationCode: organizationCode.toUpperCase() 
      })
        .populate('permissions')
        .lean() as any;

      if (!role) {
        throw new ApiError('Role not found', 404);
      }

      return role;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch role', 500);
    }
  }

  /**
   * Update role within an organization
   * @param roleId Role ID
   * @param updateData Update data
   * @param organizationCode Organization code for filtering
   * @param userId User ID updating the role
   * @returns Updated role with populated permissions
   */
  static async updateRole(roleId: string, updateData: IRoleUpdateInput, organizationCode: string, userId: string): Promise<IRole> {
    try {
      console.log('Updating role with ID:', roleId);
      console.log('Update data:', updateData);
      console.log('Organization code:', organizationCode);
      
      const role = await Role.findOne({ 
        _id: roleId, 
        organizationCode: organizationCode.toUpperCase() 
      });
      console.log('Found role:', role);
      
      if (!role) {
        throw new ApiError('Role not found', 404);
      }

      // Prevent updating system roles
      if (role.isSystemRole) {
        console.log('Attempted to update system role, blocking...');
        throw new ApiError('Cannot update system role', 403);
      }

      // Check for duplicate role name within organization (if name is being updated)
      if (updateData.name && updateData.name !== role.name) {
        const existingRole = await Role.findOne({
          name: updateData.name,
          organizationCode: organizationCode.toUpperCase(),
          _id: { $ne: roleId }
        });
        
        if (existingRole) {
          throw new ApiError('Role name already exists in this organization', 400);
        }
      }

      console.log('Updating role in database...');
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { ...updateData, updatedBy: userId },
        { new: true, runValidators: true }
      ).populate('permissions').lean() as any;

      console.log('Role updated successfully:', updatedRole);
      return updatedRole;
    } catch (error: any) {
      console.error('Role update error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errors: error.errors,
        stack: error.stack
      });
      
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Failed to update role: ${error.message}`, 500);
    }
  }

  /**
   * Delete role within an organization
   * @param roleId Role ID
   * @param organizationCode Organization code for filtering
   */
  static async deleteRole(roleId: string, organizationCode: string): Promise<void> {
    try {
      console.log('Deleting role with ID:', roleId);
      console.log('Organization code:', organizationCode);
      
      const role = await Role.findOne({ 
        _id: roleId, 
        organizationCode: organizationCode.toUpperCase() 
      });
      console.log('Found role for deletion:', role);
      
      if (!role) {
        throw new ApiError('Role not found', 404);
      }

      // Prevent deleting system roles
      if (role.isSystemRole) {
        console.log('Attempted to delete system role, blocking...');
        throw new ApiError('Cannot delete system role', 403);
      }

      // Check if role is assigned to any users using the role's level (numeric ID) within the organization
      console.log('Checking if role level is assigned to users...', role.level);
      const { User } = await import('@/models/User.js');
      const userCount = await User.countDocuments({ 
        role: role.level,
        organizationCode: organizationCode.toUpperCase()
      });
      console.log('Users with this role level in organization:', userCount);
      
      if (userCount > 0) {
        throw new ApiError(`Cannot delete role that is assigned to ${userCount} users`, 400);
      }

      console.log('Deleting role from database...');
      await Role.findByIdAndDelete(roleId);
      console.log('Role deleted successfully');
    } catch (error: any) {
      console.error('Role deletion error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errors: error.errors,
        stack: error.stack
      });
      
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Failed to delete role: ${error.message}`, 500);
    }
  }

  /**
   * Add permissions to role
   * @param roleId Role ID
   * @param permissionIds Array of permission IDs to add
   * @returns Updated role with populated permissions
   */
  static async addPermissions(roleId: string, permissionIds: string[]): Promise<IRole> {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new ApiError('Role not found', 404);
      }

      // Prevent updating system roles
      if (role.isSystemRole) {
        throw new ApiError('Cannot modify system role permissions', 403);
      }

      // Validate permissions exist
      const validPermissions = await Permission.find({
        _id: { $in: permissionIds }
      }).countDocuments();
      
      if (validPermissions !== permissionIds.length) {
        throw new ApiError('Some permissions are invalid', 400);
      }

      // Add permissions (avoid duplicates)
      const newPermissions = permissionIds.filter(
        id => !role.permissions.some(p => p.toString() === id)
      );

      if (newPermissions.length === 0) {
        throw new ApiError('All permissions are already assigned to this role', 400);
      }

      // Add permissions as strings (MongoDB will handle conversion)
      (role as any).permissions.push(...newPermissions);
      await role.save();

      return await Role.findById(roleId)
        .populate('permissions')
        .lean() as IRole;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to add permissions', 500);
    }
  }

  /**
   * Remove permissions from role
   * @param roleId Role ID
   * @param permissionIds Array of permission IDs to remove
   * @returns Updated role with populated permissions
   */
  static async removePermissions(roleId: string, permissionIds: string[]): Promise<IRole> {
    try {
      const role = await Role.findById(roleId);
      if (!role) {
        throw new ApiError('Role not found', 404);
      }

      // Prevent updating system roles
      if (role.isSystemRole) {
        throw new ApiError('Cannot modify system role permissions', 403);
      }

      // Remove permissions (handle both string and object types)
      (role as any).permissions = (role as any).permissions.filter(
        (p: any) => !permissionIds.includes(typeof p === 'string' ? p : p._id.toString())
      );
      
      await role.save();

      return await Role.findById(roleId)
        .populate('permissions')
        .lean() as IRole;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to remove permissions', 500);
    }
  }

  /**
   * Check if role has specific permission
   * @param roleId Role ID
   * @param permissionName Permission name (e.g., 'users:create')
   * @returns Boolean indicating if role has permission
   */
  static async hasPermission(roleId: string, permissionName: string): Promise<boolean> {
    try {
      const role = await Role.findById(roleId).populate('permissions');
      if (!role) return false;

      return role.permissions.some((p: any) => 
        typeof p === 'object' && p.name === permissionName
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get roles by level (useful for hierarchical access control)
   * @param maxLevel Maximum role level to include
   * @returns Array of roles with level less than or equal to maxLevel
   */
  static async getRolesByLevel(maxLevel: number): Promise<IRole[]> {
    try {
      return await Role.find({ 
        level: { $lte: maxLevel },
        isSystemRole: { $ne: true }
      })
      .populate('permissions')
      .sort({ level: 1, name: 1 })
      .lean() as any[];
    } catch (error: any) {
      throw new ApiError('Failed to fetch roles by level', 500);
    }
  }
}