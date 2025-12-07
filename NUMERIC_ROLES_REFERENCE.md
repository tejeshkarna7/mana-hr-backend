# ManaHR Role System - Updated to Numeric Values

## Role Mappings

The role system has been updated to use numeric values instead of strings:

| Role Name | Numeric Value | Description |
|-----------|---------------|-------------|
| SUPER_ADMIN | 1 | Full system access with all permissions |
| ADMIN | 2 | Administrative access with most permissions |
| HR | 3 | Human Resources access for employee management |
| MANAGER | 4 | Manager access for team oversight |
| EMPLOYEE | 5 | Basic employee access (default) |

## API Usage

### Register User with Role
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "SecurePass123!",
  "role": 2
}
```

### Role Permissions

#### SUPER_ADMIN (1) & ADMIN (2)
- All user operations (read, write, delete)
- All employee operations (read, write, delete)
- All attendance operations (read, write, delete)
- All leave operations (read, write, approve, delete)
- All payroll operations (read, write, process, delete)
- All document operations (read, write, delete)
- Settings management (read, write)
- Reports access (read, generate)

#### HR (3)
- User operations (read, write)
- Employee operations (read, write)
- Attendance operations (read, write)
- Leave operations (read, write, approve)
- Payroll operations (read, write, process)
- Document operations (read, write)
- Settings access (read only)
- Reports access (read, generate)

#### MANAGER (4)
- Employee access (read only)
- Attendance access (read only)
- Leave management (read, approve)
- Document access (read only)
- Reports access (read only)

#### EMPLOYEE (5)
- Attendance access (read only)
- Leave operations (read, write)
- Document access (read only)

## Changes Made

1. **UserRole enum** updated from string values to numbers
2. **User model schema** updated to store role as Number instead of String
3. **AuthController** updated to handle role conversion from string to number
4. **UserService** updated rolePermissions mapping to use numeric keys
5. **JWT payload** updated to use UserRole type instead of string
6. **Role validation** added to handle both string and numeric inputs

## Database Migration

Existing users with string role values will need to be migrated to numeric values:
- 'super_admin' → 1
- 'admin' → 2
- 'hr' → 3
- 'manager' → 4
- 'employee' → 5

The system now supports role expansion by simply adding new numeric values (6, 7, 8, etc.) to the UserRole enum.