import { Router } from 'express';
import {
  createBooking,
  checkinBooking,
  getBookingsByUser,
  cancelBooking,
  updateBookingStatus,
} from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/bookings
router.get('/', authenticate, getBookingsByUser);

// POST /api/bookings
router.post('/', authenticate, authorize('customer', 'admin'), createBooking);

// PATCH /api/bookings/:id/status
router.patch('/:id/status', authenticate, authorize('cafe_owner', 'admin'), updateBookingStatus);

// POST /api/bookings/:id/checkin
router.post('/:id/checkin', authenticate, authorize('customer', 'admin'), checkinBooking);

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, authorize('customer', 'admin'), cancelBooking);

export default router;
