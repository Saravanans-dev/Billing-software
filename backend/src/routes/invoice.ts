import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

router.get('/:billNumber(.*)', async (req: Request, res: Response) => {
  try {
    const { billNumber } = req.params;

    const sale = await pool.query(
      `SELECT s.*, u.full_name as user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.bill_number = $1`,
      [billNumber]
    );

    if (sale.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const items = await pool.query(
      'SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id',
      [sale.rows[0].id]
    );

    const company = await pool.query('SELECT * FROM company_settings LIMIT 1');
    const settingsResult = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'upi_id'");
    const upiId = settingsResult.rows[0]?.setting_value || '';

    res.json({
      sale: { ...sale.rows[0], items: items.rows },
      company: company.rows[0] || null,
      upi_id: upiId,
    });
  } catch (error) {
    console.error('Public invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
