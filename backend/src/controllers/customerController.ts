import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getCustomers(req: AuthRequest, res: Response) {
  try {
    const { search, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = 'SELECT * FROM customers WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (customer_name ILIKE $${params.length} OR mobile ILIKE $${params.length})`;
    }

    query += ' ORDER BY customer_name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM customers WHERE is_active = true' + (search ? ` AND (customer_name ILIKE $1 OR mobile ILIKE $1)` : ''), search ? [`%${search}%`] : []);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCustomer(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCustomer(req: AuthRequest, res: Response) {
  try {
    const { customer_name, mobile, address, gst_number, credit_limit } = req.body;
    if (!customer_name) return res.status(400).json({ error: 'Customer name is required' });

    const result = await pool.query(
      `INSERT INTO customers (customer_name, mobile, address, gst_number, credit_limit) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customer_name, mobile, address, gst_number, credit_limit || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCustomer(req: AuthRequest, res: Response) {
  try {
    const { customer_name, mobile, address, gst_number, credit_limit } = req.body;
    const result = await pool.query(
      `UPDATE customers SET customer_name = $1, mobile = $2, address = $3, gst_number = $4, 
       credit_limit = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
      [customer_name, mobile, address, gst_number, credit_limit, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteCustomer(req: AuthRequest, res: Response) {
  try {
    await pool.query('UPDATE customers SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCustomerHistory(req: AuthRequest, res: Response) {
  try {
    const sales = await pool.query(
      'SELECT bill_number as reference, bill_date as date, grand_total as amount, payment_mode, created_at FROM sales WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(sales.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
