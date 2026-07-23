import { Router } from 'express';
import {
  attachRevisionCover,
  createCafeRevision,
  createRevisionCoverUploadUrl,
  deleteRevisionCover,
  getCafeRevision,
  listMyCafeRevisions,
  submitCafeRevision,
  updateCafeRevision,
  withdrawCafeRevision,
} from '../controllers/cafeRevisionController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('cafe_owner'));
router.post('/', createCafeRevision);
router.get('/mine', listMyCafeRevisions);
router.get('/:id', getCafeRevision);
router.put('/:id', updateCafeRevision);
router.post('/:id/submit', submitCafeRevision);
router.post('/:id/withdraw', withdrawCafeRevision);
router.post('/:id/cover-image/upload-url', createRevisionCoverUploadUrl);
router.put('/:id/cover-image', attachRevisionCover);
router.delete('/:id/cover-image', deleteRevisionCover);

export default router;
