import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { supabaseAuth } from '../config/supabase';
import { User, UserRole } from '../models/types';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      userRole?: UserRole;
    }
  }
}

/**
 * Authentication middleware
 * Verifies a Supabase access token and loads the authoritative app profile.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const profile = await db.oneOrNone<User>(
      'SELECT id, email, name, role, created_at, updated_at FROM public.users WHERE id = $1',
      [data.user.id]
    );

    if (!profile) {
      res.status(401).json({ error: 'Authenticated user profile not found' });
      return;
    }

    req.userId = profile.id;
    req.userEmail = profile.email;
    req.userRole = profile.role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Loads a Supabase identity when a Bearer token is present, while allowing
 * anonymous requests through unchanged.
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.headers.authorization) {
    next();
    return;
  }
  await authenticate(req, res, next);
}

/**
 * Role-based authorization middleware
 * Requires authentication and specific role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
