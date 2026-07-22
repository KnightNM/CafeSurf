import { Request, Response } from 'express';
import { db } from '../config/database';
import { User } from '../models/types';

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile.
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // This will be populated by auth middleware
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await db.oneOrNone<User>(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
