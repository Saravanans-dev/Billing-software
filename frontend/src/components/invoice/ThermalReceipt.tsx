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
      QRCode.toDataURL(upiLink, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
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
    pg: { width: '80mm', margin: '0 auto', background: '#fff', fontFamily: "'Courier New','Courier',monospace", color: '#000', fontSize: '9pt', lineHeight: '1.35' },
    in: { width: '72mm', padding: '2mm 4mm', margin: '0 auto' },
    cc: { textAlign: 'center' as const },
    rr: { textAlign: 'right' as const },
    ll: { textAlign: 'left' as const },
    b: { fontWeight: '700' as const },
    sh: { fontSize: '14pt', fontWeight: '900' as const, letterSpacing: '0.5px' },
    i8: { fontSize: '8pt', lineHeight: '1.5' },
    ds: { border: 'none', borderTop: '1px dashed #000', margin: '1.5mm 0' },
    d2: { border: 'none', borderTop: '1px dashed #000', margin: '1mm 0' },
    td: { padding: '0.3mm 0.4mm', verticalAlign: 'bottom' as const, fontSize: '7.5pt' },
    th: { padding: '0.5mm 0.4mm', fontWeight: '700' as const, borderBottom: '1px dashed #000', fontSize: '7pt' },
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
        {logoUrl ? <div style={s.cc}><img src={logoUrl} alt="" style={{ maxWidth: '30mm', maxHeight: '10mm', objectFit: 'contain', marginBottom: '0.5mm' }} crossOrigin="anonymous" /></div> : null}
        <div style={{ ...s.cc, ...s.i8 }}>
          <div style={s.sh}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          {company.address ? <div style={{ marginTop: '0.3mm' }}>{company.address}</div> : null}
          <div style={{ marginTop: '0.3mm' }}>
            {company.mobile ? <span>📞 {company.mobile}</span> : null}
          </div>
          <div>
            {company.gst_number ? <span>GSTIN: {company.gst_number}</span> : null}
          </div>
          {company.email ? <div style={{ marginTop: '0.2mm' }}>{company.email}</div> : null}
        </div>

        <hr style={s.ds} />

        {/* ═══════ TITLE ═══════ */}
        <div style={{ ...s.cc, fontWeight: '700', fontSize: '10pt', letterSpacing: '1px', margin: '0.5mm 0' }}>TAX INVOICE</div>

        <hr style={s.ds} />

        {/* ═══════ INVOICE & CUSTOMER ═══════ */}
        <div style={{ display: 'flex', fontSize: '7.5pt', lineHeight: '1.6' }}>
          <div style={{ width: '50%' }}>
            <div style={{ fontWeight: '700', fontSize: '8pt', marginBottom: '0.3mm' }}>Invoice Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Invoice No</span><span>{billNum}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span><span>{formatDate(sale.bill_date)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Time</span><span>{formatTime(sale.bill_time)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier ID</span><span>{cashierId}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cashier</span><span>{cashierName}</span></div>
          </div>
          <div style={{ width: '50%' }}>
            <div style={{ fontWeight: '700', fontSize: '8pt', marginBottom: '0.3mm' }}>Customer Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cust ID</span><span>{customerId}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Name</span><span>{sale.customer_name || 'Walk-In Customer'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mobile</span><span>{sale.customer_mobile || '-'}</span></div>
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ ITEMS TABLE ═══════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'center', width: '4mm' }}>#</th>
              <th style={{ ...s.th, textAlign: 'left' }}>Item</th>
              <th style={{ ...s.th, textAlign: 'center', width: '5mm' }}>Unit</th>
              <th style={{ ...s.th, textAlign: 'center', width: '5mm' }}>Qty</th>
              <th style={{ ...s.th, textAlign: 'right', width: '9mm' }}>Rate</th>
              <th style={{ ...s.th, textAlign: 'center', width: '5mm' }}>Disc%</th>
              <th style={{ ...s.th, textAlign: 'right', width: '10mm' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...s.td, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...s.td, maxWidth: '22mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
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
        <div style={{ fontSize: '8pt', lineHeight: '1.7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sub Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>CGST (50%)</span>
            <span>{formatCurrency(cgst)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>SGST (50%)</span>
            <span>{formatCurrency(sgst)}</span>
          </div>
          {roundOff !== 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Round Off</span>
              <span>{roundOff.toFixed(2)}</span>
            </div>
          ) : null}
        </div>

        <hr style={s.d2} />

        {/* ═══════ GRAND TOTAL ═══════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', fontWeight: '900', background: '#000', color: '#fff', padding: '0.7mm 0.5mm' }}>
          <span>GRAND TOTAL</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        <hr style={s.d2} />

        {/* ═══════ AMOUNT IN WORDS ═══════ */}
        <div style={{ fontSize: '7pt', lineHeight: '1.4' }}>
          <span style={s.b}>Amount In Words : </span>
          {numberToWords(Math.round(grandTotal))}
        </div>

        <hr style={s.ds} />

        {/* ═══════ QR CODE ═══════ */}
        {qrDataUrl ? (
          <div style={{ ...s.cc, margin: '1mm 0' }}>
            <div style={{ fontSize: '7pt', marginBottom: '0.5mm', color: '#555' }}>Scan to Pay via UPI</div>
            <img src={qrDataUrl} alt="UPI QR" style={{ width: '22mm', height: '22mm' }} />
            {upiId ? <div style={{ fontSize: '6.5pt', marginTop: '0.3mm', color: '#777' }}>{upiId}</div> : null}
          </div>
        ) : null}

        <hr style={s.ds} />

        {/* ═══════ THANK YOU ═══════ */}
        <div style={{ ...s.cc, margin: '1mm 0' }}>
          <div style={{ fontWeight: '900', fontSize: '10pt', letterSpacing: '0.5px' }}>THANK YOU VISIT AGAIN!</div>
          <div style={{ fontSize: '7pt', color: '#666', marginTop: '0.3mm' }}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
        </div>

        <hr style={s.ds} />
      </div></div>
    </div>
  );
}
