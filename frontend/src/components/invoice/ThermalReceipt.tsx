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

  const barcodeText = sale.bill_number?.replace(/[^A-Za-z0-9]/g, '') || '';

  return (
    <div>
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .receipt-table { width: 100%; border-collapse: collapse; }
        .receipt-table th {
          padding: 1.5mm 1mm 1mm;
          font-weight: 700;
          text-align: left;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          font-size: 7.5px;
        }
        .receipt-table td {
          padding: 0.8mm 1mm;
          font-size: 7.5px;
        }
        .receipt-table .col-amt { text-align: right; }
        .receipt-table .col-center { text-align: center; }
        .receipt-table th:last-child, .receipt-table td:last-child { text-align: right; }
      `}</style>
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: '80mm',
          maxWidth: '80mm',
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: '9px',
          lineHeight: '1.35',
          padding: '2mm 3mm',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ textAlign: 'center', marginBottom: '2.5mm' }}>
          {company.logo_url && (
            <img
              src={`${BACKEND_URL}${company.logo_url}`}
              alt="Logo"
              style={{ maxWidth: '45mm', maxHeight: '14mm', margin: '0 auto 1.5mm', objectFit: 'contain' }}
            />
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '1px', marginBottom: '0.8mm' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '7.5px', lineHeight: '1.5', color: '#444' }}>
            <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
            <div>Phone: {company.mobile || '9876543210'}</div>
            {company.email && <div>Email: {company.email}</div>}
            {company.gst_number && <div style={{ fontWeight: 600 }}>GSTIN: {company.gst_number}</div>}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <div style={{ fontSize: '7.5px', lineHeight: '1.6', marginBottom: '2mm' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <div><span style={{ fontWeight: 700 }}>Invoice No:</span> {sale.bill_number}</div>
                  <div><span style={{ fontWeight: 700 }}>Date:</span> {formatDate(sale.bill_date)}</div>
                  <div><span style={{ fontWeight: 700 }}>Time:</span> {formatTime(sale.bill_time)}</div>
                  <div><span style={{ fontWeight: 700 }}>Cashier ID:</span> {sale.user_id?.slice(0, 8) || '-'}</div>
                  <div><span style={{ fontWeight: 700 }}>Cashier:</span> {sale.user_name || '-'}</div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
                  <div><span style={{ fontWeight: 700 }}>Customer ID:</span> {sale.customer_id?.slice(0, 8) || 'WALK-IN'}</div>
                  <div><span style={{ fontWeight: 700 }}>Name:</span> {sale.customer_name || 'Walk-In Customer'}</div>
                  <div><span style={{ fontWeight: 700 }}>Mobile:</span> {sale.customer_mobile || '-'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1.5mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="receipt-table" style={{ marginBottom: '1mm' }}>
          <thead>
            <tr>
              <th style={{ width: '6mm', textAlign: 'center' }}>#</th>
              <th>Item Name</th>
              <th style={{ width: '8mm', textAlign: 'center' }}>Unit</th>
              <th style={{ width: '7mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '11mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '7mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ width: '13mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{item.product_name}</td>
                <td style={{ textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td style={{ textAlign: 'right' }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1mm 0' }} />

        {/* ═══════════ ITEMS COUNT & TOTAL QTY ═══════════ */}
        <div style={{ fontSize: '7.5px', display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
          <span><strong>Items Count:</strong> {items.length}</span>
          <span><strong>Total Quantity:</strong> {totalQty}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '8px', lineHeight: '1.7', marginBottom: '1.5mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Sub Total</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>Discount</span>
              <span style={{ fontWeight: 600 }}>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {cgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>CGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(cgst)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>SGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(sgst)}</span>
            </div>
          )}
          {roundOff !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>Round Off</span>
              <span style={{ fontWeight: 600 }}>{roundOff.toFixed(2)}</span>
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
            fontSize: '13px',
            padding: '1.5mm 3mm',
            marginBottom: '2mm',
          }}
        >
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        {/* ═══════════ AMOUNT IN WORDS ═══════════ */}
        <div style={{ fontSize: '7.5px', lineHeight: '1.5', marginBottom: '2mm', textAlign: 'center' }}>
          <span style={{ fontWeight: 700 }}>Amount In Words:</span>
          <div style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '7px', marginTop: '0.5mm' }}>
            {numberToWords(Math.round(grandTotal))}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ PAYMENT INFORMATION ═══════════ */}
        <div style={{ fontSize: '7.5px', lineHeight: '1.6', marginBottom: '2mm' }}>
          <div style={{ fontWeight: 700, fontSize: '8px', marginBottom: '0.8mm', letterSpacing: '0.3px' }}>
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
            <span>Reference No</span>
            <span style={{ fontWeight: 600 }}>{sale.bill_number || '-'}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ BANK DETAILS ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', fontSize: '7.5px', lineHeight: '1.6' }}>
          <div style={{ width: '48%' }}>
            <div style={{ fontWeight: 700, fontSize: '8px', marginBottom: '0.8mm', letterSpacing: '0.3px' }}>
              BANK DETAILS
            </div>
            <div style={{ padding: '0.3mm 0' }}><strong>Bank Name:</strong> {settings['bank_name'] || '-'}</div>
            <div style={{ padding: '0.3mm 0' }}><strong>Account Name:</strong> {settings['account_name'] || '-'}</div>
            <div style={{ padding: '0.3mm 0' }}><strong>Account No:</strong> {settings['account_number'] || '-'}</div>
            <div style={{ padding: '0.3mm 0' }}><strong>IFSC Code:</strong> {settings['ifsc_code'] || '-'}</div>
            <div style={{ padding: '0.3mm 0' }}><strong>UPI ID:</strong> {upiId || '-'}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ BARCODE & QR CODE ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2mm 0' }}>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', fontWeight: 600, marginBottom: '1mm' }}>Invoice Barcode</div>
            <div style={{
              fontFamily: "'Libre Barcode 128', 'Code128', monospace",
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '2px',
              color: '#000',
            }}>
              {barcodeText}
            </div>
            <div style={{ fontSize: '7px', fontWeight: 600, marginTop: '0.5mm', letterSpacing: '1px' }}>
              {barcodeText}
            </div>
          </div>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', fontWeight: 600, marginBottom: '1mm' }}>Scan & Pay (UPI)</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '32mm', height: '32mm' }} />
            ) : (
              <div
                style={{
                  width: '32mm',
                  height: '32mm',
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

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ TERMS & CONDITIONS ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '2mm', color: '#444' }}>
          <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>Terms & Conditions:</div>
          <div>1. Goods once sold cannot be returned.</div>
          <div>2. Please retain this receipt for future reference.</div>
          <div>3. Thank you for choosing {company.company_name || 'Student Xerox'}.</div>
        </div>

        {/* ═══════════ CONTACT ═══════════ */}
        <div style={{ fontSize: '7px', lineHeight: '1.5', marginBottom: '2mm', textAlign: 'center', color: '#444' }}>
          <div style={{ fontWeight: 700, fontSize: '7.5px', marginBottom: '0.5mm' }}>Contact Us</div>
          <div>Email: {settings['email'] || company.email || '-'}</div>
          <div>WhatsApp: {settings['whatsapp'] || company.mobile || '-'}</div>
          <div>Instagram: {settings['instagram'] || '-'}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '1.5mm 0' }} />

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ textAlign: 'center', marginTop: '2mm', marginBottom: '2mm' }}>
          <div style={{ fontWeight: 900, fontSize: '11px', letterSpacing: '1px', marginBottom: '0.5mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: 700, fontSize: '8px' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '7px', color: '#666', marginTop: '0.3mm' }}>
            Fast Service • Quality Printing
          </div>
        </div>
      </div>
    </div>
  );
}
