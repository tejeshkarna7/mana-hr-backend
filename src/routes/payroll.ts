import { Router } from 'express';
import PayrollControllerClass from '@/controllers/PayrollController.js';
import { authenticate } from '@/middlewares/auth.js';
import { extractOrganizationCode } from '@/middlewares/organizationCode.js';
// import { CreatePayrollSchema, UpdatePayrollSchema } from '@/validation/payrollValidation.js';

const router = Router();
const payrollController = new PayrollControllerClass();

// Apply authentication to all payroll routes
router.use(authenticate);

// Payroll generation routes
router.post('/generate', payrollController.generatePayroll as any);
router.post('/bulk-generate', payrollController.bulkGeneratePayroll as any);

// Payroll management routes
router.post('/', payrollController.createPayroll as any);
router.get('/', payrollController.getPayrollRecords);
router.get('/stats', payrollController.getPayrollStats);
router.get('/organization', extractOrganizationCode, payrollController.getPayrollsByOrganization);
router.get('/user/:userId', payrollController.getEmployeePayroll);
router.get('/:id', payrollController.getPayrollById);
router.put('/:id', payrollController.updatePayroll as any);
router.put('/:id/approve', payrollController.approvePayroll as any);
router.delete('/:id', payrollController.deletePayroll);
router.post('/process', payrollController.processPayroll as any);
router.post('/bulk', payrollController.bulkPayrollOperations as any);

export default router;