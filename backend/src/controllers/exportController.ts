import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 595.28, H: 841.89, M: 22 };
const CW = PAGE.W - PAGE.M * 2;
const C1 = '#1e3a5f';
const C2 = '#2d6a9f';
const BG = '#f8fafc';
const BD = '#d1d9e6';
const TX = '#1a202c';
const TXM = '#64748b';

function drawLine(doc: PDFKit.PDFDocument, y: number, x1 = PAGE.M, x2 = PAGE.W - PAGE.M, color = BD) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();
}

function borderedBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, lineW = 0.5) {
  doc.rect(x, y, w, h).lineWidth(lineW).strokeColor(BD).stroke();
}

function filledBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.rect(x, y, w, h).fillColor(color).fill();
  doc.fillColor('#000');
}

function sectionBox(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  borderedBox(doc, x, y, w, h);
  filledBox(doc, x + 1, y + 1, w - 2, 14, BG);
  drawLine(doc, y + 15, x + 1, x + w - 1);
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
    const storeName = String(c.company_name || 'STUDENT XEROX').toUpperCase();

    // ════════════════════ HEADER SECTION ════════════════════
    // Left: Company info
    const hLeftW = CW * 0.58;
    const hRightW = CW * 0.38;
    const hY = doc.y;

    // --- LEFT: Logo + Company ---
    // Logo circle
    const logoSize = 42;
    const logoX = PAGE.M;
    const logoY = hY + 2;
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).fillColor(C1).fill();
    doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold');
    doc.text('SX', logoX + (logoSize - 20) / 2, logoY + 13, { width: 20, align: 'center' });
    doc.fillColor('#000');

    // Company name
    const nameX = logoX + logoSize + 10;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(C1);
    doc.text(storeName, nameX, hY, { width: hLeftW - logoSize - 10 });

    // Tagline / address
    const addrY = doc.y + 2;
    doc.fontSize(7).font('Helvetica').fillColor(TXM);
    const lines: string[] = [];
    if (c.address) lines.push(c.address);
    if (c.mobile) lines.push(`Phone: ${c.mobile}`);
    if (c.email) lines.push(`Email: ${c.email}`);
    if (c.gst_number) lines.push(`GSTIN: ${c.gst_number}`);
    lines.forEach((ln, i) => doc.text(ln, nameX, addrY + i * 10, { width: hLeftW - logoSize - 10 }));

    const leftBottom = addrY + lines.length * 10 + 4;

    // --- RIGHT: Invoice Details Box ---
    const invBoxX = PAGE.M + CW - hRightW;
    const invBoxY = hY;
    const invBoxH = 60;
    const invHeaderH = 16;

    // Box border
    borderedBox(doc, invBoxX, invBoxY, hRightW, invBoxH);
    // Header
    filledBox(doc, invBoxX + 1, invBoxY + 1, hRightW - 2, invHeaderH - 2, C1);
    doc.fillColor('#fff').fontSize(7).font('Helvetica-Bold');
    doc.text('INVOICE', invBoxX, invBoxY + 3, { width: hRightW, align: 'center' });
    doc.fillColor(TX).fontSize(7.5).font('Helvetica');

    const invInfoY = invBoxY + invHeaderH + 4;
    doc.text(`Invoice No   :  ${s.bill_number || ''}`, invBoxX + 8, invInfoY);
    doc.text(`Date              :  ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`, invBoxX + 8, invInfoY + 12);
    doc.text(`Time              :  ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`, invBoxX + 8, invInfoY + 24);
    doc.fillColor('#000');

    doc.y = Math.max(leftBottom, invBoxY + invBoxH + 6);

    // ════════════════════ CUSTOMER SECTION ════════════════════
    const custH = 44;
    const custY = doc.y;
    sectionBox(doc, PAGE.M, custY, CW, custH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('BILL TO', PAGE.M + 6, custY + 3);
    doc.fontSize(7.5).font('Helvetica').fillColor(TX);
    const custName = s.customer_name || 'Walk-In Customer';
    doc.text(`Name     :  ${custName}`, PAGE.M + 6, custY + 18);
    doc.text(`Mobile    :  ${s.customer_mobile || '-'}`, PAGE.M + 6, custY + 29);
    doc.text(`Address :  ${s.customer_address || '-'}`, PAGE.M + CW / 2 + 6, custY + 18);
    doc.text(`GST        :  ${s.customer_gst || '-'}`, PAGE.M + CW / 2 + 6, custY + 29);
    doc.y = custY + custH + 10;

    // ════════════════════ PRODUCT TABLE ════════════════════
    const cols = [
      { key: '#', w: 20, align: 'center' as const },
      { key: 'Product', w: 220, align: 'left' as const },
      { key: 'Qty', w: 30, align: 'center' as const },
      { key: 'Unit', w: 34, align: 'center' as const },
      { key: 'Rate', w: 52, align: 'right' as const },
      { key: 'Disc', w: 48, align: 'right' as const },
      { key: 'GST', w: 44, align: 'center' as const },
      { key: 'Amount', w: 53, align: 'right' as const },
    ];
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const tbX = PAGE.M + (CW - tableW) / 2;

    // Table header
    const thH = 17;
    filledBox(doc, tbX, doc.y, tableW, thH, C1);
    doc.fillColor('#fff').fontSize(6.5).font('Helvetica-Bold');
    let cx = tbX;
    cols.forEach((col) => {
      doc.text(col.key, cx, doc.y + 4.5, { width: col.w, align: col.align });
      cx += col.w;
    });
    doc.y += thH + 1;
    doc.fillColor(TX);

    // Table rows
    const rowH = 15;
    items.rows.forEach((item: any, idx: number) => {
      const y0 = doc.y;
      const gstPct = Number(item.gst_percentage) || 0;
      const disc = Number(item.discount_amount) || 0;
      const cells = [
        String(idx + 1),
        String(item.product_name),
        String(Number(item.quantity)),
        String(item.unit || 'Nos'),
        '₹' + Number(item.rate).toFixed(2),
        disc > 0 ? '₹' + disc.toFixed(2) : '-',
        gstPct > 0 ? gstPct + '%' : '-',
        '₹' + Number(item.amount).toFixed(2),
      ];
      if (idx % 2 === 0) { doc.rect(tbX, y0, tableW, rowH).fillColor('#f1f5f9').fill(); doc.fillColor(TX); }
      cx = tbX;
      cells.forEach((val, i) => {
        doc.fontSize(6.5).font('Helvetica').text(val, cx, y0 + 4, { width: cols[i].w, align: cols[i].align });
        cx += cols[i].w;
      });
      doc.y = y0 + rowH;
    });

    // Bottom border
    drawLine(doc, doc.y);
    doc.y += 3;

    // ════════════════════ SUMMARY TWO-COLUMN ════════════════════
    // Left: Amount in Words
    const sumW = CW * 0.47;
    const sumH = 68;

    const amtY = doc.y;
    const amtX = PAGE.M;

    sectionBox(doc, amtX, amtY, sumW, sumH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('AMOUNT IN WORDS', amtX + 6, amtY + 3);
    doc.fontSize(7.5).font('Helvetica').fillColor(TX);
    doc.text(numberToWords(grandTotal), amtX + 6, amtY + 20, { width: sumW - 12 });
    doc.fillColor('#000');

    // Right: Summary
    const sumX = PAGE.M + CW - sumW;
    sectionBox(doc, sumX, amtY, sumW, sumH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('SUMMARY', sumX + 6, amtY + 3);

    const sumItems: { label: string; value: string }[] = [
      { label: 'Subtotal', value: '₹' + Number(s.subtotal).toFixed(2) },
    ];
    if (Number(s.discount_amount) > 0) sumItems.push({ label: 'Discount', value: '-₹' + Number(s.discount_amount).toFixed(2) });
    if (Number(s.gst_amount) > 0) sumItems.push({ label: 'GST', value: '₹' + Number(s.gst_amount).toFixed(2) });
    if (Number(s.round_off) !== 0) sumItems.push({ label: 'Round Off', value: Number(s.round_off).toFixed(2) });

    const siStartY = amtY + 17;
    doc.fontSize(7.5).font('Helvetica').fillColor(TX);
    sumItems.forEach((si, i) => {
      doc.text(si.label, sumX + 6, siStartY + i * 13);
      doc.text(si.value, sumX + sumW - 56, siStartY + i * 13, { width: 50, align: 'right' });
    });

    // Grand Total
    const gtY2 = amtY + sumH - 21;
    filledBox(doc, sumX + 1, gtY2, sumW - 2, 19, C1);
    doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold');
    doc.text('Grand Total', sumX + 6, gtY2 + 4.5);
    doc.text('₹' + grandTotal.toFixed(2), sumX + sumW - 56, gtY2 + 4.5, { width: 50, align: 'right' });
    doc.fillColor('#000');

    doc.y = amtY + sumH + 10;

    // ════════════════════ PAYMENT & QR ════════════════════
    const payH = 66;
    const payY = doc.y;
    const payHalf = (CW - 10) / 2;

    // Payment
    sectionBox(doc, PAGE.M, payY, payHalf, payH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('PAYMENT DETAILS', PAGE.M + 6, payY + 3);
    doc.fontSize(7.5).font('Helvetica').fillColor(TX);
    doc.text(`Payment Mode  :  ${(s.payment_mode || 'CASH').toUpperCase()}`, PAGE.M + 6, payY + 18);
    doc.text(`Total Items      :  ${items.rows.length}`, PAGE.M + 6, payY + 29);
    doc.text(`Total Qty         :  ${totalQty}`, PAGE.M + 6, payY + 40);
    doc.text(`Cashier            :  ${s.user_name || '-'}`, PAGE.M + 6, payY + 51);

    // QR
    const qrX = PAGE.M + payHalf + 10;
    sectionBox(doc, qrX, payY, payHalf, payH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('SCAN TO PAY', qrX, payY + 3, { width: payHalf, align: 'center' });

    const upiId = footerSettings['upi_id'] || 'store@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || ''))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`;
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 90, margin: 1, color: { dark: C1, light: '#fff' } });
      const qrSize = 38;
      const qrImgX = qrX + (payHalf - qrSize) / 2;
      doc.image(qrBuf, qrImgX, payY + 16, { width: qrSize, height: qrSize });
    } catch (_) { /* skip */ }
    doc.fontSize(6).font('Helvetica').fillColor(TXM);
    doc.text(upiId, qrX, payY + 56, { width: payHalf, align: 'center' });
    doc.fillColor('#000');

    doc.y = payY + payH + 10;

    // ════════════════════ SIGNATURES ════════════════════
    const signY = doc.y;
    const signW = (CW - 20) / 3;
    const signStartX = PAGE.M + (CW - (signW * 3 + 20)) / 2;

    ['AUTHORIZED SIGNATURE', 'CUSTOMER SIGNATURE', 'STORE SEAL'].forEach((label, i) => {
      const sx = signStartX + i * (signW + 10);
      borderedBox(doc, sx, signY, signW, 28);
      doc.fontSize(6).font('Helvetica').fillColor(TXM);
      doc.text(label, sx, signY + 10, { width: signW, align: 'center' });
    });
    doc.fillColor('#000');
    doc.y = signY + 32;

    // ════════════════════ FOOTER BOX ════════════════════
    const ftrH = 46;
    const ftrY = doc.y;
    sectionBox(doc, PAGE.M, ftrY, CW, ftrH);
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C1);
    doc.text('TERMS & CONDITIONS', PAGE.M + 6, ftrY + 3);
    doc.fontSize(7).font('Helvetica').fillColor(TXM);
    doc.text(footerSettings['terms_conditions'] || 'Goods once sold will not be taken back.', PAGE.M + 6, ftrY + 17, { width: CW - 12 });
    doc.text(footerSettings['return_policy'] || 'No returns after 7 days.', PAGE.M + 6, ftrY + 27, { width: CW - 12 });
    doc.fillColor(C1).fontSize(7.5).font('Helvetica-Bold');
    doc.text(footerSettings['thank_you_message'] || 'Thank you! Visit again.', PAGE.M + 6, ftrY + 37, { width: CW - 12 });
    doc.fillColor('#000');
    doc.y = ftrY + ftrH + 6;

    // Bottom note
    doc.fontSize(6).font('Helvetica').fillColor('#aaa');
    doc.text('This is a computer-generated invoice', { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
