import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import JWT_SECRET from '../config/jwt';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function isPasswordStrong(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, full_name, email, mobile, role, is_active, login_attempts, locked_until FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${minutesLeft} minute(s).` });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = (parseInt(user.login_attempts) || 0) + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await pool.query(
          'UPDATE users SET login_attempts = $1, locked_until = CURRENT_TIMESTAMP + INTERVAL \'15 minutes\' WHERE id = $2',
          [attempts, user.id]
        );
        return res.status(429).json({ error: `Account locked due to ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.` });
      }
      await pool.query('UPDATE users SET login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifyToken(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, email, mobile, role FROM users WHERE id = $1 AND is_active = true',
      [req.user?.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  try {
    const { current_password, new_password } = req.body;

    if (!new_password || typeof new_password !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    const strength = isPasswordStrong(new_password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.message });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, req.user?.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
