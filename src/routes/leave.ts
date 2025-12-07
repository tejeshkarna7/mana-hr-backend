import { Router } from 'express';
import LeaveControllerClass from '@/controllers/LeaveController.js';
import { authenticate, extractOrganizationCode } from '@/middlewares/auth.js';
// import { CreateLeaveSchema, UpdateLeaveSchema } from '@/validation/leaveValidation.js';

const router = Router();
const leaveController = new LeaveControllerClass();

// Apply authentication and organization code extraction to all leave routes
router.use(authenticate, extractOrganizationCode);

// Leave Type Management routes
router.post('/types', leaveController.createLeaveType as any);
router.get('/types', leaveController.getLeaveTypes as any);
router.put('/types/:id', leaveController.updateLeaveType as any);
router.delete('/types/:id', leaveController.deleteLeaveType as any);

// Leave routes
router.post('/', leaveController.createLeave as any);
router.get('/', leaveController.getLeaveRequests as any);
router.get('/stats', leaveController.getLeaveStats as any);
router.get('/employee/:employeeId', leaveController.getEmployeeLeaves as any);
router.get('/:id', leaveController.getLeaveById as any);
router.put('/:id', leaveController.updateLeave as any);
router.delete('/:id', leaveController.deleteLeave as any);
router.put('/:id/approve', leaveController.approveLeave as any);
router.put('/:id/reject', leaveController.rejectLeave as any);
router.get('/balance/:employeeId', leaveController.getLeaveBalance as any);
router.post('/bulk', leaveController.bulkLeaveOperations as any);

export default router;