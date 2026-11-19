import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { validationResult } from 'express-validator';

const DEFAULT_JWT_SECRET = 'mindcare-dev-secret-change-in-production-2026';

function getJwtSecret(): string {
  const raw = (process.env.JWT_SECRET || '').trim().replace(/^['"]|['"]$/g, '');
  return raw.length > 0 ? raw : DEFAULT_JWT_SECRET;
}

function getJwtExpiresIn(): jwt.SignOptions['expiresIn'] {
  const raw = (process.env.JWT_EXPIRES_IN || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) return '7d';
  if (/^\d+$/.test(raw)) return Number(raw);
  if (/^\d+\s*(ms|s|m|h|d|w|y)$/i.test(raw)) {
    return raw.replace(/\s+/g, '') as jwt.SignOptions['expiresIn'];
  }
  return '7d';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function signAuthToken(payload: { userId: string; email: string; role: string }): string {
  const secret = getJwtSecret();
  try {
    return jwt.sign(payload, secret, { expiresIn: getJwtExpiresIn() });
  } catch {
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; email: string; role: string };
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0]?.msg || 'Validation failed',
      details: errors.array(),
    });
  }
  return next();
}

function isValidIpLike(value: string): boolean {
  if (!value) return false;
  return /^[0-9a-fA-F:.]+$/.test(value);
}

function getClientIpKey(req: Request): string {
  try {
    const forwarded = req.headers.forwarded;
    if (typeof forwarded === 'string') {
      const bracketed = forwarded.match(/for="?\[([^\]]+)\](?::\d+)?"?/i);
      if (bracketed?.[1] && isValidIpLike(bracketed[1])) {
        return ipKeyGenerator(bracketed[1]);
      }
      const plain = forwarded.match(/for="?([^;,"\s]+)"?/i);
      if (plain?.[1]) {
        const value = plain[1];
        const colonCount = (value.match(/:/g) || []).length;
        const cleaned = colonCount === 1 ? value.replace(/:\d+$/, '') : value;
        if (isValidIpLike(cleaned)) {
          return ipKeyGenerator(cleaned);
        }
      }
    }
    const rawIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '');
    return ipKeyGenerator(isValidIpLike(rawIp) ? rawIp : '127.0.0.1');
  } catch {
    return '127.0.0.1';
  }
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  keyGenerator: getClientIpKey,
  message: { error: 'Too many authentication attempts. Please try again in a few minutes.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  keyGenerator: getClientIpKey,
  message: { error: 'Rate limit exceeded. Please slow down requests.' },
});
