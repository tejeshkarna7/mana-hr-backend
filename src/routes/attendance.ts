import { Router } from 'express';
import attendanceController from '@/controllers/AttendanceController.js';
import { authenticate } from '@/middlewares/auth.js';
// import { CreateAttendanceSchema, UpdateAttendanceSchema } from '@/validation/attendanceValidation.js';

const router = Router();

// Apply authentication to all attendance routes
router.use(authenticate);

// Attendance routes
router.post('/clock-in', attendanceController.clockIn as any);
router.put('/clock-out', attendanceController.clockOut as any);
router.get('/status', attendanceController.getCurrentStatus as any);
router.delete('/reset-today', attendanceController.resetTodayAttendance as any);
router.post('/', attendanceController.bulkMarkAttendance as any);
router.get('/', attendanceController.getAttendanceRecords);
router.get('/stats', attendanceController.getAttendanceStats);
router.get('/employee/:employeeId', attendanceController.getEmployeeAttendance);
router.get('/:id', attendanceController.getAttendanceById);
router.put('/:id', attendanceController.updateAttendance as any);
router.delete('/:id', attendanceController.deleteAttendance);
router.post('/bulk', attendanceController.bulkMarkAttendance as any);

export default router;