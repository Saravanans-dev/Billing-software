import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../../lib/utils';
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

  const colSizes = { sn: '4mm', unit: '6mm', qty: '7mm', rate: '12mm', disc: '7mm', amt: '14mm' };

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
          padding: 2.5mm 4mm;
          font-family: 'Courier New', 'Courier', monospace;
          color: #000;
          font-size: 9pt;
          line-height: 1.35;
          margin: 0 auto;
          background: #fff;
        }
        .r table { width: 100%; border-collapse: collapse; }
        .r-c { text-align: center; }
        .r-r { text-align: right; }
        .r-l { text-align: left; }
        .r-b { font-weight: 700; }
        .shop-name { font-size: 14pt; font-weight: 900; letter-spacing: 0.5px; }
        .shop-info { font-size: 8pt; line-height: 1.5; }
        .sep { border: none; border-top: 1px dashed #000; margin: 1.8mm 0; }
        .info { width: 100%; font-size: 8pt; margin-bottom: 1mm; }
        .info td { padding: 0.2mm 0; vertical-align: top; }
        .tbl { width: 100%; font-size: 7.5pt; margin-bottom: 1.5mm; }
        .tbl th {
          padding: 0.6mm 0.4mm;
          font-weight: 700;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          font-size: 7pt;
          white-space: nowrap;
        }
        .tbl td { padding: 0.4mm 0.4mm; border-bottom: 0.5px dotted #ccc; vertical-align: bottom; }
        .sum { width: 100%; font-size: 8pt; margin-bottom: 1mm; }
        .sum td { padding: 0.4mm 0.4mm; }
        .gt {
          width: 100%;
          font-size: 10pt;
          font-weight: 900;
          background: #000;
          color: #fff;
        }
        .gt td { padding: 0.8mm 0.4mm; }
        .two { width: 100%; font-size: 7.5pt; margin-bottom: 1.5mm; }
        .two td { padding: 0.2mm 0.4mm; vertical-align: top; }
        .two .hd { font-weight: 700; font-size: 8pt; margin-bottom: 0.3mm; }
        .qr { text-align: center; margin: 1.5mm 0; }
        .qr img { width: 32mm; height: 32mm; }
        .foot { text-align: center; margin-top: 1.5mm; padding-top: 1.5mm; border-top: 1px dashed #000; }
        .foot .tk { font-weight: 900; font-size: 10pt; letter-spacing: 0.5px; }
        .foot .sn { font-size: 8pt; margin-top: 0.3mm; }
      `}</style>

      <div className="r">
        {/* SHOP HEADER */}
        <div className="r-c">
          <div className="shop-name">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
          <div className="shop-info">
            {company.address ? <div>{company.address}</div> : null}
            {company.mobile ? <div>Phone: {company.mobile}</div> : null}
            {company.gst_number ? <div>GST: {company.gst_number}</div> : null}
          </div>
        </div>

        <hr className="sep" />

        {/* INVOICE LEFT | CUSTOMER RIGHT */}
        <table className="info">
          <tbody>
            <tr>
              <td className="r-l">
                Bill No: {billNum}<br />
                Date: {formatDate(sale.bill_date)}<br />
                Time: {formatTime(sale.bill_time)}<br />
                Cashier: {cashierName}
              </td>
              <td className="r-r">
                {sale.customer_name && sale.customer_name !== 'Walk-In Customer' ? (
                  <>
                    {sale.customer_name}<br />
                    {sale.customer_mobile || ''}
                  </>
                ) : (
                  'Customer: Walk-In'
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <hr className="sep" />

        {/* ITEMS TABLE */}
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: colSizes.sn, textAlign: 'center' }}>#</th>
              <th style={{ textAlign: 'left' }}>Item Name</th>
              <th style={{ width: colSizes.unit, textAlign: 'center' }}>Unit</th>
              <th style={{ width: colSizes.qty, textAlign: 'center' }}>Qty</th>
              <th style={{ width: colSizes.rate, textAlign: 'right' }}>Rate</th>
              <th style={{ width: colSizes.disc, textAlign: 'center' }}>Disc%</th>
              <th style={{ width: colSizes.amt, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ maxWidth: '22mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</td>
                <td style={{ textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3mm', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <hr className="sep" />

        {/* SUB TOTAL & DISCOUNT */}
        <table className="sum">
          <tbody>
            <tr>
              <td className="r-l">Sub Total</td>
              <td className="r-r">{formatCurrency(subtotal)}</td>
            </tr>
            {discountAmount > 0 ? (
              <tr>
                <td className="r-l">Discount</td>
                <td className="r-r">-{formatCurrency(discountAmount)}</td>
              </tr>
            ) : null}
            {gstAmount > 0 ? (
              <tr>
                <td className="r-l">GST</td>
                <td className="r-r">{formatCurrency(gstAmount)}</td>
              </tr>
            ) : null}
            {roundOff !== 0 ? (
              <tr>
                <td className="r-l">Round Off</td>
                <td className="r-r">{roundOff.toFixed(2)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* GRAND TOTAL */}
        <table className="gt">
          <tbody>
            <tr>
              <td className="r-l">Grand Total</td>
              <td className="r-r">{formatCurrency(Math.round(grandTotal))}</td>
            </tr>
          </tbody>
        </table>

        <hr className="sep" />

        {/* PAYMENT & BANK */}
        <table className="two">
          <tbody>
            <tr>
              <td style={{ width: '50%' }}>
                <div className="hd">Payment</div>
                <div>Mode: {(sale.payment_mode || 'CASH').toUpperCase()}</div>
                <div>Amount: {formatCurrency(Math.round(grandTotal))}</div>
              </td>
              <td style={{ width: '50%' }}>
                <div className="hd">Bank</div>
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
          <div className="qr">
            <img src={qrDataUrl} alt="UPI QR" />
          </div>
        ) : null}

        {/* FOOTER */}
        <hr className="sep" />
        <div className="foot">
          <div className="tk">THANK YOU VISIT AGAIN!</div>
          <div className="sn">{company.company_name?.toUpperCase() || 'SHOP NAME'}</div>
        </div>
      </div>
    </div>
  );
}
