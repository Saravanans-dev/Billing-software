import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
export async function getPendingPayments(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, customer_name, mobile, outstanding_amount, credit_limit,
       CASE WHEN outstanding_amount > credit_limit AND credit_limit > 0 THEN 'over_limit'
            WHEN outstanding_amount > 0 THEN 'pending' ELSE 'clear' END as status
       FROM customers WHERE outstanding_amount > 0 ORDER BY outstanding_amount DESC`
    );
    res.json({ payments: result.rows, total: result.rows.reduce((s, r) => s + parseFloat(r.outstanding_amount), 0) });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function recordPayment(req: AuthRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_id, amount, payment_mode, notes } = req.body;
    if (!customer_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Customer ID and valid amount are required' });
    }

    const customer = await client.query('SELECT customer_name, outstanding_amount FROM customers WHERE id = $1 AND is_active = true', [customer_id]);
    if (customer.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const outstanding = parseFloat(customer.rows[0].outstanding_amount);
    if (amount > outstanding) {
      return res.status(400).json({ error: `Payment amount (${amount}) exceeds outstanding balance (${outstanding})` });
    }

    const newOutstanding = outstanding - amount;

    await client.query(
      'UPDATE customers SET outstanding_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newOutstanding, customer_id]
    );

    const paymentResult = await client.query(
      `INSERT INTO payments (reference_type, reference_id, amount, payment_mode, notes, user_id)
       VALUES ('sale', $1, $2, $3, $4, $5) RETURNING *`,
      [customer_id, amount, payment_mode || 'cash', notes || null, req.user?.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      payment: paymentResult.rows[0],
      customer_name: customer.rows[0].customer_name,
      previous_outstanding: outstanding,
      new_outstanding: newOutstanding,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function getPaymentHistory(req: AuthRequest, res: Response) {
  try {
    const { customer_id } = req.query;
    let query = `
      SELECT p.*, c.customer_name
      FROM payments p
      LEFT JOIN customers c ON c.id = p.reference_id
      WHERE p.reference_type = 'sale'
    `;
    const params: any[] = [];
    if (customer_id) {
      params.push(customer_id);
      query += ` AND p.reference_id = $${params.length}`;
    }
    query += ' ORDER BY p.created_at DESC LIMIT 50';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
