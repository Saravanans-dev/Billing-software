import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../lib/utils';
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

function padRight(s: string, n: number) {
  return s.padEnd(n, ' ');
}

function padLeft(s: string, n: number) {
  return s.padStart(n, ' ');
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
        margin: 1,
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
        .receipt {
          width: 72mm;
          padding: 2.5mm 3.5mm;
          font-family: 'Courier New', 'Courier', monospace;
          color: #000;
          font-size: 9pt;
          line-height: 1.35;
          margin: 0 auto;
          background: #fff;
        }
        .r-ctr { text-align: center; }
        .r-rgt { text-align: right; }
        .r-lft { text-align: left; }
        .r-bld { font-weight: 700; }
        .r-name { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; }
        .r-info { font-size: 8pt; line-height: 1.5; }
        .r-sep { border: none; border-top: 1px dashed #000; margin: 1.8mm 0; }
        .r-line { width: 100%; font-size: 8pt; margin-bottom: 1mm; }
        .r-line td { padding: 0.2mm 0; vertical-align: top; }
        .r-tbl { width: 100%; font-size: 7.5pt; margin-bottom: 1.5mm; border-collapse: collapse; }
        .r-tbl th {
          padding: 0.6mm 0.3mm;
          font-weight: 700;
          text-align: left;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          font-size: 7pt;
          white-space: nowrap;
        }
        .r-tbl td { padding: 0.4mm 0.3mm; border-bottom: 0.5px dotted #ccc; vertical-align: bottom; }
        .r-tbl .a { text-align: right; }
        .r-tbl .c { text-align: center; }
        .r-tbl td.wrp { max-width: 24mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .r-sum { width: 100%; font-size: 8pt; margin-bottom: 1mm; border-collapse: collapse; }
        .r-sum td { padding: 0.4mm 0.3mm; }
        .r-sum .l { text-align: left; }
        .r-sum .v { text-align: right; }
        .r-gt {
          width: 100%;
          font-size: 10pt;
          font-weight: 900;
          background: #000;
          color: #fff;
          border-collapse: collapse;
        }
        .r-gt td { padding: 0.8mm 0.3mm; }
        .r-gt .l { text-align: left; }
        .r-gt .v { text-align: right; }
        .r-2col { width: 100%; font-size: 7.5pt; margin-bottom: 1.5mm; border-collapse: collapse; }
        .r-2col td { padding: 0.2mm 0.3mm; vertical-align: top; }
        .r-2col .t { font-weight: 700; font-size: 8pt; margin-bottom: 0.3mm; }
        .r-qr { text-align: center; margin: 1.5mm 0; }
        .r-qr img { width: 32mm; height: 32mm; }
        .r-bar { text-align: center; margin: 1.5mm 0; }
        .r-bar-lbl { font-size: 6pt; margin-top: 0.3mm; color: #555; }
        .r-foot { text-align: center; margin-top: 1.5mm; padding-top: 1.5mm; border-top: 1px dashed #000; }
        .r-foot .r-tku { font-weight: 900; font-size: 10pt; letter-spacing: 0.5px; }
        .r-foot .r-sn { font-size: 8pt; margin-top: 0.3mm; }
      `}</style>

      <div className="receipt">
        {/* SHOP HEADER */}
        <div className="r-ctr">
          <div className="r-name">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          <div className="r-info">
            {company.address ? <div>{company.address}</div> : null}
            {company.mobile ? <div>Phone: {company.mobile}</div> : null}
            {company.email ? <div>{company.email}</div> : null}
            {company.gst_number ? <div>GST: {company.gst_number}</div> : null}
          </div>
        </div>

        <hr className="r-sep" />

        {/* BILL & CUSTOMER INFO */}
        <table className="r-line">
          <tbody>
            <tr>
              <td className="r-lft">
                Bill No: {billNum}<br />
                Date: {formatDate(sale.bill_date)}<br />
                Time: {formatTime(sale.bill_time)}<br />
                Cashier: {cashierName}
              </td>
              <td className="r-rgt">
                {sale.customer_name && sale.customer_name !== 'Walk-In Customer' ? (
                  <>
                    {sale.customer_name}<br />
                    {sale.customer_mobile || ''}
                  </>
                ) : (
                  <>Customer: Walk-In</>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="r-sep" />

        {/* ITEMS TABLE */}
        <table className="r-tbl">
          <thead>
            <tr>
              <th style={{ width: '4mm', textAlign: 'center' }}>#</th>
              <th>Item</th>
              <th style={{ width: '5mm', textAlign: 'center' }}>Unt</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '11mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Disc</th>
              <th style={{ width: '13mm', textAlign: 'right' }}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="c">{idx + 1}</td>
                <td className="wrp">{item.product_name}</td>
                <td className="c">{item.unit || '-'}</td>
                <td className="c">{Number(item.quantity)}</td>
                <td className="a">{Number(item.rate).toFixed(2)}</td>
                <td className="c">{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td className="a">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3mm', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="r-sep" />

        {/* TOTALS */}
        <table className="r-sum">
          <tbody>
            <tr>
              <td className="l">Sub Total</td>
              <td className="v">{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td className="l">Discount</td>
                <td className="v">-{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            {gstAmount > 0 ? (
              <tr>
                <td className="l">GST</td>
                <td className="v">{formatCurrency(gstAmount)}</td>
              </tr>
            ) : null}
            {roundOff !== 0 ? (
              <tr>
                <td className="l">Round Off</td>
                <td className="v">{roundOff.toFixed(2)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* GRAND TOTAL */}
        <table className="r-gt">
          <tbody>
            <tr>
              <td className="l">Grand Total</td>
              <td className="v">{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr className="r-sep" />

        {/* PAYMENT & BANK */}
        <table className="r-2col">
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div className="t">Payment</div>
                <div>Mode: {(sale.payment_mode || 'CASH').toUpperCase()}</div>
                <div>Amount: {formatCurrency(Math.round(grandTotal))}</div>
              </td>
              <td style={{ width: '50%' }}>
                <div className="t">Bank</div>
                <div>{settings['bank_name'] || '-'}</div>
                {settings['account_number'] ? <div>A/c: {settings['account_number']}</div> : null}
                {settings['ifsc_code'] ? <div>IFSC: {settings['ifsc_code']}</div> : null}
                {upiId ? <div>UPI: {upiId}</div> : null}
              </td>
            </tr>
          </tbody>
        </table>

        {sale.notes ? (
          <div style={{ fontSize: '7.5pt', marginBottom: '1mm' }}>Notes: {sale.notes}</div>
        ) : null}

        {/* QR CODE */}
        {qrDataUrl ? (
          <div className="r-qr">
            <img src={qrDataUrl} alt="UPI QR" />
          </div>
        ) : null}

        {/* BARCODE */}
        <div className="r-bar">
          <Barcode39 value={billNum || company.company_name || 'BILL'} />
          <div className="r-bar-lbl">{billNum || 'BILL'}</div>
        </div>

        {/* FOOTER */}
        <hr className="r-sep" />
        <div className="r-foot">
          <div className="r-tku">THANK YOU VISIT AGAIN!</div>
          <div className="r-sn">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
        </div>
      </div>
    </div>
  );
}
