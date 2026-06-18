import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 595.28, H: 841.89, M: 40 };
const CW = PAGE.W - PAGE.M * 2;
const COL1 = PAGE.M;
const COL2 = PAGE.M + CW / 2;

function drawLine(doc: PDFKit.PDFDocument, y: number, x1 = PAGE.M, x2 = PAGE.W - PAGE.M) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#d0d0d0').lineWidth(0.5).stroke();
}

function drawHR(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor('#333').lineWidth(1).stroke();
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

    const totalQty = items.rows.reduce((sum: number, it: any) => sum + Number(it.quantity), 0);
    const grandTotal = Number(s.grand_total) || 0;

    // ═══════════════ HEADER ═══════════════
    drawHR(doc, doc.y);
    doc.moveDown(0.3);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text(String(c.company_name || 'STORE NAME'), { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#555');
    if (c.address) doc.text(String(c.address), { align: 'center' });
    const contactParts: string[] = [];
    if (c.mobile) contactParts.push(`Ph: ${c.mobile}`);
    if (c.email) contactParts.push(`Email: ${c.email}`);
    if (c.gst_number) contactParts.push(`GST: ${c.gst_number}`);
    if (contactParts.length) doc.text(contactParts.join(' | '), { align: 'center' });

    doc.fillColor('#000');
    drawHR(doc, doc.y + 4);

    // ═══════════════ TITLE ═══════════════
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text('TAX INVOICE', { align: 'center' });
    drawLine(doc, doc.y + 2);
    doc.moveDown(0.5);

    // ═══════════════ TWO-COLUMN INFO ═══════════════
    const infoY = doc.y;
    const leftInfo = [
      `Invoice No: ${s.bill_number || ''}`,
      `Date: ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`,
      `Time: ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`,
      `Cashier: ${s.user_name || ''}`,
    ];
    const rightInfo = [
      `Customer: ${s.customer_name || 'Walk-In Customer'}`,
      `Mobile: ${s.customer_mobile || '-'}`,
      `Address: ${s.customer_address || '-'}`,
      `GST: ${s.customer_gst || '-'}`,
    ];

    doc.fontSize(8.5).font('Helvetica').fillColor('#333');
    leftInfo.forEach((line, i) => {
      doc.text(line, PAGE.M, infoY + i * 11, { width: CW / 2 - 10 });
    });
    rightInfo.forEach((line, i) => {
      doc.text(line, PAGE.M + CW / 2 + 10, infoY + i * 11, { width: CW / 2 - 10 });
    });
    doc.y = infoY + leftInfo.length * 11 + 6;

    // ═══════════════ TABLE ═══════════════
    const colDefs = [
      { key: '#', w: 16, align: 'center' as const },
      { key: 'SKU / Barcode', w: 50, align: 'left' as const },
      { key: 'Product', w: 95, align: 'left' as const },
      { key: 'Cat', w: 35, align: 'left' as const },
      { key: 'Qty', w: 28, align: 'center' as const },
      { key: 'Unit Price', w: 48, align: 'right' as const },
      { key: 'Disc', w: 42, align: 'right' as const },
      { key: 'GST%', w: 30, align: 'center' as const },
      { key: 'Amount', w: 52, align: 'right' as const },
    ];
    const colKeys = ['#', 'sku', 'name', 'cat', 'qty', 'rate', 'disc', 'gst', 'amount'];
    const totalTableW = colDefs.reduce((s, c) => s + c.w, 0);
    let tableX = PAGE.M + (CW - totalTableW) / 2;

    // Table header background
    const headerH = 16;
    doc.rect(tableX, doc.y, totalTableW, headerH).fillColor('#1a1a2e').fill();
    doc.fillColor('#fff').fontSize(6.5).font('Helvetica-Bold');
    let cx = tableX;
    colDefs.forEach((col, i) => {
      doc.text(col.key, cx, doc.y + 4, { width: col.w, align: col.align });
      cx += col.w;
    });
    doc.y += headerH + 2;
    doc.fillColor('#000');

    // Table rows
    const rowH = 14;
    items.rows.forEach((item: any, idx: number) => {
      const y0 = doc.y;
      const cells = [
        String(idx + 1),
        String(item.barcode || item.product_id?.slice(0, 8) || '-'),
        String(item.product_name),
        String(item.category || '-'),
        Number(item.quantity) + ' ' + item.unit,
        '₹' + Number(item.rate).toFixed(2),
        Number(item.discount_amount) > 0 ? '₹' + Number(item.discount_amount).toFixed(2) : '-',
        Number(item.gst_percentage) > 0 ? Number(item.gst_percentage) + '%' : '-',
        '₹' + Number(item.amount).toFixed(2),
      ];

      // Alternating row background
      if (idx % 2 === 0) {
        doc.rect(tableX, y0, totalTableW, rowH).fillColor('#f8f8f8').fill();
        doc.fillColor('#000');
      }

      cx = tableX;
      cells.forEach((val, i) => {
        doc.fontSize(6.5).font('Helvetica').text(val, cx, y0 + 3, { width: colDefs[i].w, align: colDefs[i].align });
        cx += colDefs[i].w;
      });
      doc.y = y0 + rowH;
    });

    // Table bottom border
    drawHR(doc, doc.y + 2);
    doc.moveDown(0.3);

    // ═══════════════ SUMMARY ═══════════════
    const summaryX = PAGE.M + CW / 2 + 10;
    const summaryW = CW / 2 - 10;
    const summaryLeftX = PAGE.M;
    const summaryLeftW = CW / 2 - 10;

    // Left side: amount in words + total items
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.text(`Total Items: ${items.rows.length}  |  Total Quantity: ${totalQty}`, summaryLeftX, doc.y, { width: summaryLeftW });
    doc.moveDown(0.3);
    doc.fontSize(7.5).font('Helvetica').fillColor('#555');
    doc.text('Amount in Words:', summaryLeftX, doc.y, { width: summaryLeftW });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text(numberToWords(grandTotal), summaryLeftX, doc.y, { width: summaryLeftW });
    doc.moveDown(0.5);

    // Right side: totals
    const summaryLines = [
      { label: 'Subtotal', value: '₹' + Number(s.subtotal).toFixed(2) },
    ];
    if (Number(s.discount_amount) > 0) {
      summaryLines.push({ label: 'Total Discount', value: '-₹' + Number(s.discount_amount).toFixed(2) });
    }
    if (Number(s.gst_amount) > 0) {
      summaryLines.push({ label: 'Total GST', value: '₹' + Number(s.gst_amount).toFixed(2) });
    }
    if (Number(s.round_off) !== 0) {
      summaryLines.push({ label: 'Round Off', value: Number(s.round_off).toFixed(2) });
    }
    summaryLines.push({ label: '', value: '' });
    summaryLines.push({ label: 'Grand Total', value: '₹' + grandTotal.toFixed(2) });

    const summaryY = doc.y - (summaryLines.length + 1) * 13;

    doc.fontSize(8).font('Helvetica').fillColor('#333');
    summaryLines.forEach((line, i) => {
      const y = summaryY + i * 13;
      if (i === summaryLines.length - 1) {
        doc.rect(summaryX - 4, y - 2, summaryW + 8, 16).fillColor('#1a1a2e').fill();
        doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
        doc.text(line.label, summaryX, y + 1, { width: summaryW - 55, align: 'left' });
        doc.text(line.value, summaryX + summaryW - 55, y + 1, { width: 55, align: 'right' });
        doc.fillColor('#000');
      } else if (line.label) {
        doc.fontSize(8).font('Helvetica').fillColor('#333');
        doc.text(line.label, summaryX, y, { width: summaryW - 55, align: 'left' });
        doc.text(line.value, summaryX + summaryW - 55, y, { width: 55, align: 'right' });
      }
    });

    doc.y = Math.max(doc.y, summaryY + (summaryLines.length + 1) * 13 + 4);
    drawLine(doc, doc.y);

    // ═══════════════ PAYMENT & QR ═══════════════
    doc.moveDown(0.5);
    const payY = doc.y;

    // Payment details (left)
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a1a2e').text('Payment Details', PAGE.M, payY);
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.text(`Method: ${(s.payment_mode || 'CASH').toUpperCase()}`, PAGE.M, payY + 11);
    doc.text(`Amount Paid: ₹${grandTotal.toFixed(2)}`, PAGE.M, payY + 22);
    doc.text(`Balance Due: ₹0.00`, PAGE.M, payY + 33);

    // QR Code (right)
    const upiId = footerSettings['upi_id'] || 'store@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || 'Store'))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`;
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 120, margin: 1, color: { dark: '#1a1a2e', light: '#fff' } });
      doc.image(qrBuf, PAGE.W - PAGE.M - 130, payY, { width: 65, height: 65 });
      doc.fontSize(6).font('Helvetica').fillColor('#555');
      doc.text('Scan to Pay (UPI)', PAGE.W - PAGE.M - 130, payY + 67, { width: 65, align: 'center' });
    } catch (_) { /* QR failed — skip */ }
    doc.fillColor('#000');
    doc.y = Math.max(doc.y, payY + 85);

    // ═══════════════ SIGNATURES ═══════════════
    drawLine(doc, doc.y + 2);
    doc.moveDown(0.5);
    drawHR(doc, doc.y);

    const signY = doc.y + 6;
    const third = CW / 3;

    doc.fontSize(8).font('Helvetica').fillColor('#555');
    doc.text('Authorized Signature', PAGE.M, signY, { width: third, align: 'center' });
    doc.text('Customer Signature', PAGE.M + third, signY, { width: third, align: 'center' });
    doc.text('Store Seal', PAGE.M + third * 2, signY, { width: third, align: 'center' });
    doc.y = signY + 20;

    // ═══════════════ FOOTER ═══════════════
    drawHR(doc, doc.y + 2);
    doc.moveDown(0.5);

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text('Return Policy | Terms & Conditions', { align: 'center' });
    doc.fontSize(6.5).font('Helvetica').fillColor('#555');
    doc.text(footerSettings['return_policy'] || 'No returns accepted after 7 days.', { align: 'center' });
    doc.text(footerSettings['terms_conditions'] || 'Goods once sold will not be taken back.', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text(footerSettings['thank_you_message'] || 'Thank you for your business! Visit again.', { align: 'center' });

    doc.fontSize(6).font('Helvetica').fillColor('#aaa');
    doc.text('This is a computer-generated invoice', { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
