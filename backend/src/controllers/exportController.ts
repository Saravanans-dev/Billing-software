import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 595.28, H: 841.89, M: 30 };
const CW = PAGE.W - PAGE.M * 2;

function dash(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor('#ccc').lineWidth(0.5).stroke();
}

// ---- Excel exports unchanged ----

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

// ---- Professional A4 Invoice ----

export async function printInvoice(req: AuthRequest, res: Response) {
  try {
    const sale = await pool.query(
      `SELECT s.*, u.full_name as user_name
       FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [req.params.id]
    );
    if (sale.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });

    const items = await pool.query(
      `SELECT si.*, p.barcode, p.category, p.hsn_code
       FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1 ORDER BY si.id`,
      [req.params.id]
    );

    const company = await pool.query('SELECT * FROM company_settings LIMIT 1');
    const extras = await pool.query(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('upi_id','return_policy','terms_conditions','thank_you_message')`
    );
    const extraMap: Record<string, string> = {};
    extras.rows.forEach((r: any) => { extraMap[r.setting_key] = r.setting_value; });

    const s = sale.rows[0];
    const c = company.rows[0] || {};
    const footerSettings = extraMap;

    const doc = new PDFDocument({ size: 'A4', margin: PAGE.M, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${s.bill_number}.pdf`);
    doc.pipe(res);

    const grandTotal = Number(s.grand_total) || 0;
    const storeName = String(c.company_name || 'STUDENT XEROX').toUpperCase();

    // ═══ HEADER ═══
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000');
    doc.text(storeName, { align: 'center' });
    doc.moveDown(0.2);

    const infoParts = [c.address, c.mobile ? `Ph: ${c.mobile}` : '', c.email ? `Email: ${c.email}` : ''].filter(Boolean).join('  |  ');
    doc.fontSize(8).font('Helvetica').fillColor('#555');
    if (infoParts) doc.text(infoParts, { align: 'center' });
    if (c.gst_number) doc.text(`GSTIN: ${c.gst_number}`, { align: 'center' });
    doc.moveDown(0.5);
    dash(doc, doc.y);
    doc.moveDown(0.5);

    // ═══ INVOICE & CUSTOMER INFO ═══
    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    const iy = doc.y;
    doc.text(`Invoice No: ${s.bill_number || ''}`, PAGE.M, iy);
    doc.text(`Date: ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`, PAGE.M, iy + 11);
    doc.text(`Time: ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`, PAGE.M, iy + 22);

    const cx = PAGE.M + CW * 0.45;
    doc.text(`Customer: ${s.customer_name || 'Walk-In'}`, cx, iy);
    doc.text(`Mobile: ${s.customer_mobile || '-'}`, cx, iy + 11);

    doc.y = iy + 36;

    // ═══ TABLE ═══
    const cols = [
      { key: 'Product', w: 310, align: 'left' as const },
      { key: 'Qty', w: 50, align: 'center' as const },
      { key: 'Rate', w: 65, align: 'right' as const },
      { key: 'Amount', w: 65, align: 'right' as const },
    ];
    const tw = cols.reduce((s, c) => s + c.w, 0);
    const tx = PAGE.M + (CW - tw) / 2;

    // Table header
    dash(doc, doc.y);
    doc.moveDown(0.2);
    const thy = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
    let cx2 = tx;
    cols.forEach((c) => { doc.text(c.key, cx2, thy, { width: c.w, align: c.align }); cx2 += c.w; });
    doc.y = thy + 2;
    dash(doc, doc.y);
    doc.moveDown(0.3);

    // Table rows
    items.rows.forEach((item: any, idx: number) => {
      const ry = doc.y;
      const cells = [
        String(item.product_name),
        String(Number(item.quantity)),
        '₹' + Number(item.rate).toFixed(2),
        '₹' + Number(item.amount).toFixed(2),
      ];
      if (idx % 2 === 0) { doc.rect(tx, ry, tw, 14).fillColor('#f9f9f9').fill(); doc.fillColor('#000'); }
      doc.fontSize(8).font('Helvetica').fillColor('#333');
      cx2 = tx;
      cells.forEach((v, i) => { doc.text(v, cx2, ry + 2, { width: cols[i].w, align: cols[i].align }); cx2 += cols[i].w; });
      doc.y = ry + 14;
    });

    dash(doc, doc.y);
    doc.moveDown(0.4);

    // ═══ TOTALS ═══
    const totX = tx + tw * 0.55;
    const totW = tw * 0.45;

    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    doc.text('Subtotal', totX, doc.y, { width: totW - 60 });
    doc.text('₹' + Number(s.subtotal).toFixed(2), totX + totW - 60, doc.y, { width: 60, align: 'right' });
    doc.moveDown(0.5);

    if (Number(s.discount_amount) > 0) {
      doc.text('Discount', totX, doc.y, { width: totW - 60 });
      doc.text('-₹' + Number(s.discount_amount).toFixed(2), totX + totW - 60, doc.y, { width: 60, align: 'right' });
      doc.moveDown(0.5);
    }
    if (Number(s.gst_amount) > 0) {
      doc.text('GST', totX, doc.y, { width: totW - 60 });
      doc.text('₹' + Number(s.gst_amount).toFixed(2), totX + totW - 60, doc.y, { width: 60, align: 'right' });
      doc.moveDown(0.5);
    }
    if (Number(s.round_off) !== 0) {
      doc.text('Round Off', totX, doc.y, { width: totW - 60 });
      doc.text(Number(s.round_off).toFixed(2), totX + totW - 60, doc.y, { width: 60, align: 'right' });
      doc.moveDown(0.5);
    }

    dash(doc, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
    doc.text('Grand Total', totX, doc.y, { width: totW - 60 });
    doc.text('₹' + grandTotal.toFixed(2), totX + totW - 60, doc.y, { width: 60, align: 'right' });
    doc.moveDown(0.6);
    dash(doc, doc.y);
    doc.moveDown(0.4);

    // ═══ AMOUNT IN WORDS ═══
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
    doc.text('Amount in Words:', { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#555');
    doc.text(numberToWords(grandTotal), { align: 'center' });
    doc.moveDown(0.8);

    // ═══ PAYMENT & CASHIER ═══
    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    doc.text(`Payment Mode: ${(s.payment_mode || 'CASH').toUpperCase()}`, { align: 'center' });
    doc.text(`Cashier: ${s.user_name || '-'}`, { align: 'center' });
    doc.moveDown(0.5);

    // ═══ FOOTER ═══
    dash(doc, doc.y);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text(footerSettings['thank_you_message'] || 'Thank you! Visit again.', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(6.5).font('Helvetica').fillColor('#aaa');
    doc.text('This is a computer-generated invoice', { align: 'center' });

    // ═══ QR CODE (small, bottom-right) ═══
    const upiId = footerSettings['upi_id'] || 'store@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || ''))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`;
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 50, margin: 1, color: { dark: '#000', light: '#fff' } });
      doc.image(qrBuf, PAGE.W - PAGE.M - 30, doc.y - 28, { width: 28, height: 28 });
    } catch (_) { /* skip */ }

    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
