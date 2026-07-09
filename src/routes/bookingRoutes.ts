import { Router } from 'express';
import {
  createBooking,
  checkinBooking,
  getBookingsByUser,
  cancelBooking,
} from '../controllers/bookingController';

const router = Router();

// GET /api/bookings?user_id=xxx
router.get('/', getBookingsByUser);

// POST /api/bookings
router.post('/', createBooking);

// POST /api/bookings/:id/checkin
router.post('/:id/checkin', checkinBooking);

// DELETE /api/bookings/:id?user_id=xxx
router.delete('/:id', cancelBooking);

export default router;
