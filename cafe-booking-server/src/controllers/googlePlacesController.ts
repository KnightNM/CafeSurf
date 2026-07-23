import type { Request, Response } from 'express';
import { db } from '../config/database';
import type { Cafe } from '../models/types';
import {
  autocompleteGooglePlaces,
  getGooglePlaceImport,
  getGooglePlaceDetails,
  validatePlaceId,
  validatePlaceInput,
  validateSessionToken,
} from '../services/googlePlaces';

function sendGooglePlacesError(res: Response, error: unknown): void {
  const typed = error as { statusCode?: number; message?: string };
  if (typed.statusCode && typed.message) {
    res.status(typed.statusCode).json({ error: typed.message });
    return;
  }
  console.error('Google Places request failed:', error);
  res.status(500).json({ error: 'Google Places request failed' });
}

export async function autocompletePlaces(req: Request, res: Response): Promise<void> {
  try {
    const suggestions = await autocompleteGooglePlaces(
      validatePlaceInput(req.body.input),
      validateSessionToken(req.body.session_token)
    );
    res.json({ suggestions });
  } catch (error) {
    sendGooglePlacesError(res, error);
  }
}

export async function importPlaceDetails(req: Request, res: Response): Promise<void> {
  try {
    const imported = await getGooglePlaceImport(
      validatePlaceId(req.body.place_id),
      validateSessionToken(req.body.session_token)
    );
    res.json(imported);
  } catch (error) {
    sendGooglePlacesError(res, error);
  }
}

export async function cafePlaceDetails(req: Request, res: Response): Promise<void> {
  try {
    const cafe = await db.oneOrNone<Pick<Cafe, 'google_place_id'>>(
      `SELECT google_place_id FROM cafes WHERE id = $1 AND publication_status = 'published'`,
      [req.params.cafeId]
    );
    if (!cafe) {
      res.status(404).json({ error: 'Cafe not found' });
      return;
    }
    if (!cafe.google_place_id) {
      res.status(404).json({ error: 'This cafe is not linked to Google Maps' });
      return;
    }
    const place = await getGooglePlaceDetails(cafe.google_place_id);
    res.json({ place });
  } catch (error) {
    sendGooglePlacesError(res, error);
  }
}
