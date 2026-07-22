import { Request, Response } from 'express';
import { db } from '../config/database';
import { Cafe, CreateCafeRequest, UpdateCafeRequest } from '../models/types';

/**
 * POST /api/cafes/management
 * 
 * Creates a new cafe. Only cafe owners and admins can create cafes.
 * Cafe owners are automatically assigned as the owner of their created cafes.
 */
export async function createCafe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    
    if (!userId || !userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (userRole !== 'cafe_owner' && userRole !== 'admin') {
      res.status(403).json({ error: 'Only cafe owners and admins can create cafes' });
      return;
    }

    const {
      name,
      area,
      latitude,
      longitude,
      hourly_rate,
      total_slots,
      has_generator,
      wifi_speed_mbps,
    } = req.body as CreateCafeRequest;

    // ── Input validation ─────────────────────────────
    if (!name || !area || !latitude || !longitude || !hourly_rate || !total_slots) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Required: name, area, latitude, longitude, hourly_rate, total_slots',
      });
      return;
    }

    if (hourly_rate <= 0) {
      res.status(400).json({ error: 'Hourly rate must be positive' });
      return;
    }

    if (total_slots <= 0) {
      res.status(400).json({ error: 'Total slots must be positive' });
      return;
    }

    // ── Create cafe with owner assignment ─────────────
    const ownerId = userRole === 'cafe_owner' ? userId : null;
    
    const cafe = await db.one<Cafe>(
      `INSERT INTO cafes (owner_id, name, area, latitude, longitude, hourly_rate, total_slots, has_generator, wifi_speed_mbps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ownerId, name, area, latitude, longitude, hourly_rate, total_slots, has_generator || false, wifi_speed_mbps || 50]
    );

    res.status(201).json({ cafe });
  } catch (error) {
    console.error('Error creating cafe:', error);
    res.status(500).json({ error: 'Failed to create cafe' });
  }
}

/**
 * PUT /api/cafes/management/:id
 * 
 * Updates an existing cafe. Only the cafe owner or admin can update.
 */
export async function updateCafe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { id } = req.params;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // ── Fetch existing cafe to check ownership ─────────
    const existingCafe = await db.oneOrNone<Cafe>(
      'SELECT * FROM cafes WHERE id = $1',
      [id]
    );

    if (!existingCafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }

    // ── Check permissions ─────────────────────────────
    if (userRole !== 'admin' && existingCafe.owner_id !== userId) {
      res.status(403).json({ error: 'You can only update your own cafes' });
      return;
    }

    // ── Build update query dynamically ─────────────────
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const body = req.body as UpdateCafeRequest;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.area !== undefined) {
      updates.push(`area = $${paramIndex++}`);
      values.push(body.area);
    }
    if (body.latitude !== undefined) {
      updates.push(`latitude = $${paramIndex++}`);
      values.push(body.latitude);
    }
    if (body.longitude !== undefined) {
      updates.push(`longitude = $${paramIndex++}`);
      values.push(body.longitude);
    }
    if (body.hourly_rate !== undefined) {
      if (body.hourly_rate <= 0) {
        res.status(400).json({ error: 'Hourly rate must be positive' });
        return;
      }
      updates.push(`hourly_rate = $${paramIndex++}`);
      values.push(body.hourly_rate);
    }
    if (body.total_slots !== undefined) {
      if (body.total_slots <= 0) {
        res.status(400).json({ error: 'Total slots must be positive' });
        return;
      }
      updates.push(`total_slots = $${paramIndex++}`);
      values.push(body.total_slots);
    }
    if (body.has_generator !== undefined) {
      updates.push(`has_generator = $${paramIndex++}`);
      values.push(body.has_generator);
    }
    if (body.wifi_speed_mbps !== undefined) {
      updates.push(`wifi_speed_mbps = $${paramIndex++}`);
      values.push(body.wifi_speed_mbps);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id); // Add id for WHERE clause

    const cafe = await db.one<Cafe>(
      `UPDATE cafes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({ cafe });
  } catch (error) {
    console.error('Error updating cafe:', error);
    res.status(500).json({ error: 'Failed to update cafe' });
  }
}

/**
 * DELETE /api/cafes/management/:id
 * 
 * Deletes a cafe. Only the cafe owner or admin can delete.
 */
export async function deleteCafe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { id } = req.params;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // ── Fetch existing cafe to check ownership ─────────
    const existingCafe = await db.oneOrNone<Cafe>(
      'SELECT * FROM cafes WHERE id = $1',
      [id]
    );

    if (!existingCafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }

    // ── Check permissions ─────────────────────────────
    if (userRole !== 'admin' && existingCafe.owner_id !== userId) {
      res.status(403).json({ error: 'You can only delete your own cafes' });
      return;
    }

    // ── Delete cafe (bookings will be cascade deleted) ─
    await db.none('DELETE FROM cafes WHERE id = $1', [id]);

    res.json({ message: 'Cafe deleted successfully' });
  } catch (error) {
    console.error('Error deleting cafe:', error);
    res.status(500).json({ error: 'Failed to delete cafe' });
  }
}

/**
 * GET /api/cafes/management/my-cafes
 * 
 * Returns all cafes owned by the authenticated cafe owner.
 * Admins can see all cafes.
 */
export async function getMyCafes(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let cafes: Cafe[];

    if (userRole === 'admin') {
      // Admins see all cafes
      cafes = await db.any<Cafe>('SELECT * FROM cafes ORDER BY created_at DESC');
    } else {
      // Cafe owners see only their cafes
      cafes = await db.any<Cafe>(
        'SELECT * FROM cafes WHERE owner_id = $1 ORDER BY created_at DESC',
        [userId]
      );
    }

    res.json({ cafes });
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Failed to fetch cafes' });
  }
}

/**
 * GET /api/cafes/management/:id/bookings
 * 
 * Returns all bookings for a specific cafe.
 * Only the cafe owner or admin can view.
 */
export async function getCafeBookings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const { id } = req.params;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // ── Fetch cafe to check ownership ─────────────────
    const cafe = await db.oneOrNone<Cafe>(
      'SELECT * FROM cafes WHERE id = $1',
      [id]
    );

    if (!cafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }

    // ── Check permissions ─────────────────────────────
    if (userRole !== 'admin' && cafe.owner_id !== userId) {
      res.status(403).json({ error: 'You can only view bookings for your own cafes' });
      return;
    }

    // ── Fetch bookings with user info ─────────────────
    const bookings = await db.any(
      `SELECT b.*, u.name as user_name, u.email as user_email
       FROM bookings b
       JOIN users u ON u.id::text = b.user_id
       WHERE b.cafe_id = $1
       ORDER BY b.date DESC, b.start_time DESC`,
      [id]
    );

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching cafe bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}
