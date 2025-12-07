import { Router } from 'express';
import UserControllerClass from '@/controllers/UserController.js';
import { authenticate } from '@/middlewares/auth.js';
import { extractOrganizationCode } from '@/middlewares/organizationCode.js';

const router = Router();
const userController = new UserControllerClass();

// Apply authentication to all user routes
router.use(authenticate);

// Apply organization code extraction to user CRUD routes (but not employee routes)
const orgCodeRoutes = Router();
orgCodeRoutes.use(extractOrganizationCode);

// User CRUD routes with organization filtering
orgCodeRoutes.post('/', userController.createUser as any);
orgCodeRoutes.get('/', userController.getUsers as any);
orgCodeRoutes.get('/:id', userController.getUserById as any);
orgCodeRoutes.put('/:id', userController.updateUser as any);
orgCodeRoutes.delete('/:id', userController.deleteUser as any);

// Profile and utility routes without organization filtering
router.get('/profile', userController.getUserProfile as any);
router.put('/profile', userController.updateUserProfile as any);
router.put('/change-password', userController.changePassword as any);
router.get('/stats', userController.getUserStats);
router.post('/bulk', userController.bulkUserOperations as any);
router.get('/above-role', userController.getUsersAboveRole as any);

// Employee routes (keeping existing structure)
router.post('/employees', userController.createEmployee as any);
router.get('/employees', userController.getEmployees);
router.get('/employees/stats', userController.getEmployeeStats);
router.get('/employees/departments', userController.getDepartments);
router.get('/employees/:id', userController.getEmployeeById);
router.put('/employees/:id', userController.updateEmployee as any);
router.delete('/employees/:id', userController.deleteEmployee as any);

// Mount organization-filtered routes
router.use(orgCodeRoutes);

export default router;