import { Request, Response } from 'express';
import { db } from '../config/database';
import { User, UserWithPassword, RegisterRequest, LoginRequest, AuthResponse } from '../models/types';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';

/**
 * POST /api/auth/register
 *
 * Registers a new user. Anyone can register as a customer.
 * Cafe owner role requires manual approval (for now, allow registration).
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, role = 'customer' } = req.body as RegisterRequest;

    // ── Input validation ─────────────────────────────
    if (!email || !password || !name) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Required: email, password, name',
      });
      return;
    }

    if (!email.includes('@') || email.length < 5) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    if (!['admin', 'cafe_owner', 'customer'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // ── Check if email already exists ─────────────────
    const existingUser = await db.oneOrNone<UserWithPassword>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // ── Hash password and create user ─────────────────
    const passwordHash = await hashPassword(password);

    const user = await db.one<User>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`,
      [email.toLowerCase(), passwordHash, name, role]
    );

    // ── Generate JWT token ───────────────────────────
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response: AuthResponse = { user, token };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
}

/**
 * POST /api/auth/login
 *
 * Authenticates a user and returns a JWT token.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;

    // ── Input validation ─────────────────────────────
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing required fields',
        details: 'Required: email, password',
      });
      return;
    }

    // ── Find user by email ───────────────────────────
    const user = await db.oneOrNone<UserWithPassword>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // ── Verify password ───────────────────────────────
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // ── Generate JWT token ───────────────────────────
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { password_hash: _passwordHash, ...userWithoutPassword } = user;
    const response: AuthResponse = { user: userWithoutPassword, token };
    res.json(response);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
}

/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's profile.
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // This will be populated by auth middleware
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await db.oneOrNone<User>(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
