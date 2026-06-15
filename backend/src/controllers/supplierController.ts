import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getSuppliers(req: AuthRequest, res: Response) {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM suppliers WHERE is_active = true';
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (supplier_name ILIKE $1 OR mobile ILIKE $1)`;
    }
    query += ' ORDER BY supplier_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createSupplier(req: AuthRequest, res: Response) {
  try {
    const { supplier_name, mobile, address, gst_number } = req.body;
    if (!supplier_name) return res.status(400).json({ error: 'Supplier name is required' });
    const result = await pool.query(
      `INSERT INTO suppliers (supplier_name, mobile, address, gst_number) VALUES ($1,$2,$3,$4) RETURNING *`,
      [supplier_name, mobile, address, gst_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSupplier(req: AuthRequest, res: Response) {
  try {
    const { supplier_name, mobile, address, gst_number } = req.body;
    const result = await pool.query(
      `UPDATE suppliers SET supplier_name=$1, mobile=$2, address=$3, gst_number=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,
      [supplier_name, mobile, address, gst_number, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSupplier(req: AuthRequest, res: Response) {
  try {
    await pool.query('UPDATE suppliers SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
