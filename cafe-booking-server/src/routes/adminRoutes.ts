import { Router } from 'express';
import {
  decideOwnerApplication,
  listOwnerApplications,
} from '../controllers/ownerApplicationController';
import { authenticate, authorize } from '../middleware/auth';
import {
  decideCafeRevision,
  listAdminCafeRevisions,
} from '../controllers/cafeRevisionController';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/owner-applications', listOwnerApplications);
router.patch('/owner-applications/:id', decideOwnerApplication);
router.get('/cafe-revisions', listAdminCafeRevisions);
router.patch('/cafe-revisions/:id', decideCafeRevision);

export default router;
