import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../lib/utils';
import { BACKEND_URL } from '../../services/api';
import type { Sale, SaleItem, CompanySettings } from '../../types';

interface ThermalReceiptProps {
  sale: Sale & { items: SaleItem[]; user_name?: string };
  company: CompanySettings;
  settings: Record<string, string>;
}

export function ThermalReceipt({ sale, company, settings }: ThermalReceiptProps) {
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
        width: 150,
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
  const cashierName = sale.user_name || '-';
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';

  return (
    <div>
      <style>{`
        @page { size: 80mm 297mm; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .thermal-receipt { width: 72mm; padding: 2mm 4mm; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 9pt; line-height: 1.3; margin: 0 auto; background: #fff; }
        .thermal-receipt table { width: 100%; border-collapse: collapse; }
        .thermal-receipt td { vertical-align: top; }
        .tr-header { text-align: center; margin-bottom: 3mm; padding-bottom: 2mm; border-bottom: 1px dashed #000; }
        .tr-header .tr-name { font-size: 14pt; font-weight: 900; letter-spacing: 1px; }
        .tr-header .tr-detail { font-size: 8pt; line-height: 1.5; }
        .tr-divider { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
        .tr-info { width: 100%; font-size: 8pt; margin-bottom: 1mm; }
        .tr-info td { padding: 0.3mm 0; }
        .tr-items { width: 100%; font-size: 8pt; margin-bottom: 2mm; }
        .tr-items th { padding: 0.5mm 0; font-weight: 700; text-align: left; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .tr-items td { padding: 0.5mm 0; border-bottom: 0.5px dotted #ccc; }
        .tr-items .amt { text-align: right; }
        .tr-items .ctr { text-align: center; }
        .tr-totals { width: 100%; font-size: 8pt; }
        .tr-totals td { padding: 0.5mm 0; }
        .tr-totals .label { text-align: left; }
        .tr-totals .value { text-align: right; }
        .tr-totals .grand-total-row td { font-weight: 900; font-size: 10pt; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 1mm 0; }
        .tr-footer { text-align: center; margin-top: 3mm; padding-top: 2mm; border-top: 1px dashed #000; font-size: 8pt; }
        .tr-footer .tr-thankyou { font-weight: 900; font-size: 10pt; letter-spacing: 1px; margin-bottom: 0.5mm; }
        .tr-qr { text-align: center; margin: 2mm 0; }
        .tr-qr img { width: 30mm; height: 30mm; }
      `}</style>

      <div className="thermal-receipt">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="tr-header">
          {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxWidth: '40mm', maxHeight: '15mm', objectFit: 'contain', marginBottom: '1mm' }} crossOrigin="anonymous" />}
          <div className="tr-name">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          <div className="tr-detail">
            {company.address && <div>{company.address}</div>}
            {company.mobile && <div>Phone: {company.mobile}</div>}
            {company.gst_number && <div>GST: {company.gst_number}</div>}
          </div>
        </div>

        {/* ═══════════ INVOICE INFO ═══════════ */}
        <table className="tr-info">
          <tbody>
            <tr>
              <td>Invoice: {billNum}</td>
              <td style={{ textAlign: 'right' }}>Date: {formatDate(sale.bill_date)}</td>
            </tr>
            <tr>
              <td>Time: {formatTime(sale.bill_time)}</td>
              <td style={{ textAlign: 'right' }}>Cashier: {cashierName}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: '8pt' }}>
          Customer: {sale.customer_name || 'Walk-In Customer'}
          {sale.customer_mobile ? ` | Mob: ${sale.customer_mobile}` : ''}
        </div>

        <hr className="tr-divider" />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="tr-items">
          <thead>
            <tr>
              <th style={{ width: '5mm', textAlign: 'center' }}>#</th>
              <th>Item</th>
              <th style={{ width: '7mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '15mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '17mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="ctr">{idx + 1}</td>
                <td>{item.product_name}</td>
                <td className="ctr">{Number(item.quantity)}</td>
                <td className="amt">{Number(item.rate).toFixed(2)}</td>
                <td className="amt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3mm', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ═══════════ TOTALS ═══════════ */}
        <table className="tr-totals">
          <tbody>
            <tr>
              <td className="label">Sub Total</td>
              <td className="value">{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 && (
              <tr>
                <td className="label">Discount</td>
                <td className="value">-{formatCurrency(discountAmount)}</td>
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

        <hr className="tr-divider" />

        {/* ═══════════ PAYMENT INFO ═══════════ */}
        <div style={{ fontSize: '8pt', lineHeight: '1.6', marginBottom: '1mm' }}>
          <div>Payment: {(sale.payment_mode || 'CASH').toUpperCase()}</div>
          {upiId && <div>UPI ID: {upiId}</div>}
          {settings['bank_name'] && <div>Bank: {settings['bank_name']} | IFSC: {settings['ifsc_code'] || '-'}</div>}
          {sale.notes && <div>Notes: {sale.notes}</div>}
        </div>

        {/* ═══════════ QR CODE ═══════════ */}
        {qrDataUrl && (
          <div className="tr-qr">
            <img src={qrDataUrl} alt="UPI QR" />
          </div>
        )}

        {/* ═══════════ FOOTER ═══════════ */}
        <div className="tr-footer">
          <div className="tr-thankyou">THANK YOU</div>
          <div>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
        </div>
      </div>
    </div>
  );
}
