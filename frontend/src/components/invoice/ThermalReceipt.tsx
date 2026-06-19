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

  const barcodeChars = sale.bill_number?.replace(/[^A-Za-z0-9]/g, '') || '';

  return (
    <div>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .rt { width: 100%; border-collapse: collapse; font-size: 7.5px; }
        .rt th {
          padding: 1mm 0.6mm; font-weight: 700; text-align: left;
          border-bottom: 1px solid #000; border-top: 1px solid #000;
          font-size: 7px; white-space: nowrap;
        }
        .rt td { padding: 0.5mm 0.6mm; font-size: 7.5px; }
        .rt .b { border-bottom: 1px dotted #ccc; }
        .rt .amt { text-align: right; }
        .rt .ctr { text-align: center; }
        .bcode {
          font-family: 'Courier New', monospace;
          font-size: 24px; font-weight: 700; letter-spacing: 2.5px;
          transform: scaleY(2.8); display: inline-block;
          line-height: 1; color: #000;
        }
      `}</style>
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: '80mm', maxWidth: '80mm',
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: '9px', lineHeight: '1.3',
          padding: '2mm 2.5mm',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ textAlign: 'center', marginBottom: '1.5mm' }}>
          {company.logo_url && (
            <img
              src={`${BACKEND_URL}${company.logo_url}`}
              alt="Logo"
              style={{ maxWidth: '30mm', maxHeight: '10mm', margin: '0 auto 1mm', objectFit: 'contain' }}
            />
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px', marginBottom: '0.5mm' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '7px', lineHeight: '1.4', color: '#444' }}>
            <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
            <div>Phone: {company.mobile || '9876543210'} {company.gst_number ? `| GSTIN: ${company.gst_number}` : ''}</div>
            <div>{company.email ? `Email: ${company.email}` : ''}{settings['website'] ? ` | Web: ${settings['website']}` : ''}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ INVOICE & CUSTOMER ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>INVOICE</div>
                  <div><strong>Invoice No:</strong> {sale.bill_number}</div>
                  <div><strong>Date:</strong> {formatDate(sale.bill_date)}</div>
                  <div><strong>Time:</strong> {formatTime(sale.bill_time)}</div>
                  <div><strong>Cashier ID:</strong> {sale.user_id?.slice(0, 8) || '-'}</div>
                  <div><strong>Cashier:</strong> {sale.user_name || '-'}</div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>CUSTOMER</div>
                  <div><strong>Customer ID:</strong> {sale.customer_id?.slice(0, 8) || 'WALK-IN'}</div>
                  <div><strong>Name:</strong> {sale.customer_name || 'Walk-In Customer'}</div>
                  <div><strong>Mobile:</strong> {sale.customer_mobile || '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="rt" style={{ marginBottom: '0.5mm' }}>
          <thead>
            <tr>
              <th style={{ width: '4mm', textAlign: 'center' }}>#</th>
              <th>Item Name</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Unit</th>
              <th style={{ width: '5mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '10mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '6mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ width: '11mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} className="b">
                <td className="ctr">{idx + 1}</td>
                <td>{item.product_name}</td>
                <td className="ctr">{item.unit || '-'}</td>
                <td className="ctr">{Number(item.quantity)}</td>
                <td className="amt">{Number(item.rate).toFixed(2)}</td>
                <td className="ctr">
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td className="amt">{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: '7px', display: 'flex', justifyContent: 'space-between', margin: '0.5mm 0 1mm', color: '#555' }}>
          <span><strong>Items Count:</strong> {items.length}</span>
          <span><strong>Total Quantity:</strong> {totalQty}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '7.5px', lineHeight: '1.6', marginBottom: '1mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Sub Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {cgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>CGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>SGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
          )}
          {roundOff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>Round Off</span>
              <span>{roundOff.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div
          style={{
            background: '#000', color: '#fff', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            fontWeight: 900, fontSize: '12px',
            padding: '1.5mm 2.5mm', marginBottom: '1.5mm',
          }}
        >
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        <div style={{ fontSize: '7px', lineHeight: '1.4', marginBottom: '1.5mm', textAlign: 'center' }}>
          <span style={{ fontWeight: 700 }}>Amount In Words:</span>
          <div style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '6.5px', marginTop: '0.3mm' }}>
            {numberToWords(Math.round(grandTotal))} ONLY
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ PAYMENT INFORMATION ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm', textAlign: 'center' }}>
            PAYMENT INFORMATION
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Payment Method</span>
            <span style={{ fontWeight: 600 }}>{(sale.payment_mode || 'CASH').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Received Amount</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(Math.round(grandTotal))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Balance Amount</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Reference Number</span>
            <span style={{ fontWeight: 600 }}>{sale.bill_number || '-'}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ BANK DETAILS ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm', textAlign: 'center' }}>
            BANK DETAILS
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '40%', padding: '0.3mm 0' }}><strong>Bank Name</strong></td>
                <td style={{ width: '60%', padding: '0.3mm 0', textAlign: 'right' }}>{settings['bank_name'] || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.3mm 0' }}><strong>Account Name</strong></td>
                <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{settings['account_name'] || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.3mm 0' }}><strong>Account Number</strong></td>
                <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{settings['account_number'] || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.3mm 0' }}><strong>IFSC Code</strong></td>
                <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{settings['ifsc_code'] || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.3mm 0' }}><strong>UPI ID</strong></td>
                <td style={{ padding: '0.3mm 0', textAlign: 'right' }}>{upiId || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ BARCODE & QR CODE ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '1.5mm 0' }}>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', fontWeight: 600, marginBottom: '1mm' }}>Invoice Barcode</div>
            <div className="bcode">{barcodeChars}</div>
            <div style={{ fontSize: '6.5px', fontWeight: 600, marginTop: '0.5mm', letterSpacing: '1px' }}>
              {barcodeChars}
            </div>
          </div>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', fontWeight: 600, marginBottom: '1mm' }}>Scan & Pay (UPI)</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '28mm', height: '28mm' }} />
            ) : (
              <div style={{ width: '28mm', height: '28mm', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: '#999', border: '1px dashed #ccc' }}>
                UPI QR
              </div>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #aaa', margin: '1mm 0' }} />

        {/* ═══════════ TERMS & CONDITIONS ═══════════ */}
        <div style={{ fontSize: '6.5px', lineHeight: '1.5', marginBottom: '1mm', color: '#444' }}>
          <div style={{ fontWeight: 700, fontSize: '7px', marginBottom: '0.3mm' }}>Terms & Conditions:</div>
          <div>1. Goods once sold cannot be returned.</div>
          <div>2. Please retain this receipt for future reference.</div>
          <div>3. Thank you for choosing {company.company_name || 'Student Xerox'}.</div>
        </div>

        {/* ═══════════ CONTACT ═══════════ */}
        <div style={{ fontSize: '6.5px', lineHeight: '1.5', marginBottom: '1.5mm', textAlign: 'center', color: '#444' }}>
          <div style={{ fontWeight: 700, fontSize: '7px', marginBottom: '0.3mm' }}>Contact Us</div>
          <div>Website: {settings['website'] || '-'}</div>
          <div>Email: {settings['receipt_email'] || company.email || '-'}</div>
          <div>WhatsApp: {settings['whatsapp'] || company.mobile || '-'}</div>
          <div>Instagram: {settings['instagram'] || '-'}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1mm 0' }} />

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ textAlign: 'center', marginTop: '1.5mm', marginBottom: '2mm' }}>
          <div style={{ fontWeight: 900, fontSize: '11px', letterSpacing: '1px', marginBottom: '0.5mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: 700, fontSize: '8px' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '6.5px', color: '#666', marginTop: '0.3mm' }}>
            Fast Service • Quality Printing
          </div>
        </div>
      </div>
    </div>
  );
}
