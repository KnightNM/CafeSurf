import { Router } from 'express';
import {
  createCafe,
  updateCafe,
  deleteCafe,
  getMyCafes,
  getCafeBookings,
  createCafeCoverUploadUrl,
  attachCafeCover,
  deleteCafeCover,
} from '../controllers/cafeManagementController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

/**
 * POST /api/cafes/management
 * Create a new cafe (cafe_owner, admin)
 */
router.post('/', authenticate, authorize('cafe_owner', 'admin'), createCafe);

/**
 * PUT /api/cafes/management/:id
 * Update a cafe (owner only, admin)
 */
router.put('/:id', authenticate, authorize('cafe_owner', 'admin'), updateCafe);

/**
 * DELETE /api/cafes/management/:id
 * Delete a cafe (owner only, admin)
 */
router.delete('/:id', authenticate, authorize('cafe_owner', 'admin'), deleteCafe);

/**
 * GET /api/cafes/management/my-cafes
 * Get cafes owned by current user (cafe_owner, admin)
 */
router.get('/my-cafes', authenticate, authorize('cafe_owner', 'admin'), getMyCafes);

router.post(
  '/:id/cover-image/upload-url',
  authenticate,
  authorize('cafe_owner', 'admin'),
  createCafeCoverUploadUrl
);

router.put(
  '/:id/cover-image',
  authenticate,
  authorize('cafe_owner', 'admin'),
  attachCafeCover
);

router.delete(
  '/:id/cover-image',
  authenticate,
  authorize('cafe_owner', 'admin'),
  deleteCafeCover
);

/**
 * GET /api/cafes/management/:id/bookings
 * Get bookings for a specific cafe (owner only, admin)
 */
router.get('/:id/bookings', authenticate, authorize('cafe_owner', 'admin'), getCafeBookings);

export default router;
