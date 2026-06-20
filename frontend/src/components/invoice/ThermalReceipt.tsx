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
  const upiId = settings['upi_id'] || '';
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';
  const billNum = sale.bill_number || '';

  const invoiceUrl = `${window.location.origin}/invoice/${encodeURIComponent(billNum)}`;

  const qrData = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(billNum)}`
    : invoiceUrl;

  useEffect(() => {
    QRCode.toDataURL(qrData, { width: 140, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl).catch(() => {});
  }, [qrData]);

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
          <div style={{ marginTop: '0.3mm' }}>Therikiyur, Ayyampalayam</div>
          <div>Trichy - 621005</div>
          <div style={{ marginTop: '0.3mm' }}>Ph: 9876543210</div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ INVOICE & CUSTOMER (TWO COLUMN) ═══════ */}
        <div style={{ fontSize: '7.5pt', lineHeight: '1.55' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Invoice No: {billNum}</span>
            <span style={{ textAlign: 'right' }}>Customer ID: {customerId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date: {formatDate(sale.bill_date)}</span>
            <span style={{ textAlign: 'right' }}>Customer Name: {sale.customer_name || 'Walk-In Customer'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time: {formatTime(sale.bill_time)}</span>
            <span style={{ textAlign: 'right' }}>Mobile Number: {sale.customer_mobile || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cashier ID: {cashierId}</span>
            <span></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cashier: {cashierName}</span>
            <span></span>
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ ITEMS TABLE ═══════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...s.th, textAlign: 'center', width: '4mm' }}>#</th>
              <th style={{ ...s.th, textAlign: 'left' }}>Item Name</th>
              <th style={{ ...s.th, textAlign: 'center', width: '6mm' }}>Qty</th>
              <th style={{ ...s.th, textAlign: 'right', width: '9mm' }}>Rate</th>
              <th style={{ ...s.th, textAlign: 'right', width: '10mm' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...s.td, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...s.td, maxWidth: '28mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td style={{ ...s.td, textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2mm', textAlign: 'center', color: '#999', fontSize: '8pt' }}>No items</td></tr>
            ) : null}
          </tbody>
        </table>

        <hr style={s.d2} />

        {/* ═══════ SUBTOTAL & DISCOUNT ═══════ */}
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
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Discount</span>
              <span>{formatCurrency(0)}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', margin: '1mm 0', padding: '0.5mm 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', fontWeight: '900' }}>
            <span>GRAND TOTAL</span>
            <span>{formatCurrency(Math.round(grandTotal))}</span>
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ PAYMENT INFORMATION ═══════ */}
        <div style={{ fontWeight: '700', fontSize: '8pt', marginBottom: '0.5mm' }}>PAYMENT INFORMATION</div>
        <div style={{ fontSize: '7.5pt', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Method</span>
            <span>{(sale.payment_mode || 'CASH').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Received Amount</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Balance Amount</span>
            <span>{formatCurrency(0)}</span>
          </div>
        </div>

        <hr style={s.ds} />

        {/* ═══════ BANK DETAILS ═══════ */}
        {settings['bank_name'] || settings['account_name'] || settings['account_number'] || settings['ifsc_code'] || upiId ? (
          <>
            <div style={{ fontWeight: '700', fontSize: '8pt', marginBottom: '0.5mm' }}>BANK DETAILS</div>
            <div style={{ fontSize: '7.5pt', lineHeight: '1.6' }}>
              {settings['bank_name'] ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bank Name</span><span>{settings['bank_name']}</span></div> : null}
              {settings['account_name'] ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account Name</span><span>{settings['account_name']}</span></div> : null}
              {settings['account_number'] ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account No</span><span>{settings['account_number']}</span></div> : null}
              {settings['ifsc_code'] ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IFSC Code</span><span>{settings['ifsc_code']}</span></div> : null}
              {upiId ? <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>UPI ID</span><span>{upiId}</span></div> : null}
            </div>
            <hr style={s.ds} />
          </>
        ) : null}

        {/* ═══════ QR CODE ═══════ */}
        {qrDataUrl ? (
          <div style={{ ...s.cc, margin: '0.5mm 0' }}>
            <img src={qrDataUrl} alt="UPI QR" style={{ width: '14mm', height: '14mm', display: 'block', margin: '0 auto' }} />
          </div>
        ) : null}

        <hr style={s.ds} />

        {/* ═══════ THANK YOU ═══════ */}
        <div style={{ ...s.cc, margin: '1mm 0' }}>
          <div style={{ fontWeight: '900', fontSize: '10pt', letterSpacing: '0.5px' }}>THANK YOU VISIT AGAIN!</div>
          <div style={{ fontSize: '9pt', fontWeight: '700', marginTop: '0.3mm' }}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
        </div>
        <hr style={s.ds} />

      </div></div>
    </div>
  );
}
