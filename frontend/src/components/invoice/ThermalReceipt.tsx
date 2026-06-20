import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../lib/utils';
import { numberToWords } from '../../lib/numberToWords';
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
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const upiId = settings['upi_id'] || '';
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';
  const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0);

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || ''}`
    : '';

  useEffect(() => {
    if (upiLink) {
      QRCode.toDataURL(upiLink, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrDataUrl).catch(() => {});
    }
  }, [upiLink]);

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const p = t.toString().split(':');
    if (p.length < 2) return t.toString().slice(0, 5);
    const h = parseInt(p[0]);
    const a = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${p[1]} ${a}`;
  };

  const billNum = sale.bill_number || '';
  const cashierId = sale.user_id ? sale.user_id.slice(0, 8) : '-';
  const cashierName = sale.user_name || '-';
  const customerId = sale.customer_id ? sale.customer_id.slice(0, 8) : '-';

  const s = {
    pg: { width: '80mm', margin: '0 auto', background: '#fff', fontFamily: "'Courier New','Courier',monospace", color: '#000', fontSize: '9pt', lineHeight: '1.3' },
    in: { width: '72mm', padding: '2mm 4mm', margin: '0 auto' },
    cc: { textAlign: 'center' as const },
    rr: { textAlign: 'right' as const },
    ll: { textAlign: 'left' as const },
    b: { fontWeight: '700' as const },
    sh: { fontSize: '13pt', fontWeight: '900' as const, letterSpacing: '0.3px' },
    i8: { fontSize: '8pt', lineHeight: '1.45' },
    ds: { border: 'none', borderTop: '1px dashed #000', margin: '1.2mm 0' },
    d2: { border: 'none', borderTop: '1px dashed #000', margin: '0.8mm 0' },
    td: { padding: '0.3mm 0.3mm', verticalAlign: 'bottom' as const, fontSize: '7.5pt' },
  };

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
      <div style={s.pg}><div style={s.in}>

        {/* ═══════ HEADER ═══════ */}
        {logoUrl ? <div style={s.cc}><img src={logoUrl} alt="" style={{ maxWidth: '32mm', maxHeight: '10mm', objectFit: 'contain' }} crossOrigin="anonymous" /></div> : null}
        <div style={{ ...s.cc, ...s.i8 }}>
          <div style={s.sh}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          {company.address ? <div>{company.address}</div> : null}
          <div>
            {company.mobile ? <span>Ph: {company.mobile}</span> : null}
            {company.mobile && company.gst_number ? <span> | </span> : null}
            {company.gst_number ? <span>GSTIN: {company.gst_number}</span> : null}
          </div>
          {company.email ? <div>{company.email}</div> : null}
        </div>

        <hr style={s.ds} />

        {/* ═══════ INVOICE & CUSTOMER ═══════ */}
        <div style={{ display: 'flex', fontSize: '7.5pt', lineHeight: '1.55' }}>
          <div style={{ width: '50%' }}>
            <span style={s.b}>Invoice Details</span><br />
            Invoice No : {billNum}<br />
            Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {formatDate(sale.bill_date)}<br />
            Time &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {formatTime(sale.bill_time)}<br />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier ID</span><span>{cashierId}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier</span><span>{cashierName}</span></div>
          </div>
          <div style={{ width: '50%' }}>
            <span style={s.b}>Customer Details</span><br />
            Customer ID : {customerId}<br />
            Name &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {sale.customer_name || 'Walk-In Customer'}<br />
            Mobile&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {sale.customer_mobile || '-'}
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ ITEMS TABLE ═══════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '4mm', textAlign: 'center' }}>#</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '5mm', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '5mm', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '9mm', textAlign: 'right' }}>Rate</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '6mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ padding: '0.6mm 0.3mm', fontWeight: '700', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', width: '11mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...s.td, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...s.td, maxWidth: '24mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2mm', textAlign: 'center', color: '#999', fontSize: '8pt' }}>No items</td></tr>
            ) : null}
          </tbody>
        </table>

        <hr style={s.d2} />

        {/* ═══════ ITEMS COUNT & TOTAL QTY ═══════ */}
        <div style={{ fontSize: '7.5pt', display: 'flex', justifyContent: 'space-between' }}>
          <span>Items Count : {items.length}</span>
          <span>Total Qty : {totalQty}</span>
        </div>

        <hr style={s.ds} />

        {/* ═══════ SUMMARY ═══════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>Sub Total</td>
              <td style={{ textAlign: 'right', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td style={{ textAlign: 'left', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>Discount</td>
                <td style={{ textAlign: 'right', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>-{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            <tr>
              <td style={{ textAlign: 'left', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>CGST</td>
              <td style={{ textAlign: 'right', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>{formatCurrency(cgst)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>SGST</td>
              <td style={{ textAlign: 'right', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>{formatCurrency(sgst)}</td>
            </tr>
            {roundOff !== 0 ? (
              <tr>
                <td style={{ textAlign: 'left', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>Round Off</td>
                <td style={{ textAlign: 'right', padding: '0.3mm 0.3mm', fontSize: '8pt' }}>{roundOff.toFixed(2)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr style={s.d2} />

        {/* ═══════ GRAND TOTAL ═══════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ fontSize: '10pt', fontWeight: '900', background: '#000', color: '#fff' }}>
              <td style={{ padding: '0.7mm 0.3mm' }}>GRAND TOTAL</td>
              <td style={{ padding: '0.7mm 0.3mm', textAlign: 'right' }}>{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr style={s.d2} />

        {/* ═══════ AMOUNT IN WORDS ═══════ */}
        <div style={{ fontSize: '7pt', lineHeight: '1.3', marginBottom: '0.5mm' }}>
          <span style={s.b}>Amount In Words : </span>
          {numberToWords(Math.round(grandTotal))}
        </div>

        <hr style={s.ds} />

        {/* ═══════ PAYMENT & BANK ═══════ */}
        <div style={{ display: 'flex', fontSize: '7.5pt', lineHeight: '1.5' }}>
          <div style={{ width: '50%', paddingRight: '0.5mm' }}>
            <span style={s.b}>Payment Info</span><br />
            Method&nbsp;&nbsp;: {(sale.payment_mode || 'Cash').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}<br />
            Received : {formatCurrency(Math.round(grandTotal))}<br />
            Balance&nbsp;&nbsp;: {formatCurrency(0)}<br />
            Ref No&nbsp;&nbsp;&nbsp;: {billNum}
          </div>
          <div style={{ width: '50%', paddingLeft: '0.5mm' }}>
            <span style={s.b}>Bank Details</span><br />
            {settings['bank_name'] ? <>Bank&nbsp;&nbsp;: {settings['bank_name']}<br /></> : null}
            {settings['account_name'] ? <>Name : {settings['account_name']}<br /></> : null}
            {settings['account_number'] ? <>A/c&nbsp;&nbsp;: {settings['account_number']}<br /></> : null}
            {settings['ifsc_code'] ? <>IFSC : {settings['ifsc_code']}<br /></> : null}
            {upiId ? <>UPI&nbsp;&nbsp;: {upiId}</> : null}
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ QR CODE ═══════ */}
        {qrDataUrl ? (
          <div style={s.cc}>
            <img src={qrDataUrl} alt="UPI QR" style={{ width: '18mm', height: '18mm' }} />
          </div>
        ) : null}
      </div></div>
    </div>
  );
}
