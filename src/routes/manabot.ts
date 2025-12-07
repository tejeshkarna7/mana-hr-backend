import { Router } from 'express';
import { ManaBotController } from '@/controllers/ManaBotController.js';
import { authenticate } from '@/middlewares/auth.js';

const router = Router();
const manaBotController = new ManaBotController();

// Apply authentication to all ManaBot routes
router.use(authenticate);

// ManaBot routes
router.post('/ask', authenticate, manaBotController.askManaBot as any);
router.get('/history', authenticate, manaBotController.getChatHistory as any);
router.get('/insights', authenticate, manaBotController.getHRInsights as any);
router.get('/recommendations/:employeeId', authenticate, manaBotController.getEmployeeRecommendations as any);
router.post('/analyze/attendance', authenticate, manaBotController.analyzeAttendancePatterns as any);
router.post('/analyze/performance', authenticate, manaBotController.getPerformanceInsights as any);
router.post('/policy/recommendations', authenticate, manaBotController.getPolicyRecommendations as any);
router.delete('/history', authenticate, manaBotController.clearChatHistory as any);
router.get('/stats', manaBotController.getManaBotStats);
router.post('/train', authenticate, manaBotController.trainManaBot as any);

export default router;