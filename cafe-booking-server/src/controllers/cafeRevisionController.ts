import crypto from 'crypto';
import { Request, Response } from 'express';
import { db, pgp } from '../config/database';
import {
  CAFE_COVERS_BUCKET,
  CAFE_REVISION_COVERS_BUCKET,
  getSupabaseAdmin,
} from '../config/supabase';
import {
  Cafe,
  CafeRevision,
  CafeRevisionAction,
  CafeRevisionStatus,
  CreateCafeRequest,
} from '../models/types';
import { cafeToProfile, normalizeCafeProfile } from '../services/cafeProfile';
import { getGooglePlaceDetails, validatePlaceId } from '../services/googlePlaces';
import { serializeCafe } from './cafeController';
import { validateCoverUploadRequest } from './cafeManagementController';

type RevisionRow = CafeRevision & { live_cafe?: Cafe | null };

const PROFILE_COLUMNS = [
  'name', 'area', 'latitude', 'longitude', 'hourly_rate', 'total_slots',
  'has_generator', 'wifi_speed_mbps', 'google_place_id', 'description',
  'contact_phone', 'contact_email', 'website_url', 'amenities', 'opening_hours',
  'house_rules', 'access_instructions',
] as const;

function sendRevisionError(res: Response, error: unknown, fallback: string): void {
  const typed = error as { statusCode?: number; message?: string; code?: string };
  if (typed.code === '23505') {
    res.status(409).json({ error: 'An open revision already exists for this café or Google place' });
    return;
  }
  if (typed.statusCode && typed.message) {
    res.status(typed.statusCode).json({ error: typed.message });
    return;
  }
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
}

async function resolveProfile(body: Partial<CreateCafeRequest>, requireGoogle: boolean): Promise<CreateCafeRequest> {
  const input = { ...body };
  if (input.google_place_id) {
    const google = await getGooglePlaceDetails(
      validatePlaceId(input.google_place_id),
      input.google_session_token
    );
    input.name = String(input.name || google.display_name);
    input.area = google.formatted_address;
    input.latitude = google.latitude;
    input.longitude = google.longitude;
    input.google_place_id = google.place_id;
    input.contact_phone ??= google.phone;
    input.website_url ??= google.website;
  }
  return normalizeCafeProfile(input, requireGoogle);
}

async function getAuthorizedRevision(id: string, userId: string, role: string): Promise<RevisionRow> {
  const revision = await db.oneOrNone<RevisionRow>(
    `SELECT r.*, row_to_json(c.*) AS live_cafe
     FROM cafe_revisions r
     LEFT JOIN cafes c ON c.id = r.cafe_id
     WHERE r.id = $1`,
    [id]
  );
  if (!revision) throw { statusCode: 404, message: 'Café revision not found' };
  if (role !== 'admin' && revision.owner_id !== userId) {
    throw { statusCode: 403, message: 'You can only access your own café revisions' };
  }
  return revision;
}

async function withPreview(revision: RevisionRow): Promise<RevisionRow> {
  const result = { ...revision };
  if (revision.live_cafe) result.live_cafe = serializeCafe(revision.live_cafe);
  if (revision.proposed_cover_image_path) {
    const { data, error } = await getSupabaseAdmin().storage
      .from(CAFE_REVISION_COVERS_BUCKET)
      .createSignedUrl(revision.proposed_cover_image_path, 3600);
    result.proposed_cover_preview_url = error ? null : data.signedUrl;
  }
  return result;
}

