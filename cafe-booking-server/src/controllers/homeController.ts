import { Request, Response } from 'express';
import { db } from '../config/database';

interface PublicWorkspaceSummary {
  kind: 'public';
  empty: boolean;
  cafe_id?: string;
  cafe_name?: string;
  date?: string;
  next_hour?: number;
  available_seats?: number;
  wifi_speed_mbps?: number;
  hourly_rate?: number;
}

async function getPublicSummary(): Promise<PublicWorkspaceSummary> {
  const row = await db.oneOrNone<{
    cafe_id: string;
    cafe_name: string;
    date: string;
    next_hour: number;
    available_seats: number;
    wifi_speed_mbps: number;
    hourly_rate: number;
  }>(
    `WITH candidate_hours AS (
       SELECT c.id AS cafe_id, c.name AS cafe_name, c.wifi_speed_mbps, c.hourly_rate,
         d::date AS date, h AS hour, c.total_slots,
         CASE EXTRACT(ISODOW FROM d)::int
           WHEN 1 THEN c.opening_hours->'monday'
           WHEN 2 THEN c.opening_hours->'tuesday'
           WHEN 3 THEN c.opening_hours->'wednesday'
           WHEN 4 THEN c.opening_hours->'thursday'
           WHEN 5 THEN c.opening_hours->'friday'
           WHEN 6 THEN c.opening_hours->'saturday'
           ELSE c.opening_hours->'sunday'
         END AS schedule
       FROM cafes c
       CROSS JOIN generate_series(
         (NOW() AT TIME ZONE 'Asia/Colombo')::date,
         (NOW() AT TIME ZONE 'Asia/Colombo')::date + 6,
         INTERVAL '1 day'
       ) d
       CROSS JOIN generate_series(0, 23) h
       WHERE c.publication_status = 'published'
     ),
     availability AS (
       SELECT ch.*,
         ch.total_slots - COALESCE(SUM(b.team_size), 0)::int AS available_seats
       FROM candidate_hours ch
       LEFT JOIN bookings b ON b.cafe_id = ch.cafe_id AND b.date = ch.date
         AND b.status IN ('pending','confirmed','checked_in')
         AND ch.hour >= b.start_time AND ch.hour < b.end_time
       WHERE COALESCE((ch.schedule->>'closed')::boolean, true) = false
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(ch.schedule->'periods', '[]'::jsonb)) AS period
           WHERE ch.hour * 60 >= (period->>'open_minute')::int
             AND (ch.hour + 1) * 60 <= (period->>'close_minute')::int
         )
         AND (
           ch.date > (NOW() AT TIME ZONE 'Asia/Colombo')::date
           OR ch.hour > EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Colombo')::int
         )
       GROUP BY ch.cafe_id, ch.cafe_name, ch.date, ch.hour, ch.total_slots,
         ch.wifi_speed_mbps, ch.hourly_rate, ch.schedule
     )
     SELECT cafe_id, cafe_name, date::text, hour AS next_hour, available_seats,
       wifi_speed_mbps, hourly_rate
     FROM availability
     WHERE available_seats > 0
     ORDER BY date, hour, cafe_name
     LIMIT 1`
  );
  return row ? { kind: 'public', empty: false, ...row } : { kind: 'public', empty: true };
}

export async function getHomeSummary(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) {
      res.json({ summary: await getPublicSummary() });
      return;
    }

    if (req.userRole === 'customer') {
      const booking = await db.oneOrNone(
        `SELECT b.id AS booking_id, b.date::text, b.start_time, b.end_time,
           b.team_size, b.status, c.id AS cafe_id, c.name AS cafe_name
         FROM bookings b
         JOIN cafes c ON c.id = b.cafe_id
         WHERE b.user_id = $1 AND b.status IN ('pending','confirmed','checked_in')
           AND (
             b.date > (NOW() AT TIME ZONE 'Asia/Colombo')::date
             OR (
               b.date = (NOW() AT TIME ZONE 'Asia/Colombo')::date
               AND b.end_time > EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Colombo')
             )
           )
         ORDER BY b.date, b.start_time LIMIT 1`,
        [req.userId]
      );
      res.json({
        summary: booking
          ? { kind: 'customer', empty: false, booking }
          : { kind: 'customer', empty: true, fallback: await getPublicSummary() },
      });
      return;
    }

    if (req.userRole === 'cafe_owner') {
      const metrics = await db.one<{
        published_cafes: number;
        pending_bookings: number;
      }>(
        `SELECT
          (SELECT COUNT(*)::int FROM cafes WHERE owner_id=$1 AND publication_status='published') AS published_cafes,
          (SELECT COUNT(*)::int FROM bookings b JOIN cafes c ON c.id=b.cafe_id
             WHERE c.owner_id=$1 AND b.status='pending') AS pending_bookings`,
        [req.userId]
      );
      const nextRequest = await db.oneOrNone(
        `SELECT b.id AS booking_id, b.date::text, b.start_time, b.end_time, b.team_size,
           c.id AS cafe_id, c.name AS cafe_name
         FROM bookings b JOIN cafes c ON c.id=b.cafe_id
         WHERE c.owner_id=$1 AND b.status='pending'
         ORDER BY b.date, b.start_time LIMIT 1`,
        [req.userId]
      );
      res.json({
        summary: {
          kind: 'owner',
          empty: metrics.published_cafes === 0 && metrics.pending_bookings === 0,
          ...metrics,
          next_request: nextRequest,
        },
      });
      return;
    }

    const metrics = await db.one(
      `SELECT
        (SELECT COUNT(*)::int FROM cafes WHERE publication_status='published') AS published_cafes,
        (SELECT COUNT(*)::int FROM cafe_revisions WHERE status='pending') AS pending_cafe_revisions,
        (SELECT COUNT(*)::int FROM owner_applications WHERE status='pending') AS pending_owner_applications,
        (SELECT COUNT(*)::int FROM bookings
          WHERE date=(NOW() AT TIME ZONE 'Asia/Colombo')::date) AS bookings_today`
    );
    res.json({
      summary: {
        kind: 'admin',
        empty: Object.values(metrics).every((value) => Number(value) === 0),
        ...metrics,
      },
    });
  } catch (error) {
    console.error('Error fetching home summary:', error);
    res.status(500).json({ error: 'Failed to fetch home summary' });
  }
}
