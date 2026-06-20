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

function Barcode39({ value }: { value: string }) {
  const code39Map: Record<string, string> = {
    '0': '101001101101', '1': '110100101101', '2': '101100101101',
    '3': '110110010101', '4': '101001100101', '5': '110100110101',
    '6': '101100110101', '7': '101001011101', '8': '110100101101',
    '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101',
    'F': '101101100101', 'G': '101010011011', 'H': '110101001101',
    'I': '101101001101', 'J': '101011001101', 'K': '110101010011',
    'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011',
    'R': '110101011001', 'S': '101101011001', 'T': '101011011001',
    'U': '110010101011', 'V': '100110101011', 'W': '110011010101',
    'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101',
    '$': '100100100101', '/': '100100101001', '+': '100101001001',
    '%': '101001001001', '*': '100101101101',
  };
  const encode39 = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9\-.\s$\/+%]/g, ' ');
    const data = `*${upper}*`;
    const bits = data.split('').map(c => code39Map[c] || code39Map[' ']).join('0');
    return bits;
  };
  const bits = encode39(value);
  const barW = 0.28;
  const height = 30;
  const totalW = bits.length * barW;
  return (
    <svg width={totalW} height={height} style={{ display: 'block', margin: '0 auto' }}>
      {bits.split('').map((bit, i) =>
        bit === '1' ? <rect key={i} x={i * barW} y={0} width={barW} height={height} fill="#000" /> : null
      )}
    </svg>
  );
}

const st = {
  pg: { width: '80mm', margin: '0 auto', background: '#fff', fontFamily: "'Courier New','Courier',monospace", color: '#000', fontSize: '9pt', lineHeight: '1.3' },
  in: { width: '72mm', padding: '2mm 4mm', margin: '0 auto' },
  cc: { textAlign: 'center' as const },
  rr: { textAlign: 'right' as const },
  ll: { textAlign: 'left' as const },
  bl: { fontWeight: '700' as const },
  sh: { fontSize: '13pt', fontWeight: '900' as const, letterSpacing: '0.3px' },
  i8: { fontSize: '8pt', lineHeight: '1.45' },
  i7: { fontSize: '7.5pt', lineHeight: '1.4' },
  ds: { border: 'none', borderTop: '1px dashed #000', margin: '1.2mm 0' },
  d2: { border: 'none', borderTop: '1px dashed #000', margin: '0.8mm 0' },
  thd: { padding: '0.6mm 0.3mm', fontWeight: '700' as const, borderTop: '1px dashed #000', borderBottom: '1px dashed #000', fontSize: '7pt', whiteSpace: 'nowrap' as const },
  tdd: { padding: '0.3mm 0.3mm', borderBottom: '0.5px dotted #ddd', verticalAlign: 'bottom' as const, fontSize: '7.5pt' },
  lf: { textAlign: 'left' as const, padding: '0.3mm 0.3mm', fontSize: '8pt' },
  rg: { textAlign: 'right' as const, padding: '0.3mm 0.3mm', fontSize: '8pt' },
  gt: { fontSize: '10pt', fontWeight: '900' as const, background: '#000', color: '#fff' },
  gp: { padding: '0.7mm 0.3mm' },
  qr: { textAlign: 'center' as const, margin: '1mm 0' },
  qi: { width: '28mm', height: '28mm' },
  lo: { maxWidth: '32mm', maxHeight: '10mm', objectFit: 'contain' as const },
  ft: { textAlign: 'center' as const, fontSize: '7.5pt', lineHeight: '1.35' },
  tb: { width: '100%', borderCollapse: 'collapse' },
};

