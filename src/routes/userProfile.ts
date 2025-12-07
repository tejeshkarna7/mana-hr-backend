import { Router } from 'express';
import { auth } from '@/middlewares/auth.js';
import { UserProfileController } from '@/controllers/UserProfileController.js';
import { uploadImage } from '@/middlewares/upload.js';

const router = Router();
const userProfileController = new UserProfileController();

// Apply authentication to all routes
router.use(auth);

// User profile routes
router.get('/me', (req, res, next) => {
  userProfileController.getMyProfile(req as any, res, next);
});

router.put('/me', (req, res, next) => {
  userProfileController.updateMyProfile(req as any, res, next);
});

router.post('/me/emergency-contacts', (req, res, next) => {
  userProfileController.addEmergencyContact(req as any, res, next);
});

router.post('/me/photo', uploadImage.single('photo'), (req, res, next) => {
  // Use current user's ID
  const authReq = req as any;
  if (!req.params) {
    (req as any).params = {};
  }
  (req as any).params.userId = authReq.user.userId;
  userProfileController.uploadProfilePhoto(req as any, res, next);
});

router.get('/incomplete', (req, res, next) => {
  userProfileController.getIncompleteProfiles(req as any, res, next);
});

router.get('/stats', (req, res, next) => {
  userProfileController.getProfileStats(req as any, res, next);
});

router.get('/:userId', (req, res, next) => {
  userProfileController.getProfile(req as any, res, next);
});

router.put('/:userId', (req, res, next) => {
  userProfileController.updateProfile(req as any, res, next);
});

router.post('/:userId/emergency-contacts', (req, res, next) => {
  userProfileController.addEmergencyContact(req as any, res, next);
});

router.post('/:userId/photo', uploadImage.single('photo'), (req, res, next) => {
  userProfileController.uploadProfilePhoto(req as any, res, next);
});

router.delete('/:userId', (req, res, next) => {
  userProfileController.deleteProfile(req as any, res, next);
});

export default router;