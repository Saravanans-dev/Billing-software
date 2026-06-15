import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

async function generatePurchaseNumber(): Promise<string> {
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
    [financialYear + '_purchase']
  );

  const seq = String(result.rows[0].last_number).padStart(6, '0');
  return `PO/${financialYear}/${seq}`;
}

export async function createPurchase(req: AuthRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const purchaseNumber = await generatePurchaseNumber();
    const { supplier_id, supplier_name, supplier_mobile, items, subtotal, gst_amount, grand_total, payment_mode, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const purchaseResult = await client.query(
      `INSERT INTO purchases (purchase_number, supplier_id, supplier_name, supplier_mobile, subtotal, gst_amount, grand_total, payment_mode, user_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [purchaseNumber, supplier_id, supplier_name, supplier_mobile, subtotal, gst_amount, grand_total, payment_mode, req.user?.id, notes]
    );

    for (const item of items) {
      if (item.product_id) {
        await client.query(
          `INSERT INTO products (id, product_name, category, unit, hsn_code, gst_percentage, purchase_rate, current_stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
           purchase_rate = CASE WHEN $7 > 0 THEN $7 ELSE products.purchase_rate END,
           current_stock = products.current_stock + $8`,
          [item.product_id, item.product_name, item.category, item.unit, item.hsn_code, item.gst_percentage, item.rate, item.quantity]
        );

        await client.query(
          `INSERT INTO stock_transactions (product_id, transaction_type, reference_id, quantity, rate, balance_quantity, user_id)
           VALUES ($1, 'purchase', $2, $3, $4, (SELECT current_stock FROM products WHERE id = $1), $5)`,
          [item.product_id, purchaseResult.rows[0].id, item.quantity, item.rate, req.user?.id]
        );
      }

      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, quantity, rate, gst_percentage, gst_amount, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [purchaseResult.rows[0].id, item.product_id, item.product_name, item.unit, item.quantity, item.rate, item.gst_percentage, item.gst_amount, item.amount]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(purchaseResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

export async function getPurchases(req: AuthRequest, res: Response) {
  try {
    const { search, from, to, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = 'SELECT p.*, u.full_name as user_name FROM purchases p LEFT JOIN users u ON p.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 0;

    if (search) {
      paramIndex++;
      params.push(`%${search}%`);
      query += ` AND (p.purchase_number ILIKE $${paramIndex} OR p.supplier_name ILIKE $${paramIndex})`;
    }
    if (from) {
      paramIndex++;
      params.push(from);
      query += ` AND p.purchase_date >= $${paramIndex}`;
    }
    if (to) {
      paramIndex++;
      params.push(to);
      query += ` AND p.purchase_date <= $${paramIndex}`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ purchases: result.rows, total: result.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPurchase(req: AuthRequest, res: Response) {
  try {
    const purchase = await pool.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    if (purchase.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });

    const items = await pool.query('SELECT * FROM purchase_items WHERE purchase_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...purchase.rows[0], items: items.rows });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deletePurchase(req: AuthRequest, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const items = await client.query('SELECT * FROM purchase_items WHERE purchase_id = $1', [req.params.id]);
    for (const item of items.rows) {
      if (item.product_id) {
        await client.query('UPDATE products SET current_stock = current_stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
      }
    }
    await client.query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}
