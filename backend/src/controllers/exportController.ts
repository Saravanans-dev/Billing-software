import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export async function exportSalesExcel(req: AuthRequest, res: Response) {
  try {
    const { from, to } = req.query;
    let query = `SELECT s.bill_number, s.bill_date, s.customer_name, s.grand_total, s.payment_mode, u.full_name as user_name
                 FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1`;
    const params: any[] = [];
    if (from) { params.push(from); query += ` AND s.bill_date >= $${params.length}`; }
    if (to) { params.push(to); query += ` AND s.bill_date <= $${params.length}`; }
    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    sheet.columns = [
      { header: 'Bill No', key: 'bill_number', width: 20 },
      { header: 'Date', key: 'bill_date', width: 15 },
      { header: 'Customer', key: 'customer_name', width: 25 },
      { header: 'Amount', key: 'grand_total', width: 15 },
      { header: 'Payment', key: 'payment_mode', width: 15 },
      { header: 'User', key: 'user_name', width: 20 },
    ];

    result.rows.forEach((row: any) => sheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
}

export async function exportStockExcel(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      `SELECT product_name, category, unit, current_stock, minimum_stock, purchase_rate, wholesale_rate, retail_rate,
       (current_stock * purchase_rate) as stock_value FROM products WHERE is_active = true ORDER BY product_name`
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Report');

    sheet.columns = [
      { header: 'Product', key: 'product_name', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Stock', key: 'current_stock', width: 12 },
      { header: 'Min Stock', key: 'minimum_stock', width: 12 },
      { header: 'Purchase Rate', key: 'purchase_rate', width: 15 },
      { header: 'Wholesale', key: 'wholesale_rate', width: 15 },
      { header: 'Retail', key: 'retail_rate', width: 15 },
      { header: 'Stock Value', key: 'stock_value', width: 15 },
    ];

    result.rows.forEach((row: any) => sheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
}

export async function exportProductsExcel(req: AuthRequest, res: Response) {
  try {
    const result = await pool.query(
      'SELECT product_name, category, unit, hsn_code, gst_percentage, purchase_rate, wholesale_rate, retail_rate, minimum_stock, current_stock, barcode FROM products WHERE is_active = true ORDER BY product_name'
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'Name', key: 'product_name', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'HSN', key: 'hsn_code', width: 15 },
      { header: 'GST%', key: 'gst_percentage', width: 10 },
      { header: 'Purchase Rate', key: 'purchase_rate', width: 15 },
      { header: 'Wholesale', key: 'wholesale_rate', width: 15 },
      { header: 'Retail', key: 'retail_rate', width: 15 },
      { header: 'Min Stock', key: 'minimum_stock', width: 12 },
      { header: 'Stock', key: 'current_stock', width: 12 },
      { header: 'Barcode', key: 'barcode', width: 15 },
    ];

    result.rows.forEach((row: any) => sheet.addRow(row));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
}

export async function printInvoice(req: AuthRequest, res: Response) {
  try {
    const sale = await pool.query(
      'SELECT s.*, u.full_name as user_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = $1',
      [req.params.id]
    );
    if (sale.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const items = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id', [req.params.id]);
    const company = await pool.query('SELECT * FROM company_settings LIMIT 1');

    const doc = new PDFDocument({ size: 'A5', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${sale.rows[0].bill_number}.pdf`);
    doc.pipe(res);

    const s = sale.rows[0];
    const c = company.rows[0] || {};

    doc.fontSize(16).font('Helvetica-Bold').text(c.company_name || 'Student Xerox', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text(c.address || '', { align: 'center' });
    doc.fontSize(8).text(`GST: ${c.gst_number || ''} | PH: ${c.mobile || ''}`, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(12).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(8).font('Helvetica');
    doc.text(`Bill No: ${s.bill_number}`, { continued: true }).text(`Date: ${new Date(s.bill_date).toLocaleDateString()}`, { align: 'right' });
    doc.text(`Customer: ${s.customer_name || 'Walk-In'}`, { continued: true }).text(`GST: ${s.customer_gst || '-'}`, { align: 'right' });
    doc.moveDown(0.3);

    // Table header
    const tableTop = doc.y;
    const colWidths = [25, 140, 45, 50, 50, 50, 50];
    const headers = ['#', 'Product', 'Qty', 'Rate', 'Disc', 'GST', 'Amount'];

    doc.fontSize(7).font('Helvetica-Bold');
    let x = 30;
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });
    doc.moveDown(0.5);

    doc.fontSize(7).font('Helvetica');
    let y = doc.y;
    items.rows.forEach((item: any, idx: number) => {
      x = 30;
      const row = [idx + 1, item.product_name, item.quantity + ' ' + item.unit, Number(item.rate).toFixed(2), Number(item.discount_amount) > 0 ? Number(item.discount_amount).toFixed(2) : '-', item.gst_percentage + '%', Number(item.amount).toFixed(2)];
      row.forEach((val, i) => {
        doc.text(String(val), x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      y += 14;
    });

    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(`Subtotal: ${Number(s.subtotal).toFixed(2)}`, { align: 'right' });
    if (Number(s.discount_amount) > 0) doc.text(`Discount: -${Number(s.discount_amount).toFixed(2)}`, { align: 'right' });
    doc.text(`GST: ${Number(s.gst_amount).toFixed(2)}`, { align: 'right' });
    doc.text(`Round Off: ${Number(s.round_off).toFixed(2)}`, { align: 'right' });
    doc.fontSize(10).text(`Grand Total: ${Number(s.grand_total).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.3);

    doc.fontSize(7).font('Helvetica');
    doc.text(`Payment: ${s.payment_mode?.toUpperCase() || 'CASH'}`, { align: 'left' });
    doc.text(`User: ${s.user_name || ''}`, { align: 'left' });

    doc.fontSize(6).text('This is a computer generated invoice', { align: 'center' });
    doc.end();
  } catch (error) {
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
