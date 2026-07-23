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
 * Create and immediately publish a new cafe (admin only)
 */
router.post('/', authenticate, authorize('admin'), createCafe);

/**
 * PUT /api/cafes/management/:id
 * Update a cafe (owner only, admin)
 */
router.put('/:id', authenticate, authorize('admin'), updateCafe);

/**
 * DELETE /api/cafes/management/:id
 * Delete a cafe (owner only, admin)
 */
router.delete('/:id', authenticate, authorize('admin'), deleteCafe);

/**
 * GET /api/cafes/management/my-cafes
 * Get cafes owned by current user (cafe_owner, admin)
 */
router.get('/my-cafes', authenticate, authorize('cafe_owner', 'admin'), getMyCafes);

router.post(
  '/:id/cover-image/upload-url',
  authenticate,
  authorize('admin'),
  createCafeCoverUploadUrl
);

router.put(
  '/:id/cover-image',
  authenticate,
  authorize('admin'),
  attachCafeCover
);

router.delete(
  '/:id/cover-image',
  authenticate,
  authorize('admin'),
  deleteCafeCover
);

/**
 * GET /api/cafes/management/:id/bookings
 * Get bookings for a specific cafe (owner only, admin)
 */
router.get('/:id/bookings', authenticate, authorize('cafe_owner', 'admin'), getCafeBookings);

export default router;
