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
  const gstTotal = Number(sale.gst_amount) || 0;
  const cgst = gstTotal / 2;
  const sgst = gstTotal / 2;
  const roundOff = Number(sale.round_off) || 0;
  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity), 0);
  const upiId = settings['upi_id'] || '';

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || 'Bill'}`
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

  const fd = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const ft = (t: string) => {
    if (!t) return '';
    return t.toString().slice(0, 5);
  };

  const bc = sale.bill_number?.replace(/[^A-Za-z0-9]/g, '') || '';

  return (
    <div>
      <style>{`
        .inv-wrap {
          max-width: 780px;
          margin: 24px auto;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          border: 1px solid #e8e8ef;
          padding: 32px 36px;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          color: #1a1a2e;
          font-size: 13px;
          line-height: 1.5;
        }
        @media print {
          body { margin: 0; padding: 0; background: #fff; }
          .no-print { display: none !important; }
          .inv-wrap { box-shadow: none !important; border: 1px solid #ddd !important; margin: 0 auto; }
        }
        .inv-hdr { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid #1a1a2e; margin-bottom: 18px; }
        .inv-hdr-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 6px; flex-shrink: 0; }
        .inv-hdr-logo-pl { width: 56px; height: 56px; background: #f0f0f5; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; flex-shrink: 0; }
        .inv-hdr-info { flex: 1; }
        .inv-hdr-name { font-size: 20px; font-weight: 900; color: #1a1a2e; }
        .inv-hdr-detail { font-size: 12px; color: #555; line-height: 1.6; }
        .inv-title { text-align: center; margin-bottom: 20px; }
        .inv-title span { display: inline-block; font-size: 16px; font-weight: 800; letter-spacing: 2px; padding: 4px 28px; border-bottom: 3px double #1a1a2e; color: #1a1a2e; }
        .inv-row { display: flex; gap: 18px; margin-bottom: 18px; }
        .inv-box { flex: 1; background: #f8f9fc; border-radius: 8px; padding: 14px 16px; font-size: 12px; line-height: 1.9; }
        .inv-box-title { font-weight: 700; font-size: 12px; color: #1a1a2e; padding-bottom: 4px; border-bottom: 1px solid #e0e0e8; margin-bottom: 4px; }
        .inv-tbl { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
        .inv-tbl th { background: #1a1a2e; color: #fff; padding: 10px 8px; font-weight: 600; font-size: 11px; letter-spacing: 0.3px; white-space: nowrap; }
        .inv-tbl td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        .inv-tbl .c { text-align: center; }
        .inv-tbl .r { text-align: right; }
        .inv-count { display: flex; justify-content: flex-end; gap: 16px; font-size: 12px; color: #555; padding: 2px 0 10px; }
        .inv-sum { display: flex; justify-content: flex-end; margin-bottom: 12px; }
        .inv-sum table { width: 320px; font-size: 12px; line-height: 2; }
        .inv-sum td { padding: 2px 0; }
        .inv-sum .l { text-align: left; color: #444; }
        .inv-sum .r { text-align: right; font-weight: 600; }
        .inv-gt { background: #1a1a2e; color: #fff; display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-radius: 6px; font-weight: 900; font-size: 16px; margin-bottom: 8px; }
        .inv-words { text-align: center; font-size: 12px; padding: 6px 0 12px; color: #444; }
        .inv-words strong { display: block; font-weight: 700; text-transform: uppercase; color: #1a1a2e; margin-top: 2px; }
        .inv-two { display: flex; gap: 18px; margin: 14px 0; }
        .inv-two-box { flex: 1; border: 1px solid #e0e0e8; border-radius: 8px; padding: 14px 16px; font-size: 12px; line-height: 2.1; }
        .inv-two-box-title { font-weight: 700; font-size: 12px; color: #1a1a2e; padding-bottom: 4px; border-bottom: 1px solid #e0e0e8; margin-bottom: 4px; }
        .inv-two-box .fr { display: flex; justify-content: space-between; }
        .inv-two-box .fr span:last-child { font-weight: 600; }
        .inv-bq { display: flex; gap: 18px; align-items: flex-start; margin: 14px 0; }
        .inv-bq-box { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px; border: 1px solid #e0e0e8; border-radius: 8px; }
        .inv-bq-box .lbl { font-size: 11px; font-weight: 600; color: #555; margin-bottom: 8px; }
        .inv-bc { font-family: 'Courier New', monospace; font-size: 26px; font-weight: 700; letter-spacing: 3px; line-height: 1; color: #000; margin-bottom: 2px; }
        .inv-bc-txt { font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #555; }
        .inv-terms { font-size: 11px; color: #666; line-height: 1.7; padding: 12px 0; border-top: 1px solid #e0e0e8; margin-bottom: 10px; }
        .inv-foot { text-align: center; border-top: 2px solid #1a1a2e; padding-top: 14px; }
        .inv-foot .t1 { font-weight: 900; font-size: 14px; letter-spacing: 1px; color: #1a1a2e; }
        .inv-foot .t2 { font-weight: 700; font-size: 12px; color: #555; margin-top: 2px; }
        .inv-foot .t3 { font-size: 11px; color: #999; margin-top: 2px; }
      `}</style>

      <div className="inv-wrap">
        {/* HEADER */}
        <div className="inv-hdr">
          {company.logo_url ? (
            <img className="inv-hdr-logo" src={`${BACKEND_URL}${company.logo_url}`} alt="Logo" />
          ) : (
            <div className="inv-hdr-logo-pl">Logo</div>
          )}
          <div className="inv-hdr-info">
            <div className="inv-hdr-name">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
            <div className="inv-hdr-detail">
              <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
              <div>Phone: {company.mobile || '9876543210'}{company.gst_number ? ` | GSTIN: ${company.gst_number}` : ''}{company.email ? ` | Email: ${company.email}` : ''}</div>
            </div>
          </div>
        </div>

        {/* TITLE */}
        <div className="inv-title"><span>TAX INVOICE</span></div>

        {/* INVOICE & CUSTOMER */}
        <div className="inv-row">
          <div className="inv-box">
            <div className="inv-box-title">INVOICE</div>
            <div><strong>Invoice No:</strong> {sale.bill_number}</div>
            <div><strong>Date:</strong> {fd(sale.bill_date)}</div>
            <div><strong>Time:</strong> {ft(sale.bill_time)}</div>
            <div><strong>Cashier ID:</strong> {sale.user_id?.slice(0, 8) || '-'}</div>
            <div><strong>Cashier:</strong> {sale.user_name || '-'}</div>
          </div>
          <div className="inv-box">
            <div className="inv-box-title">CUSTOMER</div>
            <div><strong>Customer ID:</strong> {sale.customer_id?.slice(0, 8) || 'WALK-IN'}</div>
            <div><strong>Name:</strong> {sale.customer_name || 'Walk-In Customer'}</div>
            <div><strong>Mobile:</strong> {sale.customer_mobile || '-'}</div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className="inv-tbl">
          <thead>
            <tr>
              <th style={{ width: '30px' }} className="c">#</th>
              <th>Item Name</th>
              <th style={{ width: '55px' }} className="c">Unit</th>
              <th style={{ width: '48px' }} className="c">Qty</th>
              <th style={{ width: '80px' }} className="r">Rate</th>
              <th style={{ width: '55px' }} className="c">Disc%</th>
              <th style={{ width: '95px' }} className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="c" style={{ color: '#888' }}>{idx + 1}</td>
                <td>{item.product_name}</td>
                <td className="c">{item.unit || '-'}</td>
                <td className="c">{Number(item.quantity)}</td>
                <td className="r">{Number(item.rate).toFixed(2)}</td>
                <td className="c">{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
                <td className="r" style={{ fontWeight: 600 }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>No items</td></tr>
            )}
          </tbody>
        </table>

        <div className="inv-count">
          <span><strong>Items Count:</strong> {items.length}</span>
          <span><strong>Total Quantity:</strong> {totalQty}</span>
        </div>

        {/* SUMMARY */}
        <div className="inv-sum">
          <table>
            <tbody>
              <tr><td className="l">Sub Total</td><td className="r">{formatCurrency(subtotal)}</td></tr>
              {discountAmount > 0 && <tr><td className="l">Discount</td><td className="r" style={{ color: '#e53935' }}>-{formatCurrency(discountAmount)}</td></tr>}
              {cgst > 0 && <tr><td className="l">CGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</td><td className="r">{formatCurrency(cgst)}</td></tr>}
              {sgst > 0 && <tr><td className="l">SGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</td><td className="r">{formatCurrency(sgst)}</td></tr>}
              {roundOff !== 0 && <tr><td className="l">Round Off</td><td className="r">{roundOff.toFixed(2)}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="inv-gt">
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        <div className="inv-words">
          Amount In Words:
          <strong>{numberToWords(Math.round(grandTotal))} ONLY</strong>
        </div>

        {/* PAYMENT & BANK */}
        <div className="inv-two">
          <div className="inv-two-box">
            <div className="inv-two-box-title">PAYMENT INFORMATION</div>
            <div className="fr"><span>Payment Method</span><span>{(sale.payment_mode || 'CASH').toUpperCase()}</span></div>
            <div className="fr"><span>Received Amount</span><span>{formatCurrency(Math.round(grandTotal))}</span></div>
            <div className="fr"><span>Balance Amount</span><span>{formatCurrency(0)}</span></div>
            <div className="fr"><span>Reference Number</span><span>{sale.bill_number || '-'}</span></div>
          </div>
          <div className="inv-two-box">
            <div className="inv-two-box-title">BANK DETAILS</div>
            <div className="fr"><span>Bank Name</span><span>{settings['bank_name'] || '-'}</span></div>
            <div className="fr"><span>Account Name</span><span>{settings['account_name'] || '-'}</span></div>
            <div className="fr"><span>Account Number</span><span>{settings['account_number'] || '-'}</span></div>
            <div className="fr"><span>IFSC Code</span><span>{settings['ifsc_code'] || '-'}</span></div>
            <div className="fr"><span>UPI ID</span><span>{upiId || '-'}</span></div>
          </div>
        </div>

        {/* BARCODE & QR */}
        <div className="inv-bq">
          <div className="inv-bq-box">
            <div className="lbl">Invoice Barcode</div>
            <div className="inv-bc">{bc}</div>
            <div className="inv-bc-txt">{bc}</div>
          </div>
          <div className="inv-bq-box">
            <div className="lbl">Scan & Pay (UPI)</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR" style={{ width: '110px', height: '110px' }} />
            ) : (
              <div style={{ width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#999', border: '1px dashed #ccc', borderRadius: '6px' }}>
                UPI QR
              </div>
            )}
          </div>
        </div>

        {/* TERMS */}
        <div className="inv-terms">
          <strong>Terms &amp; Conditions:</strong><br />
          1. Goods once sold cannot be returned.<br />
          2. Please retain this receipt for future reference.<br />
          3. Thank you for choosing {company.company_name || 'Student Xerox'}.
        </div>

        {/* FOOTER */}
        <div className="inv-foot">
          <div className="t1">THANK YOU VISIT AGAIN!</div>
          <div className="t2">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          <div className="t3">Fast Service &bull; Quality Printing</div>
        </div>
      </div>
    </div>
  );
}
