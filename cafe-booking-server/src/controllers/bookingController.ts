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
 * Body: { cafe_id, date, start_time, end_time, team_size? }
 */
export function normalizeTeamSize(value: unknown): number | null {
  const normalized = value === undefined ? 1 : value;
  return Number.isInteger(normalized) && Number(normalized) >= 1
    ? Number(normalized)
    : null;
}

export function calculateBookingTotal(
  hourlyRate: number,
  startTime: number,
  endTime: number,
  teamSize: number
): number {
  return (endTime - startTime) * hourlyRate * teamSize;
}

export function hasSeatCapacity(bookedSeats: number, requestedSeats: number, totalSeats: number): boolean {
  return bookedSeats + requestedSeats <= totalSeats;
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const { cafe_id, date, start_time, end_time } = req.body as CreateBookingRequest;
    const teamSize = normalizeTeamSize(req.body.team_size);

    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (requesterRole === 'cafe_owner') {
      res.status(403).json({ error: 'Cafe owners cannot create customer bookings' });
      return;
    }

    // ── Input validation ─────────────────────────────
    if (!cafe_id || !date || start_time === undefined || end_time === undefined) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Required: cafe_id, date, start_time, end_time',
      });
      return;
    }

    if (teamSize === null) {
      res.status(400).json({ error: 'Team size must be a positive whole number' });
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

      if (teamSize > cafe.total_slots) {
        throw {
          statusCode: 400,
          message: `Team size cannot exceed this workspace's ${cafe.total_slots}-seat capacity`,
        };
      }

      // 2. Check availability for every requested hour
      const rows = await t.any<{ hour: number; booked_seats: number }>(
        `SELECT
           s.hour,
           COALESCE(SUM(b.team_size), 0)::int AS booked_seats
         FROM generate_series($1::int, $2::int - 1) AS s(hour)
         LEFT JOIN bookings b
           ON  b.cafe_id = $3
           AND b.date    = $4
           AND b.status IN ('pending', 'confirmed', 'checked_in')
           AND s.hour   >= b.start_time
           AND s.hour   <  b.end_time
         GROUP BY s.hour
         ORDER BY s.hour`,
        [start_time, end_time, cafe_id, date]
      );

      const overbooked = rows.filter(
        (r) => !hasSeatCapacity(Number(r.booked_seats), teamSize, cafe.total_slots)
      );

      if (overbooked.length > 0) {
        const hours = overbooked.map((r) => `${r.hour}:00`).join(', ');
        throw {
          statusCode: 409,
          message: `Not enough seats for your team during: ${hours}`,
        };
      }

      // 3. Calculate price and insert
      const total_price = calculateBookingTotal(
        cafe.hourly_rate,
        start_time,
        end_time,
        teamSize
      );

      const created = await t.one<Booking>(
        `INSERT INTO bookings
          (user_id, cafe_id, date, start_time, end_time, total_price, team_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [requesterId, cafe_id, date, start_time, end_time, total_price, teamSize]
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
 * from 'confirmed' → 'checked_in'.
 */
export async function checkinBooking(req: Request, res: Response): Promise<void> {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const { id } = req.params;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Not authenticated' });
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

    if (requesterRole !== 'admin' && booking.user_id !== requesterId) {
      res.status(403).json({ error: 'You can only check in to your own bookings' });
      return;
    }

    if (booking.status === 'pending') {
      res.status(400).json({ error: 'Booking must be confirmed by the cafe before check-in' });
      return;
    }

    if (booking.status === 'checked_in') {
      res.status(400).json({ error: 'Booking is already checked in' });
      return;
    }

    if (booking.status !== 'confirmed') {
      res.status(400).json({ error: `Cannot check in a booking with status '${booking.status}'` });
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
 * GET /api/bookings
 *
 * Returns bookings for the authenticated user, enriched with cafe name and area.
 * Ordered by date descending, then start_time descending.
 */
export async function getBookingsByUser(req: Request, res: Response): Promise<void> {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (requesterRole === 'cafe_owner') {
      res.status(403).json({ error: 'Cafe owners cannot access customer booking dashboards' });
      return;
    }

    const bookings = await db.any<BookingWithCafe>(
      `SELECT b.*, c.name AS cafe_name, c.area AS cafe_area
       FROM bookings b
       JOIN cafes c ON c.id = b.cafe_id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, b.start_time DESC`,
      [requesterId]
    );

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}

/**
 * DELETE /api/bookings/:id
 *
 * Cancels a booking by setting its status to 'cancelled'.
 * Only pending or confirmed bookings can be cancelled.
 * Verifies ownership using the authenticated identity.
 */
export async function cancelBooking(req: Request, res: Response): Promise<void> {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const { id } = req.params;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (requesterRole === 'cafe_owner') {
      res.status(403).json({ error: 'Cafe owners cannot cancel customer bookings from this dashboard' });
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

    if (requesterRole !== 'admin' && booking.user_id !== requesterId) {
      res.status(403).json({ error: 'You can only cancel your own bookings' });
      return;
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      res.status(400).json({
        error: `Cannot cancel a booking with status '${booking.status}'`,
        details: 'Only pending or confirmed bookings can be cancelled.',
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

/**
 * PATCH /api/bookings/:id/status
 *
 * Cafe owners can confirm or reject bookings for their own cafes.
 * Admins can update any booking. Customers cannot use this endpoint.
 */
export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  try {
    const requesterId = req.userId;
    const requesterRole = req.userRole;
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!requesterId || !requesterRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (requesterRole !== 'admin' && requesterRole !== 'cafe_owner') {
      res.status(403).json({ error: 'Only cafe owners and admins can update booking status' });
      return;
    }

    if (status !== 'confirmed' && status !== 'rejected') {
      res.status(400).json({ error: 'Status must be either confirmed or rejected' });
      return;
    }

    const booking = await db.oneOrNone<Booking & { owner_id: string | null }>(
      `SELECT b.*, c.owner_id
       FROM bookings b
       JOIN cafes c ON c.id = b.cafe_id
       WHERE b.id = $1`,
      [id]
    );

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (requesterRole !== 'admin' && booking.owner_id !== requesterId) {
      res.status(403).json({ error: 'You can only manage bookings for your own cafes' });
      return;
    }

    if (booking.status !== 'pending') {
      res.status(400).json({
        error: `Cannot update a booking with status '${booking.status}'`,
        details: 'Only pending bookings can be confirmed or rejected.',
      });
      return;
    }

    const updated = await db.one<Booking>(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ booking: updated });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
}
