import { Router } from 'express';
import {
  autocompletePlaces,
  cafePlaceDetails,
  importPlaceDetails,
} from '../controllers/googlePlacesController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/autocomplete', authenticate, authorize('cafe_owner', 'admin'), autocompletePlaces);
router.post('/details', authenticate, authorize('cafe_owner', 'admin'), importPlaceDetails);
router.get('/cafes/:cafeId', cafePlaceDetails);

export default router;
