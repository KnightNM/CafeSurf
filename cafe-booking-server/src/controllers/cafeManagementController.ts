import crypto from 'crypto';
import { Request, Response } from 'express';
import { db } from '../config/database';
import {
  CAFE_COVERS_BUCKET,
  CAFE_REVISION_COVERS_BUCKET,
  getSupabaseAdmin,
} from '../config/supabase';
import { Cafe, CreateCafeRequest, UpdateCafeRequest } from '../models/types';
import { serializeCafe } from './cafeController';
import {
  getGooglePlaceDetails,
  validatePlaceId,
} from '../services/googlePlaces';
import { cafeToProfile, normalizeCafeProfile } from '../services/cafeProfile';

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface CoverUploadRequest {
  file_name?: unknown;
  content_type?: unknown;
  size_bytes?: unknown;
}

export function validateCoverUploadRequest(body: CoverUploadRequest): {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  extension: string;
} {
  const fileName = typeof body.file_name === 'string' ? body.file_name.trim() : '';
  const contentType = typeof body.content_type === 'string' ? body.content_type : '';
  const sizeBytes = Number(body.size_bytes);
  const extension = COVER_EXTENSIONS[contentType];

  if (!fileName) throw { statusCode: 400, message: 'File name is required' };
  if (!extension) {
    throw { statusCode: 400, message: 'Cover image must be JPEG, PNG, or WebP' };
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_COVER_BYTES) {
    throw { statusCode: 400, message: 'Cover image must be no larger than 5 MB' };
  }

  return { fileName, contentType, sizeBytes, extension };
}

export function hasExactCafeDeletionConfirmation(
  confirmation: unknown,
  cafeName: string
): boolean {
  return typeof confirmation === 'string' && confirmation === cafeName;
}

async function requireManagedCafe(
  id: string,
  userId: string,
  userRole: string
): Promise<Cafe> {
  const cafe = await db.oneOrNone<Cafe>('SELECT * FROM cafes WHERE id = $1', [id]);
  if (!cafe) throw { statusCode: 404, message: 'Cafe not found' };
  if (userRole !== 'admin' && cafe.owner_id !== userId) {
    throw { statusCode: 403, message: 'You can only manage your own cafes' };
  }
  return cafe;
}

