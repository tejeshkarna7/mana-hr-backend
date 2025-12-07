import { Router } from 'express';
import authRoutes from './auth.js';
import attendanceRoutes from './attendance.js';
import leaveRoutes from './leave.js';
import payrollRoutes from './payroll.js';
import documentRoutes from './document.js';
import userRoutes from './user.js';
import userProfileRoutes from './userProfile.js';
import settingsRoutes from './settings.js';
import manabotRoutes from './manabot.js';
import roleRoutes from './role.js';
import permissionRoutes from './permission.js';
import dashboardRoutes from './dashboard.js';

const router = Router();

// Mount all routes with their respective prefixes
router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/documents', documentRoutes);
router.use('/users', userRoutes);
router.use('/profiles', userProfileRoutes);
router.use('/settings', settingsRoutes);
router.use('/manabot', manabotRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;