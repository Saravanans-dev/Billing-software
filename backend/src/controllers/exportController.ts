import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 595.28, H: 841.89, M: 35 };
const CW = PAGE.W - PAGE.M * 2;

function drawLine(doc: PDFKit.PDFDocument, y: number, x1 = PAGE.M, x2 = PAGE.W - PAGE.M, color = '#ddd') {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();
}

function drawHR(doc: PDFKit.PDFDocument, y: number, color = '#1a1a2e') {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor(color).lineWidth(1.2).stroke();
}

function filledBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fillColor(color).fill();
  doc.fillColor('#000');
}

function borderedText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number, h: number, borderColor: string, txtColor: string, fontSize: number, align: 'left' | 'center' | 'right' = 'center') {
  doc.rect(x, y, w, h).lineWidth(0.7).strokeColor(borderColor).stroke();
  doc.fillColor(txtColor).fontSize(fontSize).font('Helvetica').text(text, x, y + (h - fontSize) / 2, { width: w, align });
  doc.fillColor('#000');
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

    // ════════════════════ HEADER ════════════════════
    const topY = doc.y;
    // Top accent bar
    filledBox(doc, PAGE.M, topY, CW, 4, '#1a1a2e');
    doc.y = topY + 12;

    // Store name
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a2e').text(String(c.company_name || 'STORE NAME'), { align: 'center' });
    doc.moveDown(0.15);

    // Address + contact
    doc.fontSize(8).font('Helvetica').fillColor('#666');
    const addr = [c.address, `Ph: ${c.mobile || '-'}`, `Email: ${c.email || '-'}`].filter(Boolean).join('  |  ');
    if (addr) doc.text(addr, { align: 'center' });
    if (c.gst_number) doc.text(`GSTIN: ${c.gst_number}`, { align: 'center' });
    doc.moveDown(0.5);

    // Invoice title in bordered box
    const titleW = 160;
    const titleX = PAGE.M + (CW - titleW) / 2;
    borderedText(doc, 'TAX INVOICE', titleX, doc.y, titleW, 22, '#1a1a2e', '#1a1a2e', 11, 'center');
    doc.y = doc.y + 30;

    // ════════════════════ INFO CARDS ════════════════════
    // Invoice details (left card)
    const cardW = (CW - 10) / 2;
    const cardH = 50;
    const cardY = doc.y;

    // Left card
    doc.rect(PAGE.M, cardY, cardW, cardH).lineWidth(0.5).strokeColor('#ddd').stroke();
    doc.rect(PAGE.M, cardY, cardW, 14).fillColor('#f0f2f5').fill();
    doc.fillColor('#1a1a2e').fontSize(7).font('Helvetica-Bold').text('INVOICE', PAGE.M + 4, cardY + 3, { width: cardW - 8 });
    doc.fillColor('#333').fontSize(7.5).font('Helvetica');
    doc.text(`No: ${s.bill_number || ''}`, PAGE.M + 4, cardY + 18, { width: cardW - 8 });
    doc.text(`Date: ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`, PAGE.M + 4, cardY + 29, { width: cardW - 8 });
    doc.text(`Time: ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`, PAGE.M + 4, cardY + 40, { width: cardW - 8 });

    // Right card
    const rightCardX = PAGE.M + cardW + 10;
    doc.rect(rightCardX, cardY, cardW, cardH).lineWidth(0.5).strokeColor('#ddd').stroke();
    doc.rect(rightCardX, cardY, cardW, 14).fillColor('#f0f2f5').fill();
    doc.fillColor('#1a1a2e').fontSize(7).font('Helvetica-Bold').text('CASHIER', rightCardX + 4, cardY + 3, { width: cardW - 8 });
    doc.fillColor('#333').fontSize(7.5).font('Helvetica');
    doc.text(`Name: ${s.user_name || '-'}`, rightCardX + 4, cardY + 18, { width: cardW - 8 });
    doc.text(`Payment: ${(s.payment_mode || 'CASH').toUpperCase()}`, rightCardX + 4, cardY + 29, { width: cardW - 8 });
    doc.text(`Items: ${items.rows.length} (Qty: ${totalQty})`, rightCardX + 4, cardY + 40, { width: cardW - 8 });

    doc.y = cardY + cardH + 14;

    // Customer card
    const custCardH = 45;
    const custCardY = doc.y;
    doc.rect(PAGE.M, custCardY, CW, custCardH).lineWidth(0.5).strokeColor('#ddd').stroke();
    doc.rect(PAGE.M, custCardY, CW, 14).fillColor('#f0f2f5').fill();
    doc.fillColor('#1a1a2e').fontSize(7).font('Helvetica-Bold').text('BILL TO', PAGE.M + 4, custCardY + 3, { width: CW - 8 });
    doc.fillColor('#333').fontSize(7.5).font('Helvetica');
    doc.text(`Name: ${s.customer_name || 'Walk-In Customer'}`, PAGE.M + 4, custCardY + 18, { width: CW / 2 - 8 });
    doc.text(`Mobile: ${s.customer_mobile || '-'}`, PAGE.M + 4, custCardY + 29, { width: CW / 2 - 8 });
    doc.text(`Address: ${s.customer_address || '-'}`, PAGE.M + 4 + CW / 2, custCardY + 18, { width: CW / 2 - 8 });
    doc.text(`GST: ${s.customer_gst || '-'}`, PAGE.M + 4 + CW / 2, custCardY + 29, { width: CW / 2 - 8 });

    doc.y = custCardY + custCardH + 16;

    // ════════════════════ TABLE ════════════════════
    const colDefs = [
      { key: '#', w: 18, align: 'center' as const },
      { key: 'Product', w: 130, align: 'left' as const },
      { key: 'SKU / Barcode', w: 56, align: 'left' as const },
      { key: 'Qty', w: 30, align: 'center' as const },
      { key: 'Rate', w: 48, align: 'right' as const },
      { key: 'Disc', w: 42, align: 'right' as const },
      { key: 'GST%', w: 30, align: 'center' as const },
      { key: 'GST Amt', w: 48, align: 'right' as const },
      { key: 'Total', w: 55, align: 'right' as const },
    ];
    const totalTableW = colDefs.reduce((s, c) => s + c.w, 0);
    let tableX = PAGE.M + (CW - totalTableW) / 2;

    // Table header
    const headerH = 18;
    filledBox(doc, tableX, doc.y, totalTableW, headerH, '#1a1a2e');
    doc.fillColor('#fff').fontSize(7).font('Helvetica-Bold');
    let cx = tableX;
    colDefs.forEach((col) => {
      doc.text(col.key, cx, doc.y + 5, { width: col.w, align: col.align });
      cx += col.w;
    });
    doc.y += headerH + 2;
    doc.fillColor('#000');

    // Table rows
    const rowH = 16;
    items.rows.forEach((item: any, idx: number) => {
      const y0 = doc.y;
      const gstAmt = Number(item.gst_amount) || 0;
      const cells = [
        String(idx + 1),
        String(item.product_name),
        String(item.barcode || item.product_id?.slice(0, 8) || '-'),
        Number(item.quantity) + ' ' + item.unit,
        '₹' + Number(item.rate).toFixed(2),
        Number(item.discount_amount) > 0 ? '₹' + Number(item.discount_amount).toFixed(2) : '-',
        Number(item.gst_percentage) > 0 ? Number(item.gst_percentage) + '%' : '-',
        gstAmt > 0 ? '₹' + gstAmt.toFixed(2) : '-',
        '₹' + Number(item.amount).toFixed(2),
      ];

      if (idx % 2 === 0) {
        doc.rect(tableX, y0, totalTableW, rowH).fillColor('#fafafa').fill();
        doc.fillColor('#000');
      }

      cx = tableX;
      cells.forEach((val, i) => {
        doc.fontSize(7).font('Helvetica').text(val, cx, y0 + 4, { width: colDefs[i].w, align: colDefs[i].align });
        cx += colDefs[i].w;
      });
      doc.y = y0 + rowH;
    });

    drawHR(doc, doc.y + 2);
    doc.moveDown(0.4);

    // ════════════════════ SUMMARY ════════════════════
    const sumW = Math.min(280, CW);
    const sumX = PAGE.M + (CW - sumW) / 2;

    const summaryLines = [
      { label: 'Subtotal', value: '₹' + Number(s.subtotal).toFixed(2) },
    ];
    if (Number(s.discount_amount) > 0)
      summaryLines.push({ label: 'Total Discount', value: '-₹' + Number(s.discount_amount).toFixed(2) });
    if (Number(s.gst_amount) > 0)
      summaryLines.push({ label: 'Total GST', value: '₹' + Number(s.gst_amount).toFixed(2) });
    if (Number(s.round_off) !== 0)
      summaryLines.push({ label: 'Round Off', value: Number(s.round_off).toFixed(2) });

    const sumBoxH = summaryLines.length * 15 + 28;
    const sumY = doc.y;

    doc.rect(sumX, sumY, sumW, sumBoxH).lineWidth(0.5).strokeColor('#1a1a2e').stroke();

    // Grand total always last
    const gtY = sumY + sumBoxH - 22;
    filledBox(doc, sumX + 1, gtY, sumW - 2, 20, '#1a1a2e');
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
    doc.text('Grand Total', sumX + 10, gtY + 5, { width: sumW - 100 });
    doc.text('₹' + grandTotal.toFixed(2), sumX + sumW - 90, gtY + 5, { width: 80, align: 'right' });
    doc.fillColor('#000');

    summaryLines.forEach((line, i) => {
      const y = sumY + 6 + i * 15;
      doc.fontSize(8).font('Helvetica').fillColor('#333');
      doc.text(line.label, sumX + 10, y, { width: sumW - 100 });
      doc.text(line.value, sumX + sumW - 90, y, { width: 80, align: 'right' });
    });

    doc.y = sumY + sumBoxH + 8;

    // ════════════════════ AMOUNT IN WORDS ════════════════════
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text('Amount in Words:', { align: 'center' });
    doc.fontSize(7.5).font('Helvetica').fillColor('#555');
    doc.text(numberToWords(grandTotal), { align: 'center' });
    doc.moveDown(0.5);
    drawLine(doc, doc.y);

    // ════════════════════ PAYMENT & QR ════════════════════
    doc.moveDown(0.5);
    const payY = doc.y;
    const halfW = (CW - 20) / 2;

    // Payment left
    doc.rect(PAGE.M, payY, halfW, 70).lineWidth(0.4).strokeColor('#ddd').stroke();
    doc.rect(PAGE.M, payY, halfW, 14).fillColor('#f0f2f5').fill();
    doc.fillColor('#1a1a2e').fontSize(7).font('Helvetica-Bold').text('PAYMENT', PAGE.M + 4, payY + 3, { width: halfW - 8 });
    doc.fillColor('#333').fontSize(7.5).font('Helvetica');
    doc.text(`Method: ${(s.payment_mode || 'CASH').toUpperCase()}`, PAGE.M + 6, payY + 18, { width: halfW - 12 });
    doc.text(`Amount Paid: ₹${grandTotal.toFixed(2)}`, PAGE.M + 6, payY + 29, { width: halfW - 12 });
    doc.text(`Balance Due: ₹0.00`, PAGE.M + 6, payY + 40, { width: halfW - 12 });
    doc.text(`Items Count: ${items.rows.length}`, PAGE.M + 6, payY + 51, { width: halfW - 12 });

    // QR right
    const qrX = PAGE.M + halfW + 20;
    const qrW = CW - halfW - 20;
    const upiId = footerSettings['upi_id'] || 'store@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || 'Store'))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`;
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 100, margin: 1, color: { dark: '#1a1a2e', light: '#fff' } });
      doc.rect(qrX, payY, qrW, 70).lineWidth(0.4).strokeColor('#ddd').stroke();
      const qrImgSize = 50;
      const qrImgX = qrX + (qrW - qrImgSize) / 2;
      doc.image(qrBuf, qrImgX, payY + 10, { width: qrImgSize, height: qrImgSize });
      doc.fontSize(6).font('Helvetica').fillColor('#555');
      doc.text('Scan to Pay (UPI)', qrX, payY + 63, { width: qrW, align: 'center' });
    } catch (_) { /* skip QR */ }

    doc.fillColor('#000');
    doc.y = payY + 78;

    // ════════════════════ SIGNATURES ════════════════════
    drawHR(doc, doc.y + 2);
    doc.moveDown(0.8);
    const signY = doc.y;
    const third = Math.min(150, (CW - 20) / 3);
    const totalSignW = third * 3 + 20;
    const signStartX = PAGE.M + (CW - totalSignW) / 2;

    doc.fontSize(7).font('Helvetica').fillColor('#888');
    const sigLabels = ['Authorized Signature', 'Customer Signature', 'Store Seal'];
    sigLabels.forEach((label, i) => {
      const sx = signStartX + i * (third + 10);
      doc.text(label, sx, signY, { width: third, align: 'center' });
    });
    doc.y = signY + 20;

    // ════════════════════ FOOTER ════════════════════
    drawHR(doc, doc.y + 4);
    doc.moveDown(0.6);

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text('RETURN POLICY  |  TERMS & CONDITIONS', { align: 'center' });
    doc.moveDown(0.15);
    doc.fontSize(6.5).font('Helvetica').fillColor('#666');
    doc.text(footerSettings['return_policy'] || 'No returns accepted after 7 days.', { align: 'center' });
    doc.text(footerSettings['terms_conditions'] || 'Goods once sold will not be taken back.', { align: 'center' });
    doc.moveDown(0.4);

    // Thank you with decorative line
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e');
    doc.text(footerSettings['thank_you_message'] || 'Thank you for your business! Visit again.', { align: 'center' });

    doc.moveDown(0.2);
    doc.fontSize(6).font('Helvetica').fillColor('#aaa');
    doc.text('—  This is a computer-generated invoice  —', { align: 'center' });

    // Bottom accent bar
    filledBox(doc, PAGE.M, doc.y + 6, CW, 3, '#1a1a2e');

    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
