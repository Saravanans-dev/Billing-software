import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import { numberToWords } from '../lib/numberToWords';

const PAGE = { W: 419.53, H: 595.28, M: 20 };
const CW = PAGE.W - PAGE.M * 2;

function dash(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor('#ccc').lineWidth(0.5).stroke();
}

function solidLine(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(PAGE.M, y).lineTo(PAGE.W - PAGE.M, y).strokeColor('#000').lineWidth(0.8).stroke();
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

// ---- A5 Professional Invoice ----

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
       WHERE setting_key IN ('upi_id','bank_name','account_name','account_number','ifsc_code','return_policy','terms_conditions','thank_you_message')`
    );
    const extraMap: Record<string, string> = {};
    extras.rows.forEach((r: any) => { extraMap[r.setting_key] = r.setting_value; });

    const s = sale.rows[0];
    const c = company.rows[0] || {};
    const footerSettings = extraMap;

    const doc = new PDFDocument({ size: [PAGE.W, PAGE.H], margin: PAGE.M, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${s.bill_number}.pdf`);
    doc.pipe(res);

    const grandTotal = Number(s.grand_total) || 0;
    const storeName = String(c.company_name || 'STUDENT XEROX').toUpperCase();
    const cgst = Number(s.gst_amount) / 2 || 0;
    const sgst = Number(s.gst_amount) / 2 || 0;
    const totalQty = items.rows.reduce((sum: number, i: any) => sum + Number(i.quantity), 0);
    const upiId = footerSettings['upi_id'] || '';
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(String(c.company_name || ''))}&am=${grandTotal.toFixed(2)}&tn=${s.bill_number || 'Bill'}`
      : '';

    // ═══ HEADER ═══
    if (c.logo_url) {
      const logoPath = path.join(__dirname, '../../', c.logo_url.replace(/^\//, ''));
      if (require('fs').existsSync(logoPath)) {
        try {
          doc.image(logoPath, PAGE.W / 2 - 25, PAGE.M, { width: 50, height: 50 });
          doc.moveDown(3);
        } catch (_) { /* skip logo */ }
      }
    }

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000');
    doc.text(storeName, { align: 'center' });
    doc.moveDown(0.2);

    doc.fontSize(7.5).font('Helvetica').fillColor('#444');
    let addrParts = [c.address, c.mobile ? `Ph: ${c.mobile}` : '', c.email ? `Email: ${c.email}` : ''].filter(Boolean);
    if (addrParts.length > 0) doc.text(addrParts.join(' | '), { align: 'center' });
    if (c.gst_number) doc.text(`GSTIN: ${c.gst_number}`, { align: 'center' });
    doc.moveDown(0.3);
    solidLine(doc, doc.y);
    doc.moveDown(0.4);

    // ═══ INVOICE & CUSTOMER DETAILS (two-column) ═══
    const detailY = doc.y;
    doc.fontSize(8).font('Helvetica').fillColor('#333');

    const leftX = PAGE.M;
    const rightX = PAGE.M + CW * 0.52;

    doc.text(`Invoice No: ${s.bill_number || ''}`, leftX, detailY);
    doc.text(`Date: ${s.bill_date ? new Date(s.bill_date).toLocaleDateString('en-IN') : ''}`, leftX, detailY + 10);
    doc.text(`Time: ${s.bill_time ? s.bill_time.toString().slice(0, 5) : ''}`, leftX, detailY + 20);
    doc.text(`Cashier ID: ${(s.user_id || '').slice(0, 8) || '-'}`, leftX, detailY + 30);
    doc.text(`Cashier: ${s.user_name || '-'}`, leftX, detailY + 40);

    doc.text(`Customer ID: ${(s.customer_id || '').slice(0, 8) || '-'}`, rightX, detailY);
    doc.text(`Customer: ${s.customer_name || 'Walk-In Customer'}`, rightX, detailY + 10);
    doc.text(`Mobile: ${s.customer_mobile || '-'}`, rightX, detailY + 20);

    doc.y = detailY + 54;

    // ═══ ITEMS TABLE ═══
    dash(doc, doc.y);
    doc.moveDown(0.15);

    const cols = [
      { key: '#', w: 12, align: 'left' as const },
      { key: 'Item Name', w: 142, align: 'left' as const },
      { key: 'Unit', w: 22, align: 'center' as const },
      { key: 'Qty', w: 24, align: 'center' as const },
      { key: 'Rate', w: 38, align: 'right' as const },
      { key: 'Amount', w: 44, align: 'right' as const },
    ];
    const tw = cols.reduce((s, c) => s + c.w, 0);
    const tx = PAGE.M + (CW - tw) / 2;

    const thy = doc.y;
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000');
    let cx2 = tx;
    cols.forEach((c) => { doc.text(c.key, cx2, thy, { width: c.w, align: c.align }); cx2 += c.w; });
    doc.y = thy + 1;
    dash(doc, doc.y);
    doc.moveDown(0.2);

    items.rows.forEach((item: any, idx: number) => {
      const ry = doc.y;
      const cells = [
        String(idx + 1),
        String(item.product_name),
        String(item.unit || '-'),
        String(Number(item.quantity)),
        Number(item.rate).toFixed(2),
        Number(item.amount).toFixed(2),
      ];
      const rowH = cells.length > 1 && cells[1].length > 30 ? 18 : 12;
      if (idx % 2 === 0) { doc.rect(tx, ry, tw, rowH).fillColor('#f9f9f9').fill(); doc.fillColor('#000'); }
      doc.fontSize(6.5).font('Helvetica').fillColor('#333');
      cx2 = tx;
      cells.forEach((v, i) => { doc.text(v, cx2, ry + 1.5, { width: cols[i].w, align: cols[i].align }); cx2 += cols[i].w; });
      doc.y = ry + rowH;
    });

    dash(doc, doc.y);
    doc.moveDown(0.15);

    // Items Count & Total Qty
    doc.fontSize(7).font('Helvetica').fillColor('#333');
    doc.text(`Items Count: ${items.rows.length}`, PAGE.M, doc.y);
    doc.text(`Total Quantity: ${totalQty}`, PAGE.M + CW * 0.5, doc.y - 10, { width: CW * 0.5, align: 'right' });
    doc.moveDown(0.5);

    dash(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ SUMMARY + GRAND TOTAL ═══
    const summaryX = PAGE.M + CW * 0.45;
    const summaryW = CW * 0.55;

    doc.fontSize(7.5).font('Helvetica').fillColor('#333');
    doc.text('Sub Total', summaryX, doc.y, { width: summaryW - 50 });
    doc.text(Number(s.subtotal).toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
    doc.moveDown(0.4);

    if (Number(s.discount_amount) > 0) {
      doc.text('Discount', summaryX, doc.y, { width: summaryW - 50 });
      doc.text('-' + Number(s.discount_amount).toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
      doc.moveDown(0.4);
    }
    if (cgst > 0) {
      doc.text('CGST', summaryX, doc.y, { width: summaryW - 50 });
      doc.text(cgst.toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
      doc.moveDown(0.4);
    }
    if (sgst > 0) {
      doc.text('SGST', summaryX, doc.y, { width: summaryW - 50 });
      doc.text(sgst.toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
      doc.moveDown(0.4);
    }
    if (Number(s.round_off) !== 0) {
      doc.text('Round Off', summaryX, doc.y, { width: summaryW - 50 });
      doc.text(Number(s.round_off).toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
      doc.moveDown(0.4);
    }

    solidLine(doc, doc.y);
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('Grand Total', summaryX, doc.y, { width: summaryW - 50 });
    doc.text(grandTotal.toFixed(2), summaryX + summaryW - 50, doc.y, { width: 50, align: 'right' });
    doc.moveDown(0.4);
    solidLine(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ AMOUNT IN WORDS ═══
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#000');
    doc.text('Amount in Words:', { align: 'center' });
    doc.fontSize(7).font('Helvetica').fillColor('#555');
    doc.text(numberToWords(grandTotal), { align: 'center' });
    doc.moveDown(0.5);

    dash(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ PAYMENT DETAILS ═══
    doc.fontSize(7).font('Helvetica').fillColor('#333');
    doc.text('Payment Details', PAGE.M, doc.y, { width: CW * 0.5 });
    doc.text(`Method: ${(s.payment_mode || 'CASH').toUpperCase()}`, PAGE.M, doc.y + 8);
    doc.text(`Received: ${grandTotal.toFixed(2)}`, PAGE.M, doc.y + 14);
    doc.text(`Balance: 0.00`, PAGE.M, doc.y + 20);
    if (s.notes) doc.text(`Ref No: ${s.notes}`, PAGE.M, doc.y + 26);

    // ═══ BANK DETAILS (right side) ═══
    const bankY = doc.y;
    doc.text('Bank Details', PAGE.M + CW * 0.45, bankY, { width: CW * 0.55 });
    doc.text(`Bank: ${footerSettings['bank_name'] || '-'}`, PAGE.M + CW * 0.45, bankY + 8, { width: CW * 0.55 });
    doc.text(`A/c Name: ${footerSettings['account_name'] || '-'}`, PAGE.M + CW * 0.45, bankY + 14, { width: CW * 0.55 });
    doc.text(`A/c No: ${footerSettings['account_number'] || '-'}`, PAGE.M + CW * 0.45, bankY + 20, { width: CW * 0.55 });
    doc.text(`IFSC: ${footerSettings['ifsc_code'] || '-'}`, PAGE.M + CW * 0.45, bankY + 26, { width: CW * 0.55 });

    doc.y = bankY + 36;
    doc.moveDown(0.3);
    dash(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ BARCODE + QR CODE (side by side) ═══
    try {
      const qrBuf: Buffer = await QRCode.toBuffer(upiLink, { width: 80, margin: 1, color: { dark: '#000', light: '#fff' } });

      // QR right
      doc.image(qrBuf, PAGE.W - PAGE.M - 52, doc.y - 2, { width: 50, height: 50 });
      doc.fontSize(5.5).font('Helvetica').fillColor('#555');
      doc.text('Scan & Pay (UPI)', PAGE.W - PAGE.M - 52, doc.y + 50, { width: 50, align: 'center' });

      // Barcode left (bill number as code128-style text)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
      doc.text(s.bill_number?.replace(/[^A-Za-z0-9]/g, '*') || 'N/A', PAGE.M, doc.y + 5, { width: CW * 0.5 });
      doc.fontSize(5.5).font('Helvetica').fillColor('#555');
      doc.text('Invoice Barcode', PAGE.M, doc.y - 5, { width: CW * 0.5 });
    } catch (_) { /* skip QR */ }

    doc.y = Math.max(doc.y, doc.y + 30);
    doc.moveDown(0.5);
    dash(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ TERMS & CONDITIONS ═══
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000');
    doc.text('Terms & Conditions:', { align: 'center' });
    doc.fontSize(6.5).font('Helvetica').fillColor('#555');
    const terms = footerSettings['terms_conditions'] || 'Goods once sold cannot be returned or exchanged.';
    doc.text(terms, { align: 'center' });
    doc.text('Please retain this invoice for future reference.', { align: 'center' });
    doc.text('Thank you for choosing Student Xerox.', { align: 'center' });
    doc.moveDown(0.3);

    // ═══ CONTACT ═══
    doc.fontSize(6.5).font('Helvetica').fillColor('#555');
    if (c.email) doc.text(`Email: ${c.email}`, { align: 'center' });
    if (c.mobile) doc.text(`WhatsApp: ${c.mobile}`, { align: 'center' });

    doc.moveDown(0.3);
    dash(doc, doc.y);
    doc.moveDown(0.3);

    // ═══ FOOTER ═══
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
    doc.text('THANK YOU VISIT AGAIN!', { align: 'center' });
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#333');
    doc.text(storeName, { align: 'center' });
    doc.fontSize(6).font('Helvetica').fillColor('#777');
    doc.text('Fast Service • Quality Printing', { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