export function ThermalReceipt({ sale, company, settings }: ThermalReceiptProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const items = sale.items || [];
  const grandTotal = Number(sale.grand_total) || 0;
  const subtotal = Number(sale.subtotal) || 0;
  const discountAmount = Number(sale.discount_amount) || 0;
  const taxableAmount = Number(sale.taxable_amount) || 0;
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
      <div style={st.pg}>
      <div style={st.in}>

        {/* ─────── HEADER ─────── */}
        {logoUrl ? (
          <div style={st.cc}>
            <img src={logoUrl} alt="" style={st.lo} crossOrigin="anonymous" />
          </div>
        ) : null}
        <div style={{ ...st.cc, ...st.i8 }}>
          <div style={st.sh}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          {company.address ? <div>{company.address}</div> : null}
          <div style={{ lineHeight: '1.5' }}>
            {company.mobile ? <span>Ph: {company.mobile}</span> : null}
            {company.mobile && company.gst_number ? <span> | </span> : null}
            {company.gst_number ? <span>GSTIN: {company.gst_number}</span> : null}
          </div>
          {company.email ? <div>{company.email}</div> : null}
        </div>

        <hr style={st.ds} />

        {/* ─────── INVOICE & CUSTOMER DETAILS ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', fontSize: '7.5pt', lineHeight: '1.55' }}>
                <span style={st.bl}>Invoice Details</span><br />
                Invoice No : {billNum}<br />
                Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {formatDate(sale.bill_date)}<br />
                Time &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {formatTime(sale.bill_time)}<br />
                Cashier ID : {cashierId}<br />
                Cashier&nbsp;&nbsp;&nbsp;: {cashierName}
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', fontSize: '7.5pt', lineHeight: '1.55' }}>
                <span style={st.bl}>Customer Details</span><br />
                Customer ID : {customerId}<br />
                Name &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {sale.customer_name || 'Walk-In Customer'}<br />
                Mobile&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {sale.customer_mobile || '-'}
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={st.ds} />

        {/* ─────── ITEMS TABLE ─────── */}
        <table style={st.tb}>
          <thead>
            <tr>
              <th style={{ ...st.thd, width: '4mm', textAlign: 'center' }}>#</th>
              <th style={{ ...st.thd, textAlign: 'left' }}>Item Name</th>
              <th style={{ ...st.thd, width: '5mm', textAlign: 'center' }}>Unit</th>
              <th style={{ ...st.thd, width: '5mm', textAlign: 'center' }}>Qty</th>
              <th style={{ ...st.thd, width: '9mm', textAlign: 'right' }}>Rate</th>
              <th style={{ ...st.thd, width: '6mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ ...st.thd, width: '11mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...st.tdd, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...st.tdd, maxWidth: '24mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td style={{ ...st.tdd, textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ ...st.tdd, textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ ...st.tdd, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ ...st.tdd, textAlign: 'center' }}>{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td style={{ ...st.tdd, textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2mm', textAlign: 'center', color: '#999', fontSize: '8pt' }}>No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr style={st.d2} />

        {/* ─────── ITEMS COUNT & TOTAL QTY ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr>
              <td style={{ fontSize: '7.5pt' }}>Items Count : {items.length}</td>
              <td style={{ fontSize: '7.5pt', textAlign: 'right' }}>Total Qty : {totalQty}</td>
            </tr>
          </tbody>
        </table>

        <hr style={st.ds} />

        {/* ─────── SUMMARY ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr>
              <td style={st.lf}>Sub Total</td>
              <td style={st.rg}>{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td style={st.lf}>Discount</td>
                <td style={st.rg}>-{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            <tr>
              <td style={st.lf}>CGST</td>
              <td style={st.rg}>{formatCurrency(cgst)}</td>
            </tr>
            <tr>
              <td style={st.lf}>SGST</td>
              <td style={st.rg}>{formatCurrency(sgst)}</td>
            </tr>
            {roundOff !== 0 ? (
              <tr>
                <td style={st.lf}>Round Off</td>
                <td style={st.rg}>{roundOff.toFixed(2)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr style={st.d2} />

        {/* ─────── GRAND TOTAL ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr style={st.gt}>
              <td style={st.gp}><span style={st.bl}>GRAND TOTAL</span></td>
              <td style={{ ...st.gp, textAlign: 'right', fontWeight: '900' }}>{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr style={st.d2} />

        {/* ─────── AMOUNT IN WORDS ─────── */}
        <div style={{ fontSize: '7pt', lineHeight: '1.3', marginBottom: '0.5mm' }}>
          <span style={st.bl}>Amount In Words : </span>
          {numberToWords(Math.round(grandTotal))}
        </div>

        <hr style={st.ds} />

        {/* ─────── PAYMENT INFORMATION ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr>
              <td style={{ fontSize: '7.5pt', lineHeight: '1.5', verticalAlign: 'top', width: '50%' }}>
                <span style={st.bl}>Payment Info</span><br />
                Method&nbsp;&nbsp;: {(sale.payment_mode || 'Cash').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}<br />
                Received : {formatCurrency(Math.round(grandTotal))}<br />
                Balance&nbsp;&nbsp;: {formatCurrency(0)}<br />
                Ref No&nbsp;&nbsp;&nbsp;: {billNum}
              </td>
              <td style={{ fontSize: '7.5pt', lineHeight: '1.5', verticalAlign: 'top', width: '50%' }}>
                <span style={st.bl}>Bank Details</span><br />
                {settings['bank_name'] ? <>Bank&nbsp;&nbsp;&nbsp;&nbsp;: {settings['bank_name']}<br /></> : null}
                {settings['account_name'] ? <>Name : {settings['account_name']}<br /></> : null}
                {settings['account_number'] ? <>A/c&nbsp;&nbsp;: {settings['account_number']}<br /></> : null}
                {settings['ifsc_code'] ? <>IFSC : {settings['ifsc_code']}<br /></> : null}
                {upiId ? <>UPI&nbsp;&nbsp;: {upiId}</> : null}
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={st.ds} />

        {/* ─────── BARCODE & QR CODE ─────── */}
        <table style={st.tb}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingRight: '1mm' }}>
                <div style={{ fontWeight: '700', fontSize: '7pt', marginBottom: '0.5mm' }}>Invoice Barcode</div>
                <Barcode39 value={billNum || company.company_name || 'BILL'} />
                <div style={{ fontSize: '6pt', marginTop: '0.3mm', color: '#555' }}>{billNum || 'BILL'}</div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingLeft: '1mm' }}>
                {qrDataUrl ? (
                  <>
                    <div style={{ fontWeight: '700', fontSize: '7pt', marginBottom: '0.5mm' }}>Scan & Pay (UPI)</div>
                    <div style={st.qr}>
                      <img src={qrDataUrl} alt="UPI QR" style={st.qi} />
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '7pt', color: '#999' }}>No UPI configured</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={st.ds} />

        {/* ─────── TERMS & CONDITIONS ─────── */}
        <div style={{ fontSize: '7pt', lineHeight: '1.35', marginBottom: '1mm' }}>
          <span style={st.bl}>Terms & Conditions :</span><br />
          1. Goods once sold cannot be returned.<br />
          2. Please retain this receipt for future reference.<br />
          3. Thank you for choosing {company.company_name || 'Student Xerox'}.
        </div>

        <hr style={st.d2} />

        {/* ─────── CONTACT ─────── */}
        <div style={{ ...st.cc, ...st.i8, marginBottom: '0.5mm' }}>
          {company.email ? <div><span style={st.bl}>Email :</span> {company.email}</div> : null}
          {company.mobile ? <div><span style={st.bl}>WhatsApp :</span> {company.mobile}</div> : null}
          {settings['instagram'] ? <div><span style={st.bl}>Instagram :</span> {settings['instagram']}</div> : null}
        </div>

        <hr style={st.ds} />

        {/* ─────── FOOTER ─────── */}
        <div style={st.ft}>
          <div style={{ fontWeight: '900', fontSize: '9pt', letterSpacing: '0.3px', marginBottom: '0.3mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: '700', fontSize: '8pt' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '7pt', color: '#555', marginTop: '0.2mm' }}>
            Fast Service • Quality Printing
          </div>
        </div>

        <hr style={st.ds} />
      </div>
    </div>
    </div>
  );
}
