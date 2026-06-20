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
  const barW = 0.3;
  const height = 35;
  const totalW = bits.length * barW;

  return (
    <svg width={totalW} height={height} style={{ display: 'block', margin: '0 auto' }}>
      {bits.split('').map((bit, i) =>
        bit === '1' ? (
          <rect key={i} x={i * barW} y={0} width={barW} height={height} fill="#000" />
        ) : null
      )}
    </svg>
  );
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
        width: 180,
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
  const cashierName = sale.user_name || 'Admin';
  const logoUrl = company.logo_url ? `${BACKEND_URL}${company.logo_url}` : '';

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
        .receipt { width: 72mm; padding: 3mm 4mm; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 9pt; line-height: 1.3; margin: 0 auto; background: #fff; word-break: break-all; }
        .receipt table { width: 100%; border-collapse: collapse; }
        .r-center { text-align: center; }
        .r-right { text-align: right; }
        .r-left { text-align: left; }
        .r-bold { font-weight: 700; }
        .r-shop-name { font-size: 14pt; font-weight: 900; letter-spacing: 1px; }
        .r-shop-info { font-size: 8pt; line-height: 1.5; }
        .r-dash { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
        .r-dot { border: none; border-top: 0.5px dotted #999; margin: 1mm 0; }
        .r-info { width: 100%; font-size: 7.5pt; margin-bottom: 1mm; }
        .r-info td { padding: 0.3mm 0; vertical-align: bottom; }
        .r-customer { font-size: 7.5pt; margin-bottom: 1mm; }
        .r-items { width: 100%; font-size: 7pt; margin-bottom: 2mm; }
        .r-items th { padding: 0.8mm 0.5mm; font-weight: 700; text-align: left; border-top: 1px dashed #000; border-bottom: 1px dashed #000; font-size: 7pt; }
        .r-items td { padding: 0.6mm 0.5mm; border-bottom: 0.5px dotted #ddd; vertical-align: bottom; }
        .r-items td.amt { text-align: right; }
        .r-items td.ctr { text-align: center; }
        .r-items .item-name { max-width: 22mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .r-totals { width: 100%; font-size: 8pt; }
        .r-totals td { padding: 0.5mm 0.5mm; }
        .r-totals .label { text-align: left; }
        .r-totals .value { text-align: right; }
        .r-grand-total { width: 100%; font-size: 10pt; font-weight: 900; background: #000; color: #fff; }
        .r-grand-total td { padding: 1mm 0.5mm; }
        .r-grand-total .label { text-align: left; }
        .r-grand-total .value { text-align: right; }
        .r-two-col { width: 100%; font-size: 7pt; margin-bottom: 2mm; }
        .r-two-col td { padding: 0.3mm 0.5mm; vertical-align: top; }
        .r-two-col .col-title { font-weight: 700; font-size: 7.5pt; margin-bottom: 0.5mm; }
        .r-qr { text-align: center; margin: 2mm 0; }
        .r-qr img { width: 35mm; height: 35mm; }
        .r-barcode { text-align: center; margin: 2mm 0; }
        .r-barcode-label { font-size: 6pt; margin-top: 0.5mm; color: #555; }
        .r-footer { text-align: center; margin-top: 2mm; padding-top: 2mm; border-top: 1px dashed #000; }
        .r-footer .r-thankyou { font-weight: 900; font-size: 10pt; letter-spacing: 1px; }
        .r-footer .r-shop { font-size: 8pt; margin-top: 0.5mm; }
      `}</style>

      <div className="receipt">
        {/* ═══════════ 1. SHOP NAME (center, large bold) ═══════════ */}
        <div className="r-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ maxWidth: '40mm', maxHeight: '15mm', objectFit: 'contain', marginBottom: '0.5mm' }}
              crossOrigin="anonymous"
            />
          )}
          <div className="r-shop-name">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          <div className="r-shop-info">
            {company.address && <div>{company.address}</div>}
            {company.mobile && <div>Phone: {company.mobile}</div>}
            {company.email && <div>{company.email}</div>}
          </div>
        </div>

        {/* ═══════════ 2. DASHED SEPARATOR ═══════════ */}
        <hr className="r-dash" />

        {/* ═══════════ 3. INVOICE DETAILS (left) | CUSTOMER (right) ═══════════ */}
        <table className="r-info">
          <tbody>
            <tr>
              <td className="r-left">
                Bill No: {billNum}<br />
                Date: {formatDate(sale.bill_date)}<br />
                Time: {formatTime(sale.bill_time)}<br />
                Cashier: {cashierName}
              </td>
              <td className="r-right">
                Customer: {sale.customer_name || 'Walk-In'}<br />
                {sale.customer_mobile ? `Mobile: ${sale.customer_mobile}` : ''}<br />
                {sale.customer_address || ''}
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="r-dash" />

        {/* ═══════════ 4. ITEMS TABLE ═══════════ */}
        <table className="r-items">
          <thead>
            <tr>
              <th style={{ width: '4mm', textAlign: 'center' }}>#</th>
              <th style={{ textAlign: 'left' }}>Item Name</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Unit</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '11mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '7mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ width: '13mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="ctr">{idx + 1}</td>
                <td><span className="item-name">{item.product_name}</span></td>
                <td className="ctr">{item.unit || '-'}</td>
                <td className="ctr">{Number(item.quantity)}</td>
                <td className="amt">{Number(item.rate).toFixed(2)}</td>
                <td className="ctr">{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td className="amt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3mm', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="r-dash" />

        {/* ═══════════ 5. SUB TOTAL & DISCOUNT ═══════════ */}
        <table className="r-totals">
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
          </tbody>
        </table>

        {/* ═══════════ 6. GRAND TOTAL (black bg, white text) ═══════════ */}
        <table className="r-grand-total">
          <tbody>
            <tr>
              <td className="label">Grand Total</td>
              <td className="value">{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr className="r-dash" />

        {/* ═══════════ 7. PAYMENT INFO (left) | BANK DETAILS (right) ═══════════ */}
        <table className="r-two-col">
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div className="col-title">Payment Info</div>
                <div>Mode: {(sale.payment_mode || 'CASH').toUpperCase()}</div>
                <div>Amount: {formatCurrency(Math.round(grandTotal))}</div>
              </td>
              <td style={{ width: '50%' }}>
                <div className="col-title">Bank Details</div>
                <div>{settings['bank_name'] || '-'}</div>
                <div>{settings['account_name'] ? `Name: ${settings['account_name']}` : ''}</div>
                <div>{settings['account_number'] ? `A/c: ${settings['account_number']}` : ''}</div>
                <div>{settings['ifsc_code'] ? `IFSC: ${settings['ifsc_code']}` : ''}</div>
                {upiId && <div>UPI: {upiId}</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {sale.notes && (
          <div style={{ fontSize: '7pt', marginBottom: '1mm' }}>
            Notes: {sale.notes}
          </div>
        )}

        {/* ═══════════ 8. QR CODE (centered) ═══════════ */}
        {qrDataUrl && (
          <div className="r-qr">
            <img src={qrDataUrl} alt="UPI QR" />
          </div>
        )}

        {/* ═══════════ 9. BARCODE (below QR) ═══════════ */}
        <div className="r-barcode">
          <Barcode39 value={billNum || company.company_name || 'BILL'} />
          <div className="r-barcode-label">{billNum || 'BILL'}</div>
        </div>

        {/* ═══════════ 10. FOOTER ═══════════ */}
        <hr className="r-dash" />
        <div className="r-footer">
          <div className="r-thankyou">THANK YOU VISIT AGAIN!</div>
          <div className="r-shop">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
        </div>
      </div>
    </div>
  );
}
