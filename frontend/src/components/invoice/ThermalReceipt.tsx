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

const s = {
  page: { width: '80mm', margin: '0 auto', background: '#fff', fontFamily: "'Courier New','Courier',monospace", color: '#000', fontSize: '9pt', lineHeight: '1.35' },
  inner: { width: '72mm', padding: '2mm 4mm', margin: '0 auto' },
  c: { textAlign: 'center' as const },
  r: { textAlign: 'right' as const },
  l: { textAlign: 'left' as const },
  b: { fontWeight: '700' as const },
  shop: { fontSize: '14pt', fontWeight: '900' as const, letterSpacing: '0.5px' },
  info: { fontSize: '8pt', lineHeight: '1.5' },
  dtl: { fontSize: '8pt', lineHeight: '1.6' },
  dash: { border: 'none', borderTop: '1px dashed #000', margin: '1.5mm 0' },
  th: { padding: '0.5mm 0.3mm', fontWeight: '700' as const, borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7.5pt', whiteSpace: 'nowrap' as const },
  td: { padding: '0.3mm 0.3mm', borderBottom: '0.5px dotted #ccc', verticalAlign: 'bottom' as const, fontSize: '8pt' },
  rgt: { textAlign: 'right' as const, padding: '0.3mm 0.3mm' },
  lft: { textAlign: 'left' as const, padding: '0.3mm 0.3mm' },
  gt: { fontSize: '10pt', fontWeight: '900' as const, background: '#000', color: '#fff' },
  gtd: { padding: '0.6mm 0.3mm' },
  qr: { textAlign: 'center' as const, margin: '1.5mm 0' },
  qri: { width: '30mm', height: '30mm' },
  logo: { maxWidth: '35mm', maxHeight: '12mm', objectFit: 'contain' as const },
  foot: { textAlign: 'center' as const, fontSize: '8pt', lineHeight: '1.4' },
};

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
      `}</style>
      <div style={s.page}>
      <div style={{ ...s.inner, fontSize: '9pt', lineHeight: '1.35' }}>
        {/* LOGO */}
        {logoUrl ? (
          <div style={s.c}>
            <img src={logoUrl} alt="" style={s.logo} crossOrigin="anonymous" />
          </div>
        ) : null}

        {/* SHOP HEADER */}
        <div style={{ ...s.c, ...s.info }}>
          <div style={s.shop}>{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          {company.address ? <div>{company.address}</div> : null}
          {company.mobile ? <div>Ph: {company.mobile}</div> : null}
          {company.gst_number ? <div>GST: {company.gst_number}</div> : null}
        </div>

        <hr style={s.dash} />

        {/* BILL INFO */}
        <div style={s.dtl}>
          Bill No : {billNum}<br />
          Date &nbsp;&nbsp;&nbsp;: {formatDate(sale.bill_date)}<br />
          Time &nbsp;&nbsp;&nbsp;: {formatTime(sale.bill_time)}
        </div>

        <hr style={s.dash} />

        {/* CUSTOMER */}
        <div style={s.dtl}>
          Customer : {sale.customer_name || 'Walk-In Customer'}<br />
          Mobile &nbsp;&nbsp;: {sale.customer_mobile || '-'}
        </div>

        <hr style={s.dash} />

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'left' }}>Item</th>
              <th style={{ ...s.th, width: '8mm', textAlign: 'center' }}>Qty</th>
              <th style={{ ...s.th, width: '12mm', textAlign: 'right' }}>Rate</th>
              <th style={{ ...s.th, width: '14mm', textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...s.td, maxWidth: '34mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2mm', textAlign: 'center', color: '#999', fontSize: '8pt' }}>No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr style={s.dash} />

        {/* TOTALS */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <tbody>
            <tr>
              <td style={s.lft}>Subtotal</td>
              <td style={s.rgt}>{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td style={s.lft}>Discount</td>
                <td style={s.rgt}>{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            {gstAmount > 0 ? (
              <tr>
                <td style={s.lft}>GST</td>
                <td style={s.rgt}>{formatCurrency(gstAmount)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr style={s.dash} />

        {/* GRAND TOTAL */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={s.gt}>
              <td style={s.gtd}>GRAND TOTAL</td>
              <td style={{ ...s.gtd, textAlign: 'right' }}>{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr style={s.dash} />

        {/* PAYMENT */}
        <div style={s.dtl}>
          Payment Method : {(sale.payment_mode || 'Cash').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>

        <hr style={s.dash} />

        {/* BANK DETAILS */}
        <div style={{ ...s.c, ...s.info, marginBottom: '1mm' }}>
          <span style={s.b}>BANK DETAILS</span>
        </div>
        <div style={s.dtl}>
          {settings['bank_name'] ? <div>Bank Name : {settings['bank_name']}</div> : null}
          {settings['account_name'] ? <div>A/C Name&nbsp;&nbsp;: {settings['account_name']}</div> : null}
          {settings['account_number'] ? <div>A/C No&nbsp;&nbsp;&nbsp;&nbsp;: {settings['account_number']}</div> : null}
          {settings['ifsc_code'] ? <div>IFSC Code : {settings['ifsc_code']}</div> : null}
          {upiId ? <div>UPI ID&nbsp;&nbsp;&nbsp;&nbsp;: {upiId}</div> : null}
        </div>

        <hr style={s.dash} />

        {/* QR CODE */}
        {qrDataUrl ? (
          <div style={s.qr}>
            <img src={qrDataUrl} alt="UPI QR" style={s.qri} />
          </div>
        ) : null}

        {/* FOOTER */}
        <div style={s.foot}>
          <div style={{ fontWeight: '900', fontSize: '10pt', letterSpacing: '0.5px' }}>Thank You Visit Again!</div>
          <div>{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          {company.email ? <div>{company.email}</div> : null}
          {company.mobile ? <div>Ph: {company.mobile}</div> : null}
        </div>

        <hr style={s.dash} />
      </div>
    </div>
    </div>
  );
}
