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
        width: 150,
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

  return (
    <div>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .receipt-table { width: 100%; border-collapse: collapse; font-size: 7.5px; }
        .receipt-table th {
          padding: 1.2mm 0.8mm;
          font-weight: 700;
          text-align: left;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          font-size: 7px;
          white-space: nowrap;
        }
        .receipt-table td {
          padding: 0.6mm 0.8mm;
          font-size: 7.5px;
          border-bottom: 1px dotted #ddd;
        }
        .receipt-table tr:last-child td { border-bottom: none; }
        .receipt-table .amt { text-align: right; padding-right: 0.3mm; }
        .receipt-table .ctr { text-align: center; }
      `}</style>
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: '80mm',
          maxWidth: '80mm',
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: '9px',
          lineHeight: '1.3',
          padding: '2mm 2.5mm',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5mm' }}>
          {company.logo_url && (
            <div style={{ flexShrink: 0, marginRight: '2mm' }}>
              <img
                src={`${BACKEND_URL}${company.logo_url}`}
                alt="Logo"
                style={{ width: '12mm', height: '12mm', objectFit: 'contain' }}
              />
            </div>
          )}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.5px', marginBottom: '0.3mm' }}>
              {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
            </div>
            <div style={{ fontSize: '6.5px', lineHeight: '1.3', color: '#444' }}>
              <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
              <div>Phone: {company.mobile || '9876543210'} {company.gst_number ? `| GSTIN: ${company.gst_number}` : ''}</div>
              {company.email && <div>Email: {company.email}</div>}
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ INVOICE DETAILS ═══════════ */}
        <div style={{ fontSize: '7.5px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 800, marginBottom: '0.5mm', letterSpacing: '1px' }}>
            {sale.bill_number}
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <div><strong>Date:</strong> {formatDate(sale.bill_date)} &nbsp; <strong>Time:</strong> {formatTime(sale.bill_time)}</div>
                  <div><strong>Cashier:</strong> {sale.user_name || '-'}</div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
                  <div><strong>Customer:</strong> {sale.customer_name || 'Walk-In'}</div>
                  <div><strong>Mobile:</strong> {sale.customer_mobile || '-'}</div>
                  {sale.customer_gst && <div><strong>GST:</strong> {sale.customer_gst}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="receipt-table" style={{ marginBottom: '0.5mm' }}>
          <thead>
            <tr>
              <th style={{ width: '5mm', textAlign: 'center' }}>#</th>
              <th>Item</th>
              <th style={{ width: '5mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '11mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '5mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ width: '12mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="ctr">{idx + 1}</td>
                <td>{item.product_name}</td>
                <td className="ctr">{Number(item.quantity)}{item.unit ? `/${item.unit}` : ''}</td>
                <td className="amt">{Number(item.rate).toFixed(2)}</td>
                <td className="ctr">
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td className="amt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ═══════════ ITEMS COUNT ═══════════ */}
        <div style={{ fontSize: '7px', textAlign: 'right', marginBottom: '1mm', color: '#555' }}>
          Items: {items.length} &nbsp;|&nbsp; Total Qty: {totalQty}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '8px', lineHeight: '1.6', marginBottom: '1mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
            <span>Sub Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {cgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
              <span>CGST @ {((gstTotal / 2 / subtotal) * 100).toFixed(2)}%</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
              <span>SGST @ {((gstTotal / 2 / subtotal) * 100).toFixed(2)}%</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
          )}
          {roundOff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
              <span>Round Off</span>
              <span>{roundOff.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* ═══════════ GRAND TOTAL ═══════════ */}
        <div
          style={{
            background: '#000',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 900,
            fontSize: '12px',
            padding: '1.2mm 2mm',
            marginBottom: '1.5mm',
          }}
        >
          <span>GRAND TOTAL</span>
          <span>₹ {Math.round(grandTotal).toFixed(2)}</span>
        </div>

        {/* ═══════════ AMOUNT IN WORDS ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.4', marginBottom: '1.5mm', textAlign: 'center' }}>
          <span style={{ fontWeight: 700 }}>Amount In Words:</span>
          <div style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '6.5px', marginTop: '0.3mm' }}>
            {numberToWords(Math.round(grandTotal))} ONLY
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ PAYMENT INFORMATION ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>
            PAYMENT DETAILS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
            <span>Mode</span>
            <span style={{ fontWeight: 600 }}>{(sale.payment_mode || 'CASH').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
            <span>Amount Paid</span>
            <span style={{ fontWeight: 600 }}>₹ {Math.round(grandTotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2mm 0' }}>
            <span>Reference</span>
            <span style={{ fontWeight: 600 }}>{sale.bill_number || '-'}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ BANK DETAILS ═══════════ */}
        {(settings['bank_name'] || settings['account_number'] || upiId) && (
          <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
            <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>
              BANK DETAILS
            </div>
            <table style={{ width: '100%' }}>
              <tbody>
                {settings['bank_name'] && settings['account_number'] && (
                  <tr>
                    <td style={{ width: '50%', padding: '0.2mm 0' }}>
                      <strong>Bank:</strong> {settings['bank_name']}
                    </td>
                    <td style={{ width: '50%', padding: '0.2mm 0', textAlign: 'right' }}>
                      <strong>A/c:</strong> {settings['account_number']}
                    </td>
                  </tr>
                )}
                {settings['account_name'] && (
                  <tr>
                    <td style={{ padding: '0.2mm 0' }}>
                      <strong>Name:</strong> {settings['account_name']}
                    </td>
                    {settings['ifsc_code'] && (
                      <td style={{ padding: '0.2mm 0', textAlign: 'right' }}>
                        <strong>IFSC:</strong> {settings['ifsc_code']}
                      </td>
                    )}
                  </tr>
                )}
                {upiId && (
                  <tr>
                    <td colSpan={2} style={{ padding: '0.2mm 0' }}>
                      <strong>UPI:</strong> {upiId}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ QR CODE ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5mm 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', fontWeight: 600, marginBottom: '0.8mm' }}>Scan & Pay (UPI)</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '30mm', height: '30mm' }} />
            ) : (
              <div
                style={{
                  width: '30mm',
                  height: '30mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7px',
                  color: '#999',
                  border: '1px dashed #ccc',
                }}
              >
                UPI QR
              </div>
            )}

          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ TERMS & CONTACT ═══════════ */}
        <div style={{ fontSize: '6.5px', lineHeight: '1.5', marginBottom: '1.5mm', color: '#444', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '7px', marginBottom: '0.3mm' }}>Terms:</div>
          <div>1. Goods once sold cannot be returned.</div>
          <div>2. Please retain this receipt for future reference.</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ textAlign: 'center', marginTop: '1.5mm', marginBottom: '2mm' }}>
          <div style={{ fontWeight: 900, fontSize: '10px', letterSpacing: '1px', marginBottom: '0.5mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: 700, fontSize: '7px' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '6.5px', color: '#666', marginTop: '0.3mm' }}>
            WhatsApp: {settings['whatsapp'] || company.mobile || '9876543210'} &nbsp;|&nbsp; Email: {settings['receipt_email'] || company.email || '-'}
          </div>
          {settings['instagram'] && (
            <div style={{ fontSize: '6.5px', color: '#666' }}>
              Instagram: {settings['instagram']}
            </div>
          )}
          <div style={{ fontSize: '6px', color: '#999', marginTop: '0.5mm' }}>
            Fast Service • Quality Printing • Best Prices
          </div>
        </div>
      </div>
    </div>
  );
}
