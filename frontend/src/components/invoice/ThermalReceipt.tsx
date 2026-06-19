import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../lib/utils';
import { BACKEND_URL } from '../../services/api';
import type { Sale, SaleItem, CompanySettings } from '../../types';

interface A5InvoiceProps {
  sale: Sale & { items: SaleItem[]; user_name?: string };
  company: CompanySettings;
  settings: Record<string, string>;
}

export function ThermalReceipt({ sale, company, settings }: A5InvoiceProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const items = sale.items || [];
  const grandTotal = Number(sale.grand_total) || 0;
  const subtotal = Number(sale.subtotal) || 0;
  const discountAmount = Number(sale.discount_amount) || 0;
  const gstAmount = Number(sale.gst_amount) || 0;
  const roundOff = Number(sale.round_off) || 0;
  const upiId = settings['upi_id'] || '';

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || ''}`
    : '';

  useEffect(() => {
    if (upiLink) {
      QRCode.toDataURL(upiLink, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [upiLink]);

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    return t.toString().slice(0, 5);
  };

  const billNum = sale.bill_number || '';
  const cashierId = sale.user_id ? sale.user_id.slice(0, 8) : '-';
  const cashierName = sale.user_name || '-';
  const customerId = sale.customer_id ? sale.customer_id.slice(0, 8) : '-';
  const barcodeChars = billNum.split('').map(c => /[A-Za-z0-9]/.test(c) ? c : '*').join(' ');
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';

  return (
    <div>
      <style>{`
        @page { size: A5; margin: 8mm; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
        .a5-invoice { width: 148mm; min-height: 210mm; padding: 6mm 8mm; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 9pt; line-height: 1.4; margin: 0 auto; background: #fff; }
        .a5-invoice table { width: 100%; border-collapse: collapse; }
        .a5-invoice td { vertical-align: top; }
        .a5-header { display: flex; align-items: center; margin-bottom: 4mm; padding-bottom: 3mm; border-bottom: 2px solid #1a1a2e; }
        .a5-logo { width: 40mm; display: flex; align-items: center; justify-content: flex-start; }
        .a5-logo img { max-width: 38mm; max-height: 20mm; object-fit: contain; }
        .a5-logo-placeholder { width: 38mm; height: 20mm; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 3px; font-size: 7pt; color: #999; }
        .a5-company { flex: 1; text-align: right; }
        .a5-company-name { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; color: #1a1a2e; }
        .a5-company-detail { font-size: 8pt; color: #555; line-height: 1.6; }
        .a5-section-title { font-weight: 700; font-size: 9pt; color: #1a1a2e; margin-bottom: 1mm; }
        .a5-divider { border: none; border-top: 1.5px solid #1a1a2e; margin: 2.5mm 0; }
        .a5-divider-light { border: none; border-top: 1px solid #ddd; margin: 2mm 0; }
        .a5-items-table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
        .a5-items-table th { padding: 1.5mm 1mm; font-weight: 700; font-size: 8pt; text-align: left; border-bottom: 1.5px solid #1a1a2e; border-top: 1.5px solid #1a1a2e; white-space: nowrap; }
        .a5-items-table td { padding: 1.2mm 1mm; font-size: 8.5pt; border-bottom: 0.5px solid #eee; }
        .a5-items-table .amt { text-align: right; }
        .a5-items-table .ctr { text-align: center; }
        .a5-totals { margin-bottom: 3mm; }
        .a5-totals table { width: 100%; }
        .a5-totals td { padding: 1mm 1.5mm; font-size: 9pt; }
        .a5-totals .label { text-align: left; font-weight: 500; }
        .a5-totals .value { text-align: right; }
        .a5-totals .grand-total-row td { font-weight: 900; font-size: 11pt; border-top: 1.5px solid #1a1a2e; padding-top: 1.5mm; }
        .a5-info-grid { width: 100%; margin-bottom: 2.5mm; }
        .a5-info-grid td { padding: 0.5mm 1mm; font-size: 8.5pt; vertical-align: top; }
        .a5-info-label { font-weight: 600; }
        .a5-footer { text-align: center; border-top: 2px solid #1a1a2e; padding-top: 3mm; margin-top: 2mm; }
        .a5-footer-thankyou { font-weight: 900; font-size: 11pt; letter-spacing: 1px; color: #1a1a2e; margin-bottom: 0.5mm; }
        .a5-footer-name { font-weight: 700; font-size: 9pt; color: #333; }
      `}</style>

      <div className="a5-invoice">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="a5-header">
          <div className="a5-logo">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" crossOrigin="anonymous" />
            ) : (
              <div className="a5-logo-placeholder">Company Logo</div>
            )}
          </div>
          <div className="a5-company">
            <div className="a5-company-name">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
            <div className="a5-company-detail">
              {company.address && <div>{company.address}</div>}
              {company.mobile && <div>Phone: {company.mobile}</div>}
            </div>
          </div>
        </div>

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <table className="a5-info-grid">
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div><span className="a5-info-label">Invoice No:</span> {billNum}</div>
                <div><span className="a5-info-label">Date:</span> {formatDate(sale.bill_date)}</div>
                <div><span className="a5-info-label">Time:</span> {formatTime(sale.bill_time)}</div>
              </td>
              <td style={{ width: '50%' }}>
                <div><span className="a5-info-label">Cashier ID:</span> {cashierId}</div>
                <div><span className="a5-info-label">Cashier:</span> {cashierName}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="a5-divider-light" />

        <table className="a5-info-grid">
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div><span className="a5-info-label">Customer Name:</span> {sale.customer_name || 'Walk-In Customer'}</div>
              </td>
              <td style={{ width: '50%' }}>
                <div><span className="a5-info-label">Customer ID:</span> {customerId}</div>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div><span className="a5-info-label">Mobile Number:</span> {sale.customer_mobile || '-'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="a5-divider" />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="a5-items-table">
          <thead>
            <tr>
              <th style={{ width: '6mm', textAlign: 'center' }}>#</th>
              <th>Item Name</th>
              <th style={{ width: '8mm', textAlign: 'center' }}>Unit</th>
              <th style={{ width: '8mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '18mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '20mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="ctr">{idx + 1}</td>
                <td>{item.product_name}</td>
                <td className="ctr">{item.unit || '-'}</td>
                <td className="ctr">{Number(item.quantity)}</td>
                <td className="amt">{Number(item.rate).toFixed(2)}</td>
                <td className="amt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '5mm', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ═══════════ TOTALS ═══════════ */}
        <div className="a5-totals">
          <table>
            <tbody>
              <tr>
                <td className="label">Sub Total</td>
                <td className="value">{formatCurrency(subtotal)}</td>
              </tr>
              {discountAmount > 0 && (
                <tr>
                  <td className="label">Discount</td>
                  <td className="value" style={{ color: '#e53935' }}>-{formatCurrency(discountAmount)}</td>
                </tr>
              )}
              {gstAmount > 0 && (
                <tr>
                  <td className="label">GST</td>
                  <td className="value">{formatCurrency(gstAmount)}</td>
                </tr>
              )}
              {roundOff !== 0 && (
                <tr>
                  <td className="label">Round Off</td>
                  <td className="value">{roundOff.toFixed(2)}</td>
                </tr>
              )}
              <tr className="grand-total-row">
                <td className="label">Grand Total</td>
                <td className="value">{formatCurrency(Math.round(grandTotal))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className="a5-divider" />

        {/* ═══════════ PAYMENT & BANK DETAILS ═══════════ */}
        <table style={{ width: '100%', marginBottom: '3mm', fontSize: '8.5pt', lineHeight: '1.7' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '3mm' }}>
                <div className="a5-section-title">Payment Information</div>
                <div>Payment Mode: {(sale.payment_mode || 'CASH').toUpperCase()}</div>
                <div>Paid Amount: {formatCurrency(Math.round(grandTotal))}</div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '3mm' }}>
                <div className="a5-section-title">Bank Details</div>
                <div>Bank: {settings['bank_name'] || '-'}</div>
                <div>Account Name: {settings['account_name'] || '-'}</div>
                <div>A/c No: {settings['account_number'] || '-'}</div>
                <div>IFSC: {settings['ifsc_code'] || '-'}</div>
                {upiId && <div>UPI ID: {upiId}</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ═══════════ BARCODE & QR CODE ═══════════ */}
        <table style={{ width: '100%', marginBottom: '2mm' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingRight: '2mm' }}>
                <div style={{ fontWeight: 700, fontSize: '8pt', marginBottom: '0.5mm' }}>Barcode</div>
                <div style={{
                  fontFamily: "'Libre Barcode 39', 'Code 39', monospace",
                  fontSize: '18px',
                  letterSpacing: '1.5px',
                  fontWeight: 600,
                  padding: '2mm',
                  border: '0.5px solid #ccc',
                  borderRadius: '2px',
                  display: 'inline-block',
                }}>
                  {barcodeChars || billNum}
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingLeft: '2mm' }}>
                <div style={{ fontWeight: 700, fontSize: '8pt', marginBottom: '0.5mm' }}>QR Code</div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR" style={{ width: '35mm', height: '35mm' }} />
                ) : (
                  <div style={{ width: '35mm', height: '35mm', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt', color: '#999', border: '0.5px dashed #ccc', margin: '0 auto' }}>
                    UPI QR
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ═══════════ FOOTER ═══════════ */}
        <div className="a5-footer">
          <div className="a5-footer-thankyou">THANK YOU VISIT AGAIN!</div>
          <div className="a5-footer-name">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
        </div>
      </div>
    </div>
  );
}
