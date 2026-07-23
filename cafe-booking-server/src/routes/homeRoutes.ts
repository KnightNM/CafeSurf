import { Router } from 'express';
import { getHomeSummary } from '../controllers/homeController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();
router.get('/summary', optionalAuthenticate, getHomeSummary);
export default router;
