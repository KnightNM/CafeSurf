import { Router } from 'express';
import {
  autocompletePlaces,
  cafePlaceDetails,
} from '../controllers/googlePlacesController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/autocomplete', authorize('cafe_owner', 'admin'), autocompletePlaces);
router.get('/cafes/:cafeId', authorize('customer', 'cafe_owner', 'admin'), cafePlaceDetails);

export default router;
