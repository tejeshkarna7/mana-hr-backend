import express from 'express';
import { DashboardController } from '@/controllers/DashboardController.js';
import { authenticate } from '@/middlewares/auth.js';
import { extractOrganizationCode } from '@/middlewares/organizationCode.js';

const router = express.Router();
const dashboardController = new DashboardController();

// Dashboard API endpoint
router.get('/data', authenticate, extractOrganizationCode, dashboardController.getDashboardData as any);

export default router;