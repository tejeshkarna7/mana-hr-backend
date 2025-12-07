import { Permission } from '@/models/index.js';
import { IPermission, IPermissionCreateInput, IPermissionUpdateInput, PermissionModule, PermissionAction } from '@/types/index.js';
import { ApiError } from '@/utils/response.js';

export class PermissionService {
  /**
   * Create a new permission
   * @param permissionData Permission creation data
   * @param userId User ID who is creating the permission
   * @param organizationCode Organization code for multi-tenancy (optional for system permissions)
   * @returns Created permission
   */
  static async createPermission(permissionData: IPermissionCreateInput, userId: string, organizationCode?: string): Promise<IPermission> {
    try {
      console.log('Creating permission with data:', permissionData);
      console.log('User ID:', userId);
      console.log('Organization code:', organizationCode);
      
      // Build the query for duplicate check
      const duplicateQuery: any = { name: permissionData.name };
      if (organizationCode) {
        duplicateQuery.organizationCode = organizationCode.toUpperCase();
      } else {
        duplicateQuery.isSystemPermission = true; // System permissions have no org code
      }
      
      // Check if permission already exists within the organization
      const existingPermission = await Permission.findOne(duplicateQuery);
      console.log('Existing permission check:', existingPermission);

      if (existingPermission) {
        throw new ApiError('Permission already exists in this context', 400);
      }

      console.log('Creating new Permission instance...');
      const permission = new Permission({
        ...permissionData,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        isSystemPermission: !organizationCode, // System permission if no org code
        organizationCode: organizationCode?.toUpperCase()
      });
      
      console.log('Saving permission to database...');
      await permission.save();
      
      console.log('Permission created successfully:', permission);
      return permission.toObject() as IPermission;
    } catch (error: any) {
      console.error('Permission creation error details:', {
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
        throw new ApiError('Permission with this name already exists', 400);
      }
      
      throw new ApiError(`Failed to create permission: ${error.message}`, 500);
    }
  }

  /**
   * Get all permissions for an organization
   * @param organizationCode Organization code for filtering
   * @param module Filter by module (optional)
   * @param includeSystemPermissions Include system permissions (default: true)
   * @returns Array of permissions
   */
  static async getAllPermissions(organizationCode: string, module?: PermissionModule, includeSystemPermissions = true): Promise<IPermission[]> {
    try {
      const filter: any = {
        $or: [
          { organizationCode: organizationCode.toUpperCase() }
        ]
      };
      
      if (includeSystemPermissions) {
        filter.$or.push({ isSystemPermission: true });
      }
      
      if (module) {
        filter.module = module;
      }
      
      return await Permission.find(filter)
        .sort({ module: 1, action: 1, resource: 1 })
        .lean() as any[];
    } catch (error: any) {
      throw new ApiError('Failed to fetch permissions', 500);
    }
  }

  /**
   * Get permission by ID
   * @param permissionId Permission ID
   * @returns Permission
   */
  static async getPermissionById(permissionId: string): Promise<IPermission> {
    try {
      const permission = await Permission.findById(permissionId).lean() as any;

      if (!permission) {
        throw new ApiError('Permission not found', 404);
      }

      return permission;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch permission', 500);
    }
  }

  /**
   * Get permission by name
   * @param permissionName Permission name (e.g., 'users:create')
   * @returns Permission
   */
  static async getPermissionByName(permissionName: string): Promise<IPermission | null> {
    try {
      return await Permission.findOne({ name: permissionName }).lean() as any;
    } catch (error) {
      throw new ApiError('Failed to fetch permission', 500);
    }
  }

  /**
   * Update permission
   * @param permissionId Permission ID
   * @param updateData Update data
   * @param userId User ID who is updating the permission
   * @returns Updated permission
   */
  static async updatePermission(permissionId: string, updateData: IPermissionUpdateInput, userId: string): Promise<IPermission> {
    try {
      console.log('Updating permission with ID:', permissionId);
      console.log('Update data:', updateData);
      console.log('User ID:', userId);
      
      const permission = await Permission.findById(permissionId);
      console.log('Found permission:', permission);
      
      if (!permission) {
        throw new ApiError('Permission not found', 404);
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name !== permission.name) {
        console.log('Checking for duplicate permission name:', updateData.name);
        const existingPermission = await Permission.findOne({ 
          name: updateData.name,
          _id: { $ne: permissionId }
        });

        if (existingPermission) {
          throw new ApiError('Permission name already exists', 400);
        }
      }

      console.log('Updating permission in database...');
      const updatedPermission = await Permission.findByIdAndUpdate(
        permissionId,
        { ...updateData, updatedBy: userId },
        { new: true, runValidators: true }
      ).lean() as any;

      console.log('Permission updated successfully:', updatedPermission);
      return updatedPermission;
    } catch (error: any) {
      console.error('Permission update error details:', {
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
      
      throw new ApiError(`Failed to update permission: ${error.message}`, 500);
    }
  }

  /**
   * Delete permission
   * @param permissionId Permission ID
   */
  static async deletePermission(permissionId: string): Promise<void> {
    try {
      console.log('Deleting permission with ID:', permissionId);
      
      const permission = await Permission.findById(permissionId);
      console.log('Found permission for deletion:', permission);
      
      if (!permission) {
        throw new ApiError('Permission not found', 404);
      }

      // Check if permission is assigned to any roles
      console.log('Checking if permission is assigned to roles...');
      const { Role } = await import('@/models/Role.js');
      const roleCount = await Role.countDocuments({ 
        permissions: permissionId 
      });
      console.log('Roles using this permission:', roleCount);
      
      if (roleCount > 0) {
        throw new ApiError(`Cannot delete permission that is assigned to ${roleCount} roles`, 400);
      }

      console.log('Deleting permission from database...');
      await Permission.findByIdAndDelete(permissionId);
      console.log('Permission deleted successfully');
    } catch (error: any) {
      console.error('Permission deletion error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errors: error.errors,
        stack: error.stack
      });
      
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Failed to delete permission: ${error.message}`, 500);
    }
  }

  /**
   * Get permissions grouped by module
   * @returns Permissions grouped by module
   */
  static async getPermissionsByModule(): Promise<Record<string, IPermission[]>> {
    try {
      const permissions = await Permission.find()
        .sort({ module: 1, action: 1, resource: 1 })
        .lean() as any[];

      const grouped: Record<string, IPermission[]> = {};
      
      // Initialize all modules
      Object.values(PermissionModule).forEach(module => {
        grouped[module] = [];
      });

      // Group permissions
      permissions.forEach(permission => {
        if (!grouped[permission.module]) {
          grouped[permission.module] = [];
        }
        grouped[permission.module].push(permission);
      });

      return grouped;
    } catch (error: any) {
      throw new ApiError('Failed to fetch permissions by module', 500);
    }
  }

  /**
   * Bulk create permissions
   * @param permissionsData Array of permission creation data
   * @returns Array of created permissions
   */
  static async bulkCreatePermissions(permissionsData: IPermissionCreateInput[], userId: string): Promise<IPermission[]> {
    try {
      // Check for duplicate names
      const names = permissionsData.map(p => p.name);
      const uniqueNames = [...new Set(names)];
      
      if (names.length !== uniqueNames.length) {
        throw new ApiError('Duplicate permission names in request', 400);
      }

      // Check if any permissions already exist
      const existingPermissions = await Permission.find({
        name: { $in: names }
      });

      if (existingPermissions.length > 0) {
        const existingNames = existingPermissions.map(p => p.name);
        throw new ApiError(`Permissions already exist: ${existingNames.join(', ')}`, 400);
      }

      // Add audit fields to each permission
      const permissionsWithAudit = permissionsData.map(permission => ({
        ...permission,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        isSystemPermission: false
      }));

      const permissions = await Permission.insertMany(permissionsWithAudit);
      return permissions.map(p => p.toObject()) as IPermission[];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to bulk create permissions', 500);
    }
  }

  /**
   * Initialize default permissions for all modules
   * @param userId User ID who is initializing the permissions
   * @returns Array of created permissions
   */
  static async initializeDefaultPermissions(userId: string): Promise<IPermission[]> {
    try {
      const defaultPermissions: IPermissionCreateInput[] = [];

      // Generate CRUD permissions for each module
      Object.values(PermissionModule).forEach(module => {
        Object.values(PermissionAction).forEach(action => {
          const name = `${module}:${action}`;
          const description = `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`;
          
          defaultPermissions.push({
            name,
            description,
            module,
            action,
            resource: '*'
          });
        });
      });

      // Check which permissions don't exist yet
      const existingPermissions = await Permission.find({
        name: { $in: defaultPermissions.map(p => p.name) }
      });
      
      const existingNames = existingPermissions.map(p => p.name);
      const newPermissions = defaultPermissions.filter(
        p => !existingNames.includes(p.name)
      );

      if (newPermissions.length === 0) {
        return existingPermissions.map(p => p.toObject()) as IPermission[];
      }

      // Add audit fields to new permissions
      const permissionsWithAudit = newPermissions.map(permission => ({
        ...permission,
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        isSystemPermission: true // These are system default permissions
      }));

      const createdPermissions = await Permission.insertMany(permissionsWithAudit);
      return [...existingPermissions, ...createdPermissions].map(p => 
        typeof p.toObject === 'function' ? p.toObject() : p
      ) as IPermission[];
    } catch (error: any) {
      throw new ApiError('Failed to initialize default permissions', 500);
    }
  }

  /**
   * Search permissions by name or description
   * @param query Search query
   * @returns Array of matching permissions
   */
  static async searchPermissions(query: string): Promise<IPermission[]> {
    try {
      const searchRegex = new RegExp(query, 'i');
      
      return await Permission.find({
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } }
        ]
      })
      .sort({ module: 1, action: 1, resource: 1 })
      .lean() as any[];
    } catch (error: any) {
      throw new ApiError('Failed to search permissions', 500);
    }
  }
}