export async function createCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) throw { statusCode: 401, message: 'Not authenticated' };
    const action = String(req.body.action || 'create') as CafeRevisionAction;
    if (!['create', 'update', 'archive'].includes(action)) {
      throw { statusCode: 400, message: 'Action must be create, update, or archive' };
    }

    let cafe: Cafe | null = null;
    let proposedData: CreateCafeRequest | Record<string, never>;
    if (action === 'create') {
      proposedData = await resolveProfile(req.body.proposed_data || req.body, true);
    } else {
      const cafeId = String(req.body.cafe_id || '');
      cafe = await db.oneOrNone<Cafe>('SELECT * FROM cafes WHERE id = $1', [cafeId]);
      if (!cafe) throw { statusCode: 404, message: 'Café not found' };
      if (cafe.owner_id !== req.userId) throw { statusCode: 403, message: 'You can only revise your own cafés' };
      if (cafe.publication_status === 'archived') throw { statusCode: 409, message: 'Archived cafés are read-only' };
      proposedData = action === 'archive'
        ? cafeToProfile(cafe)
        : await resolveProfile(req.body.proposed_data || cafeToProfile(cafe), false);
    }

    const revision = await db.one<CafeRevision>(
      `INSERT INTO cafe_revisions
        (cafe_id, owner_id, action, proposed_data, base_version)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cafe?.id ?? null, req.userId, action, proposedData, cafe?.version ?? null]
    );
    res.status(201).json({ revision: await withPreview(revision) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to create café revision');
  }
}

export async function listMyCafeRevisions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) throw { statusCode: 401, message: 'Not authenticated' };
    const rows = await db.any<RevisionRow>(
      `SELECT r.*, row_to_json(c.*) AS live_cafe
       FROM cafe_revisions r
       LEFT JOIN cafes c ON c.id = r.cafe_id
       WHERE r.owner_id = $1
       ORDER BY r.updated_at DESC`,
      [req.userId]
    );
    res.json({ revisions: await Promise.all(rows.map(withPreview)) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to fetch café revisions');
  }
}

export async function getCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    res.json({ revision: await withPreview(revision) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to fetch café revision');
  }
}

export async function updateCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    if (!['draft', 'pending', 'rejected'].includes(revision.status)) {
      throw { statusCode: 409, message: `A ${revision.status} revision cannot be edited` };
    }
    if (revision.action === 'archive') {
      throw { statusCode: 400, message: 'Removal requests do not contain an editable profile' };
    }
    const proposedData = await resolveProfile(
      req.body.proposed_data || req.body,
      revision.action === 'create'
    );
    const updated = await db.one<CafeRevision>(
      `UPDATE cafe_revisions
       SET proposed_data = $1, status = 'draft', submitted_at = NULL,
           reviewed_by = NULL, reviewed_at = NULL, review_note = NULL, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [proposedData, revision.id]
    );
    res.json({ revision: await withPreview(updated) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to save café revision');
  }
}

export async function submitCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    if (!['draft', 'rejected'].includes(revision.status)) {
      throw { statusCode: 409, message: 'Only draft or rejected revisions can be submitted' };
    }
    const updated = await db.one<CafeRevision>(
      `UPDATE cafe_revisions
       SET status = 'pending', submitted_at = NOW(), updated_at = NOW(),
           reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
       WHERE id = $1 RETURNING *`,
      [revision.id]
    );
    res.json({ revision: await withPreview(updated) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to submit café revision');
  }
}

async function removePrivateCover(path: string | null): Promise<void> {
  if (!path) return;
  const { error } = await getSupabaseAdmin().storage.from(CAFE_REVISION_COVERS_BUCKET).remove([path]);
  if (error) console.warn('Could not remove temporary revision cover:', error);
}

