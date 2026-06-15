import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getProducts(req: AuthRequest, res: Response) {
  try {
    const { search, category, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let query = 'SELECT * FROM products WHERE is_active = true';
    const params: any[] = [];
    let paramIndex = 0;

    if (search) {
      paramIndex++;
      params.push(`%${search}%`);
      query += ` AND (product_name ILIKE $${paramIndex} OR barcode ILIKE $${paramIndex} OR hsn_code ILIKE $${paramIndex})`;
    }
    if (category) {
      paramIndex++;
      params.push(category);
      query += ` AND category = $${paramIndex}`;
    }

    const countQuery = query;
    query += ` ORDER BY product_name LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      countQuery.replace(/SELECT \*/, 'SELECT COUNT(*)'),
      params.slice(0, -2)
    );

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProduct(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const { product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode } = req.body;
    if (!product_name) return res.status(400).json({ error: 'Product name is required' });

    const result = await pool.query(
      `INSERT INTO products (product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [product_name, category, unit || 'Kg', hsn_code, gst_percentage || 0, purchase_rate || 0, wholesale_rate || 0, retail_rate || 0, minimum_stock || 0, current_stock || 0, barcode]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Barcode already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const { product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode } = req.body;
    const result = await pool.query(
      `UPDATE products SET product_name = $1, category = $2, unit = $3, hsn_code = $4, gst_percentage = $5, 
       purchase_rate = $6, wholesale_rate = $7, retail_rate = $8, minimum_stock = $9, current_stock = $10, 
       barcode = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12 RETURNING *`,
      [product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    await pool.query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function bulkImportProducts(req: AuthRequest, res: Response) {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    let imported = 0;
    for (const p of products) {
      try {
        await pool.query(
          `INSERT INTO products (product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (barcode) DO UPDATE SET
           product_name = EXCLUDED.product_name, purchase_rate = EXCLUDED.purchase_rate, wholesale_rate = EXCLUDED.wholesale_rate, retail_rate = EXCLUDED.retail_rate, current_stock = products.current_stock + EXCLUDED.current_stock`,
          [p.product_name, p.category, p.unit || 'Kg', p.hsn_code, p.gst_percentage || 0, p.purchase_rate || 0, p.wholesale_rate || 0, p.retail_rate || 0, p.minimum_stock || 0, p.current_stock || 0, p.barcode]
        );
        imported++;
      } catch (e) {
        console.error('Import error for product:', p.product_name, e);
      }
    }
    res.json({ message: `${imported} products imported successfully`, count: imported });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
