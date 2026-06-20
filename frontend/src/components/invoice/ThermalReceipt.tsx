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
  const upiId = settings['upi_id'] || '';
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || ''}`
    : '';

  useEffect(() => {
    if (upiLink) {
      QRCode.toDataURL(upiLink, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [upiLink]);

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const parts = t.toString().split(':');
    if (parts.length < 2) return t.toString().slice(0, 5);
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const billNum = sale.bill_number || '';

  return (
    <div>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; width: 80mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .r {
          width: 72mm;
          padding: 2mm 4mm;
          font-family: 'Courier New', 'Courier', monospace;
          color: #000;
          background: #fff;
          margin: 0 auto;
        }
        .c { text-align: center; }
        .rgt { text-align: right; }
        .lft { text-align: left; }
        .b { font-weight: 700; }
        .fs8 { font-size: 8pt; line-height: 1.4; }
        .fs9 { font-size: 9pt; line-height: 1.35; }
        .fs10 { font-size: 10pt; }
        .shop { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; }
        .dash { border: none; border-top: 1px dashed #000; margin: 1.5mm 0; }
        .dtl { font-size: 8pt; line-height: 1.6; }
        .itbl { width: 100%; font-size: 8pt; border-collapse: collapse; }
        .itbl th { padding: 0.5mm 0.3mm; font-weight: 700; border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-size: 7.5pt; }
        .itbl td { padding: 0.3mm 0.3mm; border-bottom: 0.5px dotted #ccc; vertical-align: bottom; }
        .stbl { width: 100%; font-size: 8pt; border-collapse: collapse; }
        .stbl td { padding: 0.3mm 0.3mm; }
        .gtbl { width: 100%; font-size: 10pt; font-weight: 900; border-collapse: collapse; }
        .gtbl td { padding: 0.6mm 0.3mm; }
        .qr { text-align: center; margin: 1.5mm 0; }
        .qr img { width: 30mm; height: 30mm; }
      `}</style>

      <div className="r fs9">
        {/* LOGO */}
        {logoUrl ? (
          <div className="c" style={{ marginBottom: '1mm' }}>
            <img src={logoUrl} alt="Logo" style={{ maxWidth: '35mm', maxHeight: '12mm', objectFit: 'contain' }} crossOrigin="anonymous" />
          </div>
        ) : null}

        {/* SHOP NAME & ADDRESS */}
        <div className="c fs8">
          <div className="shop">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          {company.address ? <div>{company.address}</div> : null}
          {company.mobile ? <div>Ph: {company.mobile}</div> : null}
          {company.gst_number ? <div>GST: {company.gst_number}</div> : null}
        </div>

        <hr className="dash" />

        {/* BILL INFO */}
        <div className="dtl">
          Bill No : {billNum}<br />
          Date &nbsp;&nbsp;&nbsp;: {formatDate(sale.bill_date)}<br />
          Time &nbsp;&nbsp;&nbsp;: {formatTime(sale.bill_time)}
        </div>

        <hr className="dash" />

        {/* CUSTOMER */}
        <div className="dtl">
          Customer : {sale.customer_name || 'Walk-In Customer'}<br />
          Mobile &nbsp;&nbsp;: {sale.customer_mobile || '-'}
        </div>

        <hr className="dash" />

        {/* ITEMS TABLE */}
        <table className="itbl">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ width: '8mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '12mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '14mm', textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ maxWidth: '34mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td className="c">{Number(item.quantity)}</td>
                <td className="rgt">{Number(item.rate).toFixed(2)}</td>
                <td className="rgt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="c" style={{ padding: '2mm', color: '#999' }}>No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr className="dash" />

        {/* SUBTOTAL / DISCOUNT / GST */}
        <table className="stbl">
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="rgt">{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td>Discount</td>
                <td className="rgt">{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            {gstAmount > 0 ? (
              <tr>
                <td>GST</td>
                <td className="rgt">{formatCurrency(gstAmount)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr className="dash" />

        {/* GRAND TOTAL */}
        <table className="gtbl">
          <tbody>
            <tr>
              <td>GRAND TOTAL</td>
              <td className="rgt">{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr className="dash" />

        {/* PAYMENT */}
        <div className="dtl">
          Payment Method : {(sale.payment_mode || 'Cash').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>

        <hr className="dash" />

        {/* BANK DETAILS */}
        <div className="c fs8" style={{ marginBottom: '1mm' }}>
          <span className="b">BANK DETAILS</span>
        </div>
        <div className="dtl">
          {settings['bank_name'] ? <div>Bank Name : {settings['bank_name']}</div> : null}
          {settings['account_name'] ? <div>A/C Name&nbsp;&nbsp;: {settings['account_name']}</div> : null}
          {settings['account_number'] ? <div>A/C No&nbsp;&nbsp;&nbsp;&nbsp;: {settings['account_number']}</div> : null}
          {settings['ifsc_code'] ? <div>IFSC Code : {settings['ifsc_code']}</div> : null}
          {upiId ? <div>UPI ID&nbsp;&nbsp;&nbsp;&nbsp;: {upiId}</div> : null}
        </div>

        <hr className="dash" />

        {/* QR CODE */}
        {qrDataUrl ? (
          <div className="qr">
            <img src={qrDataUrl} alt="UPI QR" />
          </div>
        ) : null}

        {/* FOOTER */}
        <div className="c fs8" style={{ marginTop: '1mm' }}>
          <div className="b fs10" style={{ letterSpacing: '0.5px' }}>Thank You Visit Again!</div>
          <div style={{ marginTop: '0.3mm' }}>{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          {company.email ? <div>{company.email}</div> : null}
          {company.mobile ? <div>Ph: {company.mobile}</div> : null}
        </div>

        <hr className="dash" />
      </div>
    </div>
  );
}
