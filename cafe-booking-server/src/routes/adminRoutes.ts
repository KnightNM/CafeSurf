import { Router } from 'express';
import {
  decideOwnerApplication,
  listOwnerApplications,
} from '../controllers/ownerApplicationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/owner-applications', listOwnerApplications);
router.patch('/owner-applications/:id', decideOwnerApplication);

export default router;
