import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 595.28, H: 841.89, M: 30 };
const CW = PAGE.W - PAGE.M * 2;

function drawLine(doc: PDFKit.PDFDocument, y: number, x1 = PAGE.M, x2 = PAGE.W - PAGE.M, color = '#ccc') {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();
}

function drawHR(doc: PDFKit.PDFDocument, y: number, color = '#1a237e') {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor(color).lineWidth(1.5).stroke();
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
    const navy = '#1a237e';
    const gray = '#888';

    // ════════════════════ HEADER ════════════════════
    doc.fontSize(26).font('Helvetica-Bold').fillColor(navy).text(String(c.company_name || 'STUDENT XEROX'), { align: 'center' });
    drawHR(doc, doc.y + 2, navy);
    doc.moveDown(0.2);

    doc.fontSize(8).font('Helvetica').fillColor(gray);
    const addr = [c.address, c.mobile ? `Ph: ${c.mobile}` : '', c.email ? `Email: ${c.email}` : ''].filter(Boolean).join('  |  ');
    if (addr) doc.text(addr, { align: 'center' });
    if (c.gst_number) doc.text(`GSTIN: ${c.gst_number}`, { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(navy);
    doc.text('TAX INVOICE', { align: 'center' });
    doc.moveDown(0.15);

    // ════════════════════ INFO SECTION ════════════════════
    drawLine(doc, doc.y);
    doc.moveDown(0.3);

    const infoFont = (size: number) => doc.fontSize(size).font('Helvetica').fillColor('#333');
    // Bill details - left
    const infoY = doc.y;
    infoFont(8);
    doc.text(`Invoice No: ${s.bill_number || ''}`, PAGE.M, infoY, { width: CW * 0.45 });
    doc.text(`Date: ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`, PAGE.M, infoY + 10, { width: CW * 0.45 });
    doc.text(`Time: ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`, PAGE.M, infoY + 20, { width: CW * 0.45 });

    // Customer details - right
    const cx = PAGE.M + CW * 0.55;
    doc.text(`Customer: ${s.customer_name || 'Walk-In'}`, cx, infoY, { width: CW * 0.45 });
    doc.text(`Mobile: ${s.customer_mobile || '-'}`, cx, infoY + 10, { width: CW * 0.45 });
    doc.text(`Address: ${s.customer_address || '-'}`, cx, infoY + 20, { width: CW * 0.45 });

    doc.y = infoY + 34;

    // ════════════════════ TABLE ════════════════════
    drawLine(doc, doc.y);
    doc.moveDown(0.2);

    const colDefs = [
      { key: '#', w: 20, align: 'center' as const },
      { key: 'Particulars', w: 145, align: 'left' as const },
      { key: 'Qty', w: 40, align: 'center' as const },
      { key: 'Rate', w: 55, align: 'right' as const },
      { key: 'Disc', w: 45, align: 'right' as const },
      { key: 'GST', w: 45, align: 'center' as const },
      { key: 'Amount', w: 55, align: 'right' as const },
    ];
    const totalW = colDefs.reduce((s, c) => s + c.w, 0);
    let tbX = PAGE.M + (CW - totalW) / 2;

    // Table header
    doc.rect(tbX, doc.y, totalW, 16).fillColor(navy).fill();
    doc.fillColor('#fff').fontSize(7.5).font('Helvetica-Bold');
    let hx = tbX;
    colDefs.forEach((col) => { doc.text(col.key, hx, doc.y + 4, { width: col.w, align: col.align }); hx += col.w; });
    doc.y += 18;
    doc.fillColor('#000');

    // Table rows
    const rowH = 14;
    items.rows.forEach((item: any, idx: number) => {
      const y0 = doc.y;
      const cells = [
        String(idx + 1),
        String(item.product_name),
        `${Number(item.quantity)} ${item.unit}`,
        '₹' + Number(item.rate).toFixed(2),
        Number(item.discount_amount) > 0 ? '₹' + Number(item.discount_amount).toFixed(2) : '-',
        Number(item.gst_percentage) > 0 ? Number(item.gst_percentage) + '%' : '-',
        '₹' + Number(item.amount).toFixed(2),
      ];
      if (idx % 2 === 0) { doc.rect(tbX, y0, totalW, rowH).fillColor('#f5f5f5').fill(); doc.fillColor('#000'); }
      hx = tbX;
      cells.forEach((val, i) => {
        doc.fontSize(7).font('Helvetica').text(val, hx, y0 + 3, { width: colDefs[i].w, align: colDefs[i].align });
        hx += colDefs[i].w;
      });
      doc.y = y0 + rowH;
    });

    // Bottom line
    doc.rect(tbX, doc.y, totalW, 0.5).fillColor(navy).fill();
    doc.fillColor('#000');
    doc.moveDown(0.3);

    // ════════════════════ SUMMARY & TOTALS ════════════════════
    const sumW = Math.min(260, CW);
    const sumX = PAGE.M + (CW - sumW) / 2;

    const sumLines: { label: string; value: string }[] = [];
    sumLines.push({ label: 'Subtotal', value: '₹' + Number(s.subtotal).toFixed(2) });
    if (Number(s.discount_amount) > 0) sumLines.push({ label: 'Discount', value: '-₹' + Number(s.discount_amount).toFixed(2) });
    if (Number(s.gst_amount) > 0) sumLines.push({ label: 'GST', value: '₹' + Number(s.gst_amount).toFixed(2) });
    if (Number(s.round_off) !== 0) sumLines.push({ label: 'Round Off', value: Number(s.round_off).toFixed(2) });

    // Summary as bordered box with GT highlighted
    let sy = doc.y;
    doc.rect(sumX, sy, sumW, sumLines.length * 14 + 24).lineWidth(0.5).strokeColor(navy).stroke();
    sumLines.forEach((ln, i) => {
      doc.fontSize(8).font('Helvetica').fillColor('#333');
      doc.text(ln.label, sumX + 8, sy + 5 + i * 14, { width: sumW - 100 });
      doc.text(ln.value, sumX + sumW - 90, sy + 5 + i * 14, { width: 82, align: 'right' });
    });
    const gtY = sy + sumLines.length * 14 + 2;
    doc.rect(sumX + 1, gtY, sumW - 2, 20).fillColor(navy).fill();
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold');
    doc.text('Grand Total', sumX + 8, gtY + 5, { width: sumW - 100 });
    doc.text('₹' + grandTotal.toFixed(2), sumX + sumW - 90, gtY + 5, { width: 82, align: 'right' });
    doc.fillColor('#000');
    doc.y = gtY + 24;

    // ════════════════════ AMOUNT IN WORDS ════════════════════
    drawLine(doc, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(navy);
    doc.text('Amount in Words:', { align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.text(numberToWords(grandTotal), { align: 'center' });
    doc.moveDown(0.3);
    drawLine(doc, doc.y);
    doc.moveDown(0.3);

    // ════════════════════ QR CODE ════════════════════
    const upiId = footerSettings['upi_id'] || 'store@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || 'Student Xerox'))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`;
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 80, margin: 1, color: { dark: navy, light: '#fff' } });
      const qrImgSize = 55;
      const qrX = sumX + (sumW - qrImgSize) / 2;
      doc.image(qrBuf, qrX, doc.y, { width: qrImgSize, height: qrImgSize });
      doc.y += qrImgSize + 2;
      doc.fontSize(6).font('Helvetica').fillColor(gray);
      doc.text('Scan to Pay (UPI)', { align: 'center' });
      doc.moveDown(0.15);
      doc.fontSize(5.5).font('Helvetica').fillColor('#aaa');
      doc.text(upiId, { align: 'center' });
    } catch (_) { /* skip */ }
    doc.fillColor('#000');
    doc.moveDown(0.3);
    drawLine(doc, doc.y);
    doc.moveDown(0.3);

    // ════════════════════ PAYMENT INFO ════════════════════
    doc.fontSize(8).font('Helvetica').fillColor('#333');
    doc.text(`Payment Mode: ${(s.payment_mode || 'CASH').toUpperCase()}  |  Items: ${items.rows.length}  |  Qty: ${totalQty}`, { align: 'center' });
    doc.text(`Cashier: ${s.user_name || '-'}`, { align: 'center' });
    doc.moveDown(0.3);
    drawHR(doc, doc.y, navy);
    doc.moveDown(0.5);

    // ════════════════════ SIGNATURES ════════════════════
    const signY = doc.y;
    const signColW = 150;
    const signColsX = PAGE.M + (CW - signColW * 3 - 20) / 2;
    ['Authorized Signature', 'Customer Signature', 'Store Seal'].forEach((label, i) => {
      const sx = signColsX + i * (signColW + 10);
      doc.fontSize(7).font('Helvetica').fillColor(gray);
      doc.text(label, sx, signY, { width: signColW, align: 'center' });
    });
    doc.y = signY + 18;

    // ════════════════════ FOOTER ════════════════════
    drawLine(doc, doc.y + 2);
    doc.moveDown(0.4);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(navy);
    doc.text('TERMS & CONDITIONS', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(6.5).font('Helvetica').fillColor(gray);
    doc.text(footerSettings['terms_conditions'] || 'Goods once sold will not be taken back.', { align: 'center' });
    doc.text(footerSettings['return_policy'] || 'No returns after 7 days.', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(navy);
    doc.text(footerSettings['thank_you_message'] || 'Thank you! Visit again.', { align: 'center' });
    doc.moveDown(0.1);
    doc.fontSize(6).font('Helvetica').fillColor('#aaa');
    doc.text('— This is a computer-generated invoice —', { align: 'center' });
    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
