import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

async function generateBillNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let financialYear: string;
  if (month >= 4) {
    financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    financialYear = `${year - 1}-${year.toString().slice(-2)}`;
  }

  const result = await pool.query(
    `INSERT INTO bill_sequences (financial_year, last_number) 
     VALUES ($1, 1) 
     ON CONFLICT (financial_year) 
     DO UPDATE SET last_number = bill_sequences.last_number + 1 
     RETURNING last_number`,
    [financialYear]
  );

  const seq = String(result.rows[0].last_number).padStart(6, '0');
  return `BT/${financialYear}/${seq}`;
}

export async function createSale(req: AuthRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const billNumber = await generateBillNumber();
    const {
      customer_id, customer_name, customer_mobile, customer_address, customer_gst,
      items, subtotal, discount_type, discount_value, discount_amount,
      taxable_amount, gst_amount, grand_total, round_off, payment_mode, notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const saleResult = await client.query(
      `INSERT INTO sales (bill_number, customer_id, customer_name, customer_mobile, customer_address, customer_gst,
        subtotal, discount_type, discount_value, discount_amount, taxable_amount, gst_amount, grand_total, round_off, payment_mode, user_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [billNumber, customer_id, customer_name, customer_mobile, customer_address, customer_gst,
        subtotal, discount_type, discount_value, discount_amount, taxable_amount, gst_amount, grand_total, round_off, payment_mode, req.user?.id, notes]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, unit, quantity, rate, discount_percentage, discount_amount, gst_percentage, gst_amount, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [saleResult.rows[0].id, item.product_id, item.product_name, item.unit, item.quantity, item.rate,
          item.discount_percentage, item.discount_amount, item.gst_percentage, item.gst_amount, item.amount]
      );

      if (item.product_id) {
        const stockCheck = await client.query('SELECT current_stock FROM products WHERE id = $1', [item.product_id]);
        const currentStock = parseFloat(stockCheck.rows[0]?.current_stock) || 0;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name}: available ${currentStock}, required ${item.quantity}`);
        }
        await client.query(
          'UPDATE products SET current_stock = current_stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );

        await client.query(
          `INSERT INTO stock_transactions (product_id, transaction_type, reference_id, quantity, rate, balance_quantity, user_id)
           VALUES ($1, 'sale', $2, $3, $4, (SELECT current_stock FROM products WHERE id = $1), $5)`,
          [item.product_id, saleResult.rows[0].id, item.quantity, item.rate, req.user?.id]
        );
      }
    }

    if (customer_id) {
      await client.query(
        'UPDATE customers SET outstanding_amount = outstanding_amount + $1 WHERE id = $2',
        [payment_mode === 'credit' ? grand_total : 0, customer_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(saleResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function getSales(req: AuthRequest, res: Response) {
  try {
    const { search, from, to, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = 'SELECT s.*, u.full_name as user_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 0;

    if (search) {
      paramIndex++;
      params.push(`%${search}%`);
      query += ` AND (s.bill_number ILIKE $${paramIndex} OR s.customer_name ILIKE $${paramIndex} OR s.customer_mobile ILIKE $${paramIndex})`;
    }
    if (from) {
      paramIndex++;
      params.push(from);
      query += ` AND s.bill_date >= $${paramIndex}`;
    }
    if (to) {
      paramIndex++;
      params.push(to);
      query += ` AND s.bill_date <= $${paramIndex}`;
    }

    const countQuery = query;
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      countQuery.replace(/SELECT s\.\*.*?FROM/, 'SELECT COUNT(*) FROM'),
      params.slice(0, -2)
    );

    res.json({
      sales: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSale(req: AuthRequest, res: Response) {
  try {
    const sale = await pool.query(
      'SELECT s.*, u.full_name as user_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      [req.params.id]
    );
    if (sale.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const items = await pool.query(
      'SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id',
      [req.params.id]
    );
    res.json({ ...sale.rows[0], items: items.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSale(req: AuthRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sale = await client.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    if (sale.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const items = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of items.rows) {
      if (item.product_id) {
        await client.query('UPDATE products SET current_stock = current_stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
    }

    await client.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function getTodaySales(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
       FROM sales WHERE bill_date = CURRENT_DATE`
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