export async function withdrawCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    if (!['draft', 'pending'].includes(revision.status)) {
      throw { statusCode: 409, message: 'Only draft or pending revisions can be withdrawn' };
    }
    const updated = await db.one<CafeRevision>(
      `UPDATE cafe_revisions
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [revision.id]
    );
    await removePrivateCover(revision.proposed_cover_image_path);
    res.json({ revision: updated });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to withdraw café revision');
  }
}

export async function createRevisionCoverUploadUrl(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    if (!['draft', 'pending', 'rejected'].includes(revision.status)) {
      throw { statusCode: 409, message: 'This revision can no longer accept a cover' };
    }
    const upload = validateCoverUploadRequest(req.body);
    const path = `${revision.owner_id}/${revision.id}/${crypto.randomUUID()}.${upload.extension}`;
    const { data, error } = await getSupabaseAdmin().storage
      .from(CAFE_REVISION_COVERS_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    res.status(201).json({ path, token: data.token });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to prepare revision cover upload');
  }
}

export async function attachRevisionCover(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    const path = String(req.body.path || '');
    const contentType = String(req.body.content_type || '');
    const prefix = `${revision.owner_id}/${revision.id}/`;
    if (!path.startsWith(prefix) || path.includes('..') || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      throw { statusCode: 400, message: 'Invalid revision cover' };
    }
    const storage = getSupabaseAdmin().storage.from(CAFE_REVISION_COVERS_BUCKET);
    const fileName = path.slice(prefix.length);
    const { data, error } = await storage.list(`${revision.owner_id}/${revision.id}`, { search: fileName });
    if (error) throw error;
    if (!data.some((object) => object.name === fileName)) throw { statusCode: 400, message: 'Uploaded cover not found' };
    await db.none(
      `UPDATE cafe_revisions
       SET proposed_cover_image_path = $1, proposed_cover_content_type = $2,
           status = 'draft', submitted_at = NULL, updated_at = NOW()
       WHERE id = $3`,
      [path, contentType, revision.id]
    );
    if (revision.proposed_cover_image_path && revision.proposed_cover_image_path !== path) {
      await removePrivateCover(revision.proposed_cover_image_path);
    }
    const updated = await getAuthorizedRevision(revision.id, req.userId, req.userRole);
    res.json({ revision: await withPreview(updated) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to attach revision cover');
  }
}

export async function deleteRevisionCover(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId || !req.userRole) throw { statusCode: 401, message: 'Not authenticated' };
    const revision = await getAuthorizedRevision(String(req.params.id), req.userId, req.userRole);
    await db.none(
      `UPDATE cafe_revisions
       SET proposed_cover_image_path = NULL, proposed_cover_content_type = NULL,
           status = 'draft', submitted_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [revision.id]
    );
    await removePrivateCover(revision.proposed_cover_image_path);
    res.json({ message: 'Revision cover removed' });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to remove revision cover');
  }
}

export async function listAdminCafeRevisions(req: Request, res: Response): Promise<void> {
  try {
    const status = String(req.query.status || 'pending') as CafeRevisionStatus;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw { statusCode: 400, message: 'Invalid revision status filter' };
    }
    const rows = await db.any<RevisionRow & { owner_name: string; owner_email: string }>(
      `SELECT r.*, row_to_json(c.*) AS live_cafe, u.name AS owner_name, u.email AS owner_email
       FROM cafe_revisions r
       LEFT JOIN cafes c ON c.id = r.cafe_id
       JOIN users u ON u.id = r.owner_id
       WHERE r.status = $1
       ORDER BY COALESCE(r.submitted_at, r.updated_at) DESC`,
      [status]
    );
    res.json({ revisions: await Promise.all(rows.map(withPreview)) });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to fetch admin review queue');
  }
}

