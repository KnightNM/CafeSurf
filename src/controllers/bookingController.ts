import { Request, Response } from 'express';
import { db, pgp } from '../config/database';
import { Booking, BookingWithCafe, Cafe, CreateBookingRequest } from '../models/types';

/**
 * POST /api/bookings
 *
 * Creates a new hourly reservation with strict overbooking prevention.
 * Uses a serializable transaction so concurrent requests cannot
 * both claim the last slot.
 *
 * Body: { user_id, cafe_id, date, start_time, end_time }
 */
export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, cafe_id, date, start_time, end_time } = req.body as CreateBookingRequest;

    // ── Input validation ─────────────────────────────
    if (!user_id || !cafe_id || !date || start_time === undefined || end_time === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Required: user_id, cafe_id, date, start_time, end_time',
      });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    if (
      !Number.isInteger(start_time) || !Number.isInteger(end_time) ||
      start_time < 0 || start_time > 23 ||
      end_time < 1 || end_time > 24 ||
      start_time >= end_time
    ) {
      res.status(400).json({
        error: 'Invalid time range',
        details: 'start_time must be 0–23, end_time must be 1–24, and start_time < end_time',
      });
      return;
    }

    // Reject bookings in the past
    const bookingDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      res.status(400).json({ error: 'Cannot create bookings for past dates' });
      return;
    }

    // ── Serializable transaction ─────────────────────
    const mode = new pgp.txMode.TransactionMode({
      tiLevel: pgp.txMode.isolationLevel.serializable,
    });

    const booking = await db.tx({ mode }, async (t) => {
      // 1. Fetch cafe (and lock implicitly via serializable isolation)
      const cafe = await t.oneOrNone<Cafe>(
        'SELECT * FROM cafes WHERE id = $1',
        [cafe_id]
      );

      if (!cafe) {
        throw { statusCode: 404, message: 'Cafe not found' };
      }

      // 2. Check availability for every requested hour
      const rows = await t.any<{ hour: number; booked_count: number }>(
        `SELECT
           s.hour,
           COUNT(b.id)::int AS booked_count
         FROM generate_series($1::int, $2::int - 1) AS s(hour)
         LEFT JOIN bookings b
           ON  b.cafe_id = $3
           AND b.date    = $4
           AND b.status != 'completed'
           AND s.hour   >= b.start_time
           AND s.hour   <  b.end_time
         GROUP BY s.hour
         ORDER BY s.hour`,
        [start_time, end_time, cafe_id, date]
      );

      const overbooked = rows.filter(
        (r) => Number(r.booked_count) >= cafe.total_slots
      );

      if (overbooked.length > 0) {
        const hours = overbooked.map((r) => `${r.hour}:00`).join(', ');
        throw {
          statusCode: 409,
          message: `Fully booked for the following hours: ${hours}`,
        };
      }

      // 3. Calculate price and insert
      const duration = end_time - start_time;
      const total_price = duration * cafe.hourly_rate;

      const created = await t.one<Booking>(
        `INSERT INTO bookings (user_id, cafe_id, date, start_time, end_time, total_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'reserved')
         RETURNING *`,
        [user_id, cafe_id, date, start_time, end_time, total_price]
      );

      return created;
    });

    res.status(201).json({ booking });
  } catch (error: any) {
    // Handle known application errors
    if (error?.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    // Handle serialization failure (concurrent conflict) — retry is caller's job
    if (error?.code === '40001') {
      res.status(409).json({
        error: 'Booking conflict — please retry',
        details: 'Another booking was processed simultaneously. Try again.',
      });
      return;
    }

    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
}

/**
 * POST /api/bookings/:id/checkin
 *
 * Simulates a QR check-in by transitioning the booking status
 * from 'reserved' → 'checked_in'.
 */
export async function checkinBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const booking = await db.oneOrNone<Booking>(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.status === 'checked_in') {
      res.status(400).json({ error: 'Booking is already checked in' });
      return;
    }

    if (booking.status === 'completed') {
      res.status(400).json({ error: 'Booking is already completed' });
      return;
    }

    const updated = await db.one<Booking>(
      `UPDATE bookings SET status = 'checked_in' WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json({ booking: updated });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
}

/**
 * GET /api/bookings?user_id=xxx
 *
 * Returns all bookings for a given user, enriched with cafe name and area.
 * Ordered by date descending, then start_time descending.
 */
export async function getBookingsByUser(req: Request, res: Response): Promise<void> {
  try {
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      res.status(400).json({ error: 'Missing required query parameter: user_id' });
      return;
    }

    const bookings = await db.any<BookingWithCafe>(
      `SELECT b.*, c.name AS cafe_name, c.area AS cafe_area
       FROM bookings b
       JOIN cafes c ON c.id = b.cafe_id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, b.start_time DESC`,
      [user_id]
    );

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

/**
 * DELETE /api/bookings/:id?user_id=xxx
 *
 * Cancels a booking by setting its status to 'cancelled'.
 * Only 'reserved' bookings can be cancelled.
 * Verifies ownership via user_id query parameter.
 */
export async function cancelBooking(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      res.status(400).json({ error: 'Missing required query parameter: user_id' });
      return;
    }

    const booking = await db.oneOrNone<Booking>(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.user_id !== user_id) {
      res.status(403).json({ error: 'You can only cancel your own bookings' });
      return;
    }

    if (booking.status !== 'reserved') {
      res.status(400).json({
        error: `Cannot cancel a booking with status '${booking.status}'`,
        details: 'Only reserved bookings can be cancelled.',
      });
      return;
    }

    const updated = await db.one<BookingWithCafe>(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1
       RETURNING *,
         (SELECT name FROM cafes WHERE id = cafe_id) AS cafe_name,
         (SELECT area FROM cafes WHERE id = cafe_id) AS cafe_area`,
      [id]
    );

    res.json({ booking: updated });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
}
