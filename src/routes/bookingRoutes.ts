import { Router } from 'express';
import { createBooking, checkinBooking } from '../controllers/bookingController';

const router = Router();

// POST /api/bookings
router.post('/', createBooking);

// POST /api/bookings/:id/checkin
router.post('/:id/checkin', checkinBooking);

export default router;
