import { Request, Response } from 'express';
import { db } from '../config/database';
import { Cafe, AvailabilitySlot } from '../models/types';

/**
 * GET /api/cafes
 *
 * Query params:
 *   area           – partial match, case-insensitive (e.g. "Colombo")
 *   has_generator   – "true" or "false"
 *   min_wifi_speed  – minimum wifi_speed_mbps (integer)
 */
export async function getCafes(req: Request, res: Response): Promise<void> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // ── area filter (case-insensitive partial match) ──
    if (req.query.area) {
      conditions.push(`area ILIKE $${paramIndex}`);
      values.push(`%${req.query.area as string}%`);
      paramIndex++;
    }

    // ── generator filter ─────────────────────────────
    if (req.query.has_generator !== undefined) {
      conditions.push(`has_generator = $${paramIndex}`);
      values.push(req.query.has_generator === 'true');
      paramIndex++;
    }

    // ── wifi speed filter ────────────────────────────
    if (req.query.min_wifi_speed) {
      conditions.push(`wifi_speed_mbps >= $${paramIndex}`);
      values.push(parseInt(req.query.min_wifi_speed as string, 10));
      paramIndex++;
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const cafes: Cafe[] = await db.any(
      `SELECT * FROM cafes ${where} ORDER BY area, name`,
      values
    );

    res.json({ cafes });
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Failed to fetch cafes' });
  }
}

/**
 * GET /api/cafes/:id/availability?date=YYYY-MM-DD
 *
 * Returns 24 hourly slots (0–23), each showing how many seats
 * are available vs. total for the given cafe and date.
 */
export async function getCafeAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Query parameter "date" is required (YYYY-MM-DD)' });
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    // ── Fetch cafe to get total_slots ─────────────────
    const cafe = await db.oneOrNone<Cafe>(
      'SELECT * FROM cafes WHERE id = $1',
      [id]
    );

    if (!cafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }

    // ── Count booked slots per hour ───────────────────
    // Uses generate_series to produce hours 0–23 and LEFT JOINs
    // against bookings that overlap each hour.
    const rows = await db.any<{ hour: number; booked_count: string }>(
      `SELECT
         s.hour,
         COUNT(b.id)::int AS booked_count
       FROM generate_series(0, 23) AS s(hour)
       LEFT JOIN bookings b
         ON  b.cafe_id = $1
         AND b.date    = $2
         AND b.status IN ('pending', 'confirmed', 'checked_in')
         AND s.hour   >= b.start_time
         AND s.hour   <  b.end_time
       GROUP BY s.hour
       ORDER BY s.hour`,
      [id, date]
    );

    const slots: AvailabilitySlot[] = rows.map((row) => ({
      hour: Number(row.hour),
      available: cafe.total_slots - Number(row.booked_count),
      total: cafe.total_slots,
    }));

    res.json({ cafe_id: id, date, slots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
}
