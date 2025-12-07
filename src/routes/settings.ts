import { Router } from 'express';
import SettingsControllerClass from '@/controllers/SettingsController.js';
import { authenticate } from '@/middlewares/auth.js';
// import { UpdateCompanySettingsSchema, UpdateAttendanceSettingsSchema } from '@/validation/settingsValidation.js';

const router = Router();
const settingsController = new SettingsControllerClass();

// Apply authentication to all settings routes
router.use(authenticate);

// Settings routes
router.get('/', settingsController.getAllSettings);
router.get('/company', settingsController.getCompanySettings);
router.put('/company', authenticate, settingsController.updateCompanySettings as any);
router.get('/attendance', settingsController.getAttendanceSettings);
router.put('/attendance', authenticate, settingsController.updateAttendanceSettings as any);
router.post('/reset', authenticate, settingsController.resetSettings as any);
router.post('/backup', authenticate, settingsController.backupSettings as any);
router.post('/restore', authenticate, settingsController.restoreSettings as any);
router.get('/history', settingsController.getSettingsHistory);

export default router;