import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import JWT_SECRET from '../config/jwt';
import pool from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    full_name: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

    const user = await pool.query(
      'SELECT id, username, role, full_name, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (user.rows.length === 0 || !user.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    req.user = {
      id: user.rows[0].id,
      username: user.rows[0].username,
      role: user.rows[0].role,
      full_name: user.rows[0].full_name,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