function sendManagedCafeError(res: Response, error: unknown, fallback: string): void {
  const typed = error as { statusCode?: number; message?: string; code?: string };
  if (typed.code === '23505') {
    res.status(409).json({ error: 'This Google Maps location is already linked to a CafeSurf workspace' });
    return;
  }
  if (typed.statusCode && typed.message) {
    res.status(typed.statusCode).json({ error: typed.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
}

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

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can publish cafés directly' });
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
      google_place_id,
      google_session_token,
    } = req.body as CreateCafeRequest;

    const googlePlace = google_place_id
      ? await getGooglePlaceDetails(
        validatePlaceId(google_place_id),
        google_session_token
      )
      : null;
    const resolvedName = name || googlePlace?.display_name;
    const resolvedArea = googlePlace?.formatted_address ?? area;
    const resolvedLatitude = googlePlace?.latitude ?? latitude;
    const resolvedLongitude = googlePlace?.longitude ?? longitude;

    const profile = normalizeCafeProfile({
      ...req.body,
      name: resolvedName,
      area: resolvedArea,
      latitude: resolvedLatitude,
      longitude: resolvedLongitude,
      google_place_id: googlePlace?.place_id ?? null,
      contact_phone: req.body.contact_phone ?? googlePlace?.phone,
      website_url: req.body.website_url ?? googlePlace?.website,
    }, true);

    // ── Create cafe with owner assignment ─────────────
    const ownerId = req.body.owner_id || null;
    
    const cafe = await db.one<Cafe>(
      `INSERT INTO cafes
        (owner_id, name, area, latitude, longitude, hourly_rate, total_slots,
         has_generator, wifi_speed_mbps, google_place_id, description, contact_phone,
         contact_email, website_url, amenities, opening_hours, house_rules,
         access_instructions, publication_status, version, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, 'published', 1, NOW())
       RETURNING *`,
      [
        ownerId,
        profile.name, profile.area, profile.latitude, profile.longitude,
        profile.hourly_rate, profile.total_slots, profile.has_generator,
        profile.wifi_speed_mbps, profile.google_place_id, profile.description,
        profile.contact_phone, profile.contact_email, profile.website_url,
        profile.amenities, profile.opening_hours, profile.house_rules,
        profile.access_instructions,
      ]
    );
    await db.none(
      `INSERT INTO cafe_revisions
        (cafe_id, owner_id, action, proposed_data, base_version, status,
         reviewed_by, review_note, submitted_at, reviewed_at)
       VALUES ($1, $2, 'create', $3, NULL, 'approved', $4,
         'Published directly by admin', NOW(), NOW())`,
      [cafe.id, cafe.owner_id || userId, profile, userId]
    );

    res.status(201).json({ cafe: serializeCafe(cafe) });
  } catch (error) {
    sendManagedCafeError(res, error, 'Failed to create cafe');
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

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can publish café edits directly' });
      return;
    }

    const body = req.body as UpdateCafeRequest;
    if (body.google_place_id) {
      const googlePlace = await getGooglePlaceDetails(
        validatePlaceId(body.google_place_id),
        body.google_session_token
      );
      body.name = body.name || googlePlace.display_name;
      body.area = googlePlace.formatted_address;
      body.latitude = googlePlace.latitude;
      body.longitude = googlePlace.longitude;
      body.google_place_id = googlePlace.place_id;
    }

    const profile = normalizeCafeProfile({ ...cafeToProfile(existingCafe), ...body }, false);
    const cafe = await db.one<Cafe>(
      `UPDATE cafes SET name=$1, area=$2, latitude=$3, longitude=$4,
        hourly_rate=$5, total_slots=$6, has_generator=$7, wifi_speed_mbps=$8,
        google_place_id=$9, description=$10, contact_phone=$11, contact_email=$12,
        website_url=$13, amenities=$14, opening_hours=$15, house_rules=$16,
        access_instructions=$17, publication_status='published', archived_at=NULL,
        version=version+1, published_at=NOW(), updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [
        profile.name, profile.area, profile.latitude, profile.longitude,
        profile.hourly_rate, profile.total_slots, profile.has_generator,
        profile.wifi_speed_mbps, profile.google_place_id, profile.description,
        profile.contact_phone, profile.contact_email, profile.website_url,
        profile.amenities, profile.opening_hours, profile.house_rules,
        profile.access_instructions, id,
      ]
    );
    await db.none(
      `INSERT INTO cafe_revisions
        (cafe_id, owner_id, action, proposed_data, base_version, status,
         reviewed_by, review_note, submitted_at, reviewed_at)
       VALUES ($1, $2, 'update', $3, $4, 'approved', $5,
         'Published directly by admin', NOW(), NOW())`,
      [id, existingCafe.owner_id || userId, profile, existingCafe.version, userId]
    );

    res.json({ cafe: serializeCafe(cafe) });
  } catch (error) {
    sendManagedCafeError(res, error, 'Failed to update cafe');
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

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Only admins can archive cafés directly' });
      return;
    }

    await db.tx(async (t) => {
      await t.none(
        `UPDATE cafes SET publication_status='archived', archived_at=NOW(),
          version=version+1, updated_at=NOW() WHERE id=$1`,
        [id]
      );
      await t.none(
        `UPDATE bookings SET status='cancelled',
          cancellation_reason='Café archived by administrator'
         WHERE cafe_id=$1 AND status IN ('pending','confirmed')
           AND (
             date > (NOW() AT TIME ZONE 'Asia/Colombo')::date
             OR (
               date = (NOW() AT TIME ZONE 'Asia/Colombo')::date
               AND end_time > EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Colombo')
             )
           )`,
        [id]
      );
      await t.none(
        `INSERT INTO cafe_revisions
          (cafe_id, owner_id, action, proposed_data, base_version, status,
           reviewed_by, review_note, submitted_at, reviewed_at)
         VALUES ($1,$2,'archive',$3,$4,'approved',$5,
           'Archived directly by admin',NOW(),NOW())`,
        [id, existingCafe.owner_id || userId, cafeToProfile(existingCafe), existingCafe.version, userId]
      );
    });
    res.json({ message: 'Café archived; future active bookings were cancelled and history was preserved' });
  } catch (error) {
    console.error('Error deleting cafe:', error);
    res.status(500).json({ error: 'Failed to delete cafe' });
  }
}

/**
 * DELETE /api/cafes/management/:id/permanent
 *
 * Admin veto: permanently removes the café and every associated booking and
 * revision. Database cascades are intentional and irreversible.
 */
export async function permanentlyDeleteCafe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || req.userRole !== 'admin') {
      res.status(req.userId ? 403 : 401).json({
        error: req.userId ? 'Only admins can permanently delete cafés' : 'Not authenticated',
      });
      return;
    }

    const cafe = await db.oneOrNone<Cafe>('SELECT * FROM cafes WHERE id = $1', [req.params.id]);
    if (!cafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }

    if (!hasExactCafeDeletionConfirmation(req.body?.confirmation, cafe.name)) {
      res.status(400).json({
        error: 'Permanent deletion confirmation did not match the café name exactly',
      });
      return;
    }

    const revisionCovers = await db.any<{ proposed_cover_image_path: string }>(
      `SELECT proposed_cover_image_path
       FROM cafe_revisions
       WHERE cafe_id = $1 AND proposed_cover_image_path IS NOT NULL`,
      [cafe.id]
    );

    const deleted = await db.tx(async (t) => {
      const counts = await t.one<{ bookings: number; revisions: number }>(
        `SELECT
          (SELECT COUNT(*)::int FROM bookings WHERE cafe_id = $1) AS bookings,
          (SELECT COUNT(*)::int FROM cafe_revisions WHERE cafe_id = $1) AS revisions`,
        [cafe.id]
      );
      await t.none('DELETE FROM cafes WHERE id = $1', [cafe.id]);
      return counts;
    });

    const admin = getSupabaseAdmin();
    const storageWarnings: string[] = [];
    const publicPaths = new Set<string>();
    if (cafe.cover_image_path) publicPaths.add(cafe.cover_image_path);
    const { data: publicObjects, error: publicListError } = await admin.storage
      .from(CAFE_COVERS_BUCKET)
      .list(cafe.id, { limit: 1000 });
    if (publicListError) {
      storageWarnings.push('Could not list every public cover object');
    } else {
      publicObjects.forEach((object) => publicPaths.add(`${cafe.id}/${object.name}`));
    }
    if (publicPaths.size) {
      const { error } = await admin.storage.from(CAFE_COVERS_BUCKET).remove([...publicPaths]);
      if (error) storageWarnings.push('Could not remove every public cover object');
    }

    const privatePaths = [...new Set(revisionCovers.map((row) => row.proposed_cover_image_path))];
    if (privatePaths.length) {
      const { error } = await admin.storage.from(CAFE_REVISION_COVERS_BUCKET).remove(privatePaths);
      if (error) storageWarnings.push('Could not remove every private revision cover object');
    }

    if (storageWarnings.length) {
      console.warn(`Permanent café deletion ${cafe.id} completed with storage warnings:`, storageWarnings);
    }

    res.json({
      message: 'Café permanently deleted',
      deleted: { cafe: 1, bookings: deleted.bookings, revisions: deleted.revisions },
      storage_cleanup_complete: storageWarnings.length === 0,
      storage_warnings: storageWarnings,
    });
  } catch (error) {
    console.error('Error permanently deleting cafe:', error);
    res.status(500).json({ error: 'Failed to permanently delete cafe' });
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

    res.json({ cafes: cafes.map(serializeCafe) });
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Failed to fetch cafes' });
  }
}

export async function createCafeCoverUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    if (!id) throw { statusCode: 400, message: 'Cafe ID is required' };
    await requireManagedCafe(id, req.userId, req.userRole);
    const upload = validateCoverUploadRequest(req.body as CoverUploadRequest);
    const path = `${id}/${crypto.randomUUID()}.${upload.extension}`;
    const { data, error } = await getSupabaseAdmin()
      .storage
      .from(CAFE_COVERS_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;

    res.status(201).json({ path, token: data.token });
  } catch (error) {
    sendManagedCafeError(res, error, 'Failed to prepare cafe cover upload');
  }
}

export async function attachCafeCover(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    if (!id) throw { statusCode: 400, message: 'Cafe ID is required' };
    const cafe = await requireManagedCafe(id, req.userId, req.userRole);
    const path = typeof req.body.path === 'string' ? req.body.path.trim() : '';
    const prefix = `${id}/`;
    if (!path.startsWith(prefix) || path.includes('..')) {
      throw { statusCode: 400, message: 'Invalid cafe cover path' };
    }

    const fileName = path.slice(prefix.length);
    const storage = getSupabaseAdmin().storage.from(CAFE_COVERS_BUCKET);
    const { data: objects, error: listError } = await storage.list(id, {
      search: fileName,
      limit: 20,
    });
    if (listError) throw listError;
    if (!objects.some((object) => object.name === fileName)) {
      throw { statusCode: 400, message: 'Uploaded cafe cover was not found' };
    }

    const updated = await db.one<Cafe>(
      `UPDATE cafes SET cover_image_path = $1, version = version + 1,
       published_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *`,
      [path, id]
    );
    await db.none(
      `INSERT INTO cafe_revisions
        (cafe_id, owner_id, action, proposed_data, base_version, status,
         reviewed_by, review_note, submitted_at, reviewed_at)
       VALUES ($1,$2,'update',$3,$4,'approved',$5,
         'Public cover changed directly by admin',NOW(),NOW())`,
      [id, cafe.owner_id || req.userId, cafeToProfile(updated), cafe.version, req.userId]
    );

    if (cafe.cover_image_path && cafe.cover_image_path !== path) {
      const { error: removeError } = await storage.remove([cafe.cover_image_path]);
      if (removeError) console.warn('Could not remove replaced cafe cover:', removeError);
    }

    res.json({ cafe: serializeCafe(updated) });
  } catch (error) {
    sendManagedCafeError(res, error, 'Failed to attach cafe cover');
  }
}

export async function deleteCafeCover(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { id } = req.params;
    if (!id) throw { statusCode: 400, message: 'Cafe ID is required' };
    const cafe = await requireManagedCafe(id, req.userId, req.userRole);
    const updated = await db.one<Cafe>(
      `UPDATE cafes SET cover_image_path = NULL, version = version + 1,
       published_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    await db.none(
      `INSERT INTO cafe_revisions
        (cafe_id, owner_id, action, proposed_data, base_version, status,
         reviewed_by, review_note, submitted_at, reviewed_at)
       VALUES ($1,$2,'update',$3,$4,'approved',$5,
         'Public cover removed directly by admin',NOW(),NOW())`,
      [id, cafe.owner_id || req.userId, cafeToProfile(updated), cafe.version, req.userId]
    );

    if (cafe.cover_image_path) {
      const { error: removeError } = await getSupabaseAdmin()
        .storage
        .from(CAFE_COVERS_BUCKET)
        .remove([cafe.cover_image_path]);
      if (removeError) console.warn('Could not remove cafe cover:', removeError);
    }

    res.json({ cafe: serializeCafe(updated) });
  } catch (error) {
    sendManagedCafeError(res, error, 'Failed to remove cafe cover');
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
       JOIN public.users u ON u.id = b.user_id
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
