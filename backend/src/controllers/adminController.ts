import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getAllData(req: AuthRequest, res: Response) {
  try {
    const [products, customers, sales, saleItems, users, companySettings, appSettings] = await Promise.all([
      pool.query(
        `SELECT id, product_name, barcode, category, unit, purchase_rate, wholesale_rate, retail_rate,
                current_stock, minimum_stock, gst_percentage, hsn_code, is_active
         FROM products ORDER BY product_name`
      ),
      pool.query(
        `SELECT id, customer_name, mobile, address, gst_number, credit_limit, outstanding_amount
         FROM customers WHERE is_active = true ORDER BY customer_name`
      ),
      pool.query(
        `SELECT s.id, s.bill_number, s.bill_date, s.customer_name, s.grand_total, s.payment_mode, s.created_at,
                u.full_name as user_name
         FROM sales s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 500`
      ),
      pool.query(
        `SELECT si.id, si.sale_id, si.product_name, si.unit, si.quantity, si.rate, si.discount_percentage, si.amount,
                s.bill_number
         FROM sale_items si JOIN sales s ON si.sale_id = s.id ORDER BY s.created_at DESC LIMIT 1000`
      ),
      pool.query(
        'SELECT id, username, full_name, role, is_active, last_login, created_at FROM users ORDER BY full_name'
      ),
      pool.query('SELECT * FROM company_settings LIMIT 1'),
      pool.query('SELECT * FROM settings ORDER BY setting_key'),
    ]);

    const settingsMap: Record<string, string> = {};
    appSettings.rows.forEach((row: any) => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    res.json({
      products: products.rows,
      customers: customers.rows,
      sales: sales.rows,
      saleItems: saleItems.rows,
      users: users.rows,
      company: companySettings.rows[0] || null,
      settings: settingsMap,
      counts: {
        products: products.rows.length,
        customers: customers.rows.length,
        sales: sales.rows.length,
        saleItems: saleItems.rows.length,
        users: users.rows.length,
      },
    });
  } catch (error) {
    console.error('Admin data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
