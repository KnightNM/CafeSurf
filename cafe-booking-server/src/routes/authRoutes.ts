import { Router } from 'express';
import { getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, getCurrentUser);

export default router;
