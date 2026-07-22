import { Router } from 'express';
import {
  createOwnerApplication,
  getMyOwnerApplication,
} from '../controllers/ownerApplicationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('customer'));
router.get('/me', getMyOwnerApplication);
router.post('/', createOwnerApplication);

export default router;
