import { Router } from 'express';
import authController from '@/controllers/AuthController.js';
import { authenticate } from '@/middlewares/auth.js';
import { validate } from '@/middlewares/validation.js';
import { registerSchema, loginSchema, forgotPasswordSchema } from '@/validations/index.js';

const router = Router();

// Public authentication routes
router.post('/register', validate(registerSchema), authController.register as any);
router.post('/login', validate(loginSchema), authController.login as any);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword as any);

// Protected authentication routes
router.post('/refresh-token', authController.refreshToken as any);
router.post('/logout', authenticate, authController.logout as any);

export default router;