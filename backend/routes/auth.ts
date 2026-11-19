import { Router } from 'express';
import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body } from 'express-validator';
import { dbStore, sanitizeUser } from '../services/dataStore.ts';
import {
  authenticateToken,
  authLimiter,
  handleValidationErrors,
  signAuthToken,
} from '../middleware/auth.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address.'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be at least 8 characters long.'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, email, password } = req.body;
      const existing = await dbStore.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await dbStore.createUser({ name, email, passwordHash });
      const token = signAuthToken({ userId: user.id, email: user.email, role: user.role || 'user' });
      return res.status(201).json({
        token,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('Signup error:', err?.message || err);
      return res.status(500).json({ error: 'Unable to create account right now.' });
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await dbStore.findUserByEmail(email, true);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      const token = signAuthToken({ userId: user.id, email: user.email, role: user.role || 'user' });
      return res.json({
        token,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('Login error:', err?.message || err);
      return res.status(500).json({ error: 'Unable to sign in right now.' });
    }
  }
);

router.post('/logout', (_req, res: Response) => {
  return res.json({ message: 'Signed out cleanly.' });
});

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address.')],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email } = req.body;
      const user = await dbStore.findUserByEmail(email);
      if (user) {
        const resetToken = crypto.randomBytes(24).toString('hex');
        await dbStore.updateUser(user.id, {
          resetToken,
          resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      }
      return res.json({
        message:
          'If an account matches that email, password reset instructions have been prepared. For local development environments without SMTP configured, contact your instance administrator.',
      });
    } catch {
      return res.status(500).json({ error: 'Could not process password reset request.' });
    }
  }
);

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await dbStore.findUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    return res.json({ user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve account profile.' });
  }
});

export default router;
