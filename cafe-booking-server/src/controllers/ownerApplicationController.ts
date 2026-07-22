import { Request, Response } from 'express';
import { db } from '../config/database';
import {
  CreateOwnerApplicationRequest,
  OwnerApplication,
  OwnerApplicationStatus,
} from '../models/types';

export function requiredText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw { statusCode: 400, message: `${field} is required` };
  }
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw { statusCode: 400, message: `${field} must be ${min}-${max} characters` };
  }
  return normalized;
}

export function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw { statusCode: 400, message: `${field} must be at most ${max} characters` };
  }
  return value.trim() || null;
}

function sendError(res: Response, error: unknown, fallback: string): void {
  const typed = error as { statusCode?: number; message?: string; code?: string };
  if (typed.code === '23505') {
    res.status(409).json({ error: 'You already have a pending owner application' });
    return;
  }
  if (typed.statusCode && typed.message) {
    res.status(typed.statusCode).json({ error: typed.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
}

export async function createOwnerApplication(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const body = req.body as Partial<CreateOwnerApplicationRequest>;
    const application = await db.one<OwnerApplication>(
      `INSERT INTO owner_applications
        (user_id, business_name, contact_phone, cafe_name, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.userId,
        requiredText(body.business_name, 'Business name', 2, 150),
        requiredText(body.contact_phone, 'Contact phone', 7, 30),
        requiredText(body.cafe_name, 'Cafe name', 2, 150),
        requiredText(body.location, 'Location', 2, 200),
        optionalText(body.notes, 'Notes', 1000),
      ]
    );

    res.status(201).json({ application });
  } catch (error) {
    sendError(res, error, 'Failed to submit owner application');
  }
}

export async function getMyOwnerApplication(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const application = await db.oneOrNone<OwnerApplication>(
      `SELECT * FROM owner_applications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.userId]
    );

    res.json({ application });
  } catch (error) {
    sendError(res, error, 'Failed to fetch owner application');
  }
}

export async function listOwnerApplications(req: Request, res: Response): Promise<void> {
  try {
    const status = (req.query.status || 'pending') as string;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be pending, approved, or rejected' });
      return;
    }

    const applications = await db.any<OwnerApplication>(
      `SELECT oa.*, u.name AS applicant_name, u.email AS applicant_email
       FROM owner_applications oa
       JOIN public.users u ON u.id = oa.user_id
       WHERE oa.status = $1
       ORDER BY oa.created_at ASC`,
      [status]
    );

    res.json({ applications });
  } catch (error) {
    sendError(res, error, 'Failed to list owner applications');
  }
}

export async function decideOwnerApplication(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { decision, review_note } = req.body as {
      decision?: OwnerApplicationStatus;
      review_note?: string;
    };

    if (decision !== 'approved' && decision !== 'rejected') {
      res.status(400).json({ error: 'Decision must be approved or rejected' });
      return;
    }
    const reviewNote = optionalText(review_note, 'Review note', 1000);

    const application = await db.tx(async (transaction) => {
      const current = await transaction.oneOrNone<OwnerApplication>(
        'SELECT * FROM owner_applications WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (!current) throw { statusCode: 404, message: 'Owner application not found' };
      if (current.status !== 'pending') {
        throw { statusCode: 409, message: 'Owner application has already been reviewed' };
      }

      if (decision === 'approved') {
        await transaction.none(
          `UPDATE public.users SET role = 'cafe_owner', updated_at = NOW()
           WHERE id = $1`,
          [current.user_id]
        );
      }

      return transaction.one<OwnerApplication>(
        `UPDATE owner_applications
         SET status = $1, reviewed_by = $2, review_note = $3,
             reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [decision, req.userId, reviewNote, id]
      );
    });

    res.json({ application });
  } catch (error) {
    sendError(res, error, 'Failed to review owner application');
  }
}
