import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getSalesReport(req: AuthRequest, res: Response) {
  try {
    const { from, to, period = 'daily' } = req.query;
    let query: string;
    const params: any[] = [];

    if (period === 'daily') {
      query = `SELECT bill_date, COUNT(*) as bill_count, COALESCE(SUM(grand_total),0) as total, 
               COALESCE(SUM(gst_amount),0) as gst_total, COALESCE(SUM(discount_amount),0) as discount_total
               FROM sales WHERE 1=1`;
      if (from) { params.push(from); query += ` AND bill_date >= $${params.length}`; }
      if (to) { params.push(to); query += ` AND bill_date <= $${params.length}`; }
      query += ' GROUP BY bill_date ORDER BY bill_date DESC';
    } else if (period === 'monthly') {
      query = `SELECT TO_CHAR(bill_date, 'YYYY-MM') as month, COUNT(*) as bill_count, 
               COALESCE(SUM(grand_total),0) as total FROM sales WHERE 1=1`;
      if (from) { params.push(from); query += ` AND bill_date >= $${params.length}`; }
      if (to) { params.push(to); query += ` AND bill_date <= $${params.length}`; }
      query += ' GROUP BY month ORDER BY month DESC';
    } else {
      query = `SELECT EXTRACT(YEAR FROM bill_date) as year, COUNT(*) as bill_count, 
               COALESCE(SUM(grand_total),0) as total FROM sales WHERE 1=1`;
      if (from) { params.push(from); query += ` AND bill_date >= $${params.length}`; }
      if (to) { params.push(to); query += ` AND bill_date <= $${params.length}`; }
      query += ' GROUP BY year ORDER BY year DESC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStockReport(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT product_name, category, unit, current_stock, minimum_stock, purchase_rate, wholesale_rate, retail_rate,
       (current_stock * purchase_rate) as stock_value,
       CASE WHEN current_stock <= 0 THEN 'out_of_stock'
            WHEN current_stock <= minimum_stock THEN 'low_stock'
            WHEN current_stock <= minimum_stock * 2 THEN 'near_low'
            ELSE 'healthy' END as stock_status
       FROM products WHERE is_active = true ORDER BY current_stock ASC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProfitLossReport(req: AuthRequest, res: Response) {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 0;

    if (from) { paramIndex++; params.push(from); dateFilter += ` AND s.bill_date >= $${paramIndex}`; }
    if (to) { paramIndex++; params.push(to); dateFilter += ` AND s.bill_date <= $${paramIndex}`; }

    const salesTotal = await pool.query(
      `SELECT COALESCE(SUM(si.quantity * (si.rate - COALESCE(p.purchase_rate, 0))), 0) as gross_profit,
       COALESCE(SUM(s.grand_total), 0) as total_sales,
       COALESCE(SUM(si.quantity * COALESCE(p.purchase_rate, 0)), 0) as total_cost
       FROM sales s JOIN sale_items si ON s.id = si.sale_id LEFT JOIN products p ON si.product_id = p.id
       WHERE 1=1${dateFilter}`, params
    );

    const purchaseTotal = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total_purchases FROM purchases WHERE 1=1${dateFilter}`, params
    );

    const expenses = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE 1=1${dateFilter}`, params
    );

    res.json({
      totalSales: parseFloat(salesTotal.rows[0].total_sales),
      totalCost: parseFloat(salesTotal.rows[0].total_cost),
      grossProfit: parseFloat(salesTotal.rows[0].gross_profit),
      totalPurchases: parseFloat(purchaseTotal.rows[0].total_purchases),
      totalExpenses: parseFloat(expenses.rows[0].total_expenses),
      netProfit: parseFloat(salesTotal.rows[0].gross_profit) - parseFloat(expenses.rows[0].total_expenses),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getGSTReport(req: AuthRequest, res: Response) {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 0;

    if (from) { paramIndex++; params.push(from); dateFilter += ` AND s.bill_date >= $${paramIndex}`; }
    if (to) { paramIndex++; params.push(to); dateFilter += ` AND s.bill_date <= $${paramIndex}`; }

    const result = await pool.query(
      `SELECT si.gst_percentage, COUNT(*) as item_count, COALESCE(SUM(si.taxable_amount),0) as taxable_value,
       COALESCE(SUM(si.gst_amount),0) as gst_amount
       FROM sales s JOIN sale_items si ON s.id = si.sale_id WHERE si.gst_percentage > 0${dateFilter}
       GROUP BY si.gst_percentage ORDER BY si.gst_percentage`, params
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOutstandingReport(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, customer_name, mobile, outstanding_amount, credit_limit,
       CASE WHEN outstanding_amount > credit_limit AND credit_limit > 0 THEN 'over_limit'
            WHEN outstanding_amount > 0 THEN 'pending' ELSE 'clear' END as status
       FROM customers WHERE outstanding_amount > 0 ORDER BY outstanding_amount DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
