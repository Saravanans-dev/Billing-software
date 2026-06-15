import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const today = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
       FROM sales WHERE bill_date = CURRENT_DATE`
    );

    const month = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
       FROM sales WHERE EXTRACT(MONTH FROM bill_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM bill_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );

    const year = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as count 
       FROM sales WHERE EXTRACT(YEAR FROM bill_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
    );

    const customers = await pool.query('SELECT COUNT(*) FROM customers WHERE is_active = true');
    const products = await pool.query('SELECT COUNT(*) FROM products WHERE is_active = true');

    const stockValue = await pool.query(
      `SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total 
       FROM products WHERE is_active = true`
    );

    const lowStock = await pool.query(
      `SELECT COUNT(*) FROM products WHERE is_active = true AND current_stock <= minimum_stock AND minimum_stock > 0`
    );

    const pendingPayments = await pool.query(
      `SELECT COALESCE(SUM(outstanding_amount), 0) as total FROM customers`
    );

    const recentSales = await pool.query(
      `SELECT s.*, u.full_name as user_name FROM sales s 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC LIMIT 10`
    );

    const topProducts = await pool.query(
      `SELECT si.product_name, SUM(si.quantity) as total_qty, SUM(si.amount) as total_amount
       FROM sale_items si GROUP BY si.product_name ORDER BY total_amount DESC LIMIT 10`
    );

    const monthlyRevenue = await pool.query(
      `SELECT TO_CHAR(bill_date, 'Mon') as month, EXTRACT(MONTH FROM bill_date) as month_num,
       COALESCE(SUM(grand_total), 0) as total
       FROM sales WHERE EXTRACT(YEAR FROM bill_date) = EXTRACT(YEAR FROM CURRENT_DATE)
       GROUP BY month, month_num ORDER BY month_num`
    );

    res.json({
      todaySales: { total: parseFloat(today.rows[0].total), count: parseInt(today.rows[0].count) },
      monthlySales: { total: parseFloat(month.rows[0].total), count: parseInt(month.rows[0].count) },
      yearlySales: { total: parseFloat(year.rows[0].total), count: parseInt(year.rows[0].count) },
      totalCustomers: parseInt(customers.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      stockValue: parseFloat(stockValue.rows[0].total),
      pendingPayments: parseFloat(pendingPayments.rows[0].total),
      lowStockProducts: parseInt(lowStock.rows[0].count),
      recentSales: recentSales.rows,
      topProducts: topProducts.rows,
      monthlyRevenue: monthlyRevenue.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
