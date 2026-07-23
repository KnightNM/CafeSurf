import { Router } from 'express';
import { getCafe, getCafes, getCafeAvailability } from '../controllers/cafeController';

const router = Router();

// GET /api/cafes?area=Colombo&has_generator=true&min_wifi_speed=100
router.get('/', getCafes);

// GET /api/cafes/:id/availability?date=2026-05-30
router.get('/:id/availability', getCafeAvailability);

router.get('/:id', getCafe);

export default router;