async function promoteRevisionCover(revision: CafeRevision, cafeId: string): Promise<string | null> {
  if (!revision.proposed_cover_image_path) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(CAFE_REVISION_COVERS_BUCKET)
    .download(revision.proposed_cover_image_path);
  if (error) throw error;
  const extension = revision.proposed_cover_content_type === 'image/png'
    ? 'png'
    : revision.proposed_cover_content_type === 'image/webp' ? 'webp' : 'jpg';
  const destination = `${cafeId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(CAFE_COVERS_BUCKET)
    .upload(destination, data, { contentType: revision.proposed_cover_content_type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  return destination;
}

function profileValues(profile: CreateCafeRequest): unknown[] {
  return PROFILE_COLUMNS.map((column) => profile[column]);
}

export async function decideCafeRevision(req: Request, res: Response): Promise<void> {
  try {
    if (!req.userId) throw { statusCode: 401, message: 'Not authenticated' };
    const decision = String(req.body.decision || '');
    const reviewNote = req.body.review_note ? String(req.body.review_note).trim().slice(0, 2000) : null;
    if (!['approved', 'rejected'].includes(decision)) {
      throw { statusCode: 400, message: 'Decision must be approved or rejected' };
    }

    let promotedCover: string | null = null;
    let cleanupCover: string | null = null;
    let replacedPublicCover: string | null = null;
    const mode = new pgp.txMode.TransactionMode({ tiLevel: pgp.txMode.isolationLevel.serializable });
    const result = await db.tx({ mode }, async (t) => {
      const revision = await t.oneOrNone<CafeRevision>(
        'SELECT * FROM cafe_revisions WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      if (!revision) throw { statusCode: 404, message: 'Café revision not found' };
      if (revision.status !== 'pending') throw { statusCode: 409, message: 'This revision has already been reviewed' };

      if (decision === 'rejected') {
        cleanupCover = revision.proposed_cover_image_path;
        const rejected = await t.one<CafeRevision>(
          `UPDATE cafe_revisions
           SET status = 'rejected', reviewed_by = $1, review_note = $2,
               reviewed_at = NOW(), updated_at = NOW(),
               proposed_cover_image_path = NULL, proposed_cover_content_type = NULL
           WHERE id = $3 RETURNING *`,
          [req.userId, reviewNote, revision.id]
        );
        return { revision: rejected, cafe: null };
      }

      const profile = normalizeCafeProfile(revision.proposed_data as Partial<CreateCafeRequest>, revision.action === 'create');
      let cafe: Cafe;
      if (revision.action === 'create') {
        cafe = await t.one<Cafe>(
          `INSERT INTO cafes
            (owner_id, ${PROFILE_COLUMNS.join(', ')}, publication_status, version, published_at)
           VALUES ($1, ${PROFILE_COLUMNS.map((_, i) => `$${i + 2}`).join(', ')}, 'published', 1, NOW())
           RETURNING *`,
          [revision.owner_id, ...profileValues(profile)]
        );
      } else {
        const live = await t.oneOrNone<Cafe>('SELECT * FROM cafes WHERE id = $1 FOR UPDATE', [revision.cafe_id]);
        if (!live) throw { statusCode: 404, message: 'Live café not found' };
        if (live.version !== revision.base_version) {
          throw { statusCode: 409, message: 'The live café changed after this draft began. Rebase and resubmit it.' };
        }
        if (revision.action === 'archive') {
          cafe = await t.one<Cafe>(
            `UPDATE cafes
             SET publication_status = 'archived', archived_at = NOW(), version = version + 1, updated_at = NOW()
             WHERE id = $1 RETURNING *`,
            [live.id]
          );
          await t.none(
            `UPDATE bookings
             SET status = 'cancelled', cancellation_reason = 'Café archived after owner request'
             WHERE cafe_id = $1 AND status IN ('pending', 'confirmed')
               AND (
                 date > (NOW() AT TIME ZONE 'Asia/Colombo')::date
                 OR (
                   date = (NOW() AT TIME ZONE 'Asia/Colombo')::date
                   AND end_time > EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Colombo')
                 )
               )`,
            [live.id]
          );
        } else {
          replacedPublicCover = live.cover_image_path;
          cafe = await t.one<Cafe>(
            `UPDATE cafes SET
              ${PROFILE_COLUMNS.map((column, i) => `${column} = $${i + 1}`).join(', ')},
              publication_status = 'published', archived_at = NULL,
              version = version + 1, published_at = NOW(), updated_at = NOW()
             WHERE id = $${PROFILE_COLUMNS.length + 1}
             RETURNING *`,
            [...profileValues(profile), live.id]
          );
        }
      }

      if (revision.proposed_cover_image_path) {
        promotedCover = await promoteRevisionCover(revision, cafe.id);
        cafe = await t.one<Cafe>(
          'UPDATE cafes SET cover_image_path = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [promotedCover, cafe.id]
        );
      } else if (revision.action === 'update' && profile.remove_cover) {
        cafe = await t.one<Cafe>(
          'UPDATE cafes SET cover_image_path = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
          [cafe.id]
        );
      }

      const approved = await t.one<CafeRevision>(
        `UPDATE cafe_revisions
         SET cafe_id = $1, status = 'approved', reviewed_by = $2, review_note = $3,
             reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [cafe.id, req.userId, reviewNote, revision.id]
      );
      return { revision: approved, cafe };
    });

    await removePrivateCover(cleanupCover || result.revision.proposed_cover_image_path);
    if (result.cafe && replacedPublicCover && replacedPublicCover !== result.cafe.cover_image_path) {
      const { error: removeError } = await getSupabaseAdmin().storage
        .from(CAFE_COVERS_BUCKET)
        .remove([replacedPublicCover]);
      if (removeError) console.warn('Could not remove replaced public café cover:', removeError);
    }
    res.json({
      revision: result.revision,
      cafe: result.cafe ? serializeCafe(result.cafe) : null,
    });
  } catch (error) {
    sendRevisionError(res, error, 'Failed to review café revision');
  }
}
