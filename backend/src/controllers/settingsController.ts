import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getCompanySettings(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    if (result.rows.length === 0) {
      const newSettings = await pool.query(
        `INSERT INTO company_settings (company_name) VALUES ('Student Xerox') RETURNING *`
      );
      return res.json(newSettings.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCompanySettings(req: AuthRequest, res: Response) {
  try {
    const existing = await pool.query('SELECT * FROM company_settings LIMIT 1');
    const current = existing.rows[0] || {};
    const fields = ['company_name','address','mobile','email','gst_number','pan_number','logo_url','financial_year_start','financial_year_end','thermal_printer','a5_printer','auto_backup_enabled','backup_frequency'];
    const merged: any = {};
    fields.forEach(f => { merged[f] = req.body[f] !== undefined ? req.body[f] : current[f]; });
    const result = await pool.query(
      `UPDATE company_settings SET company_name=$1, address=$2, mobile=$3, email=$4, gst_number=$5, pan_number=$6, 
       logo_url=$7, financial_year_start=$8, financial_year_end=$9, thermal_printer=$10, a5_printer=$11, 
       auto_backup_enabled=$12, backup_frequency=$13, updated_at=CURRENT_TIMESTAMP WHERE id=(SELECT id FROM company_settings LIMIT 1) RETURNING *`,
      fields.map(f => merged[f])
    );
    res.json(result.rows[0] || { message: 'Settings updated' });
  } catch (error: any) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSettings(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings: any = {};
    result.rows.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSetting(req: AuthRequest, res: Response) {
  try {
    const { key, value } = req.body;
    await pool.query(
      `INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) 
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
    res.json({ message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, email, mobile, role, is_active, last_login, created_at FROM users ORDER BY full_name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { username, password, full_name, email, mobile, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, mobile, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, role`,
      [username, password_hash, full_name, email, mobile, role || 'operator']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { full_name, email, mobile, role, is_active } = req.body;
    const result = await pool.query(
      `UPDATE users SET full_name=$1, email=$2, mobile=$3, role=$4, is_active=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING id, username, full_name, role`,
      [full_name, email, mobile, role, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
