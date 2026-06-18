import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { numberToWords } from '../../lib/numberToWords';
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
  const cgst = Number(sale.gst_amount) / 2 || 0;
  const sgst = Number(sale.gst_amount) / 2 || 0;
  const totalQty = items.reduce((s, i) => s + Number(i.quantity), 0);
  const upiId = settings['upi_id'] || '';
  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || 'Bill'}`
    : '';

  useEffect(() => {
    if (upiLink) {
      QRCode.toDataURL(upiLink, {
        width: 140,
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
      `}</style>
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: '80mm',
          maxWidth: '80mm',
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: '9px',
          lineHeight: '1.3',
          padding: '2mm 3mm',
          boxShadow: '0 0 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div className="text-center" style={{ marginBottom: '2.5mm' }}>
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt="Logo"
              style={{ maxWidth: '50mm', maxHeight: '14mm', margin: '0 auto 1mm', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '1px', margin: 0 }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div className="text-gray-700" style={{ fontSize: '8px', lineHeight: '1.4' }}>
            {company.address && <div>{company.address}</div>}
            <div>
              {company.mobile && <span>Ph: {company.mobile}</span>}
              {company.email && <span> | Email: {company.email}</span>}
            </div>
            {company.gst_number && <div>GSTIN: {company.gst_number}</div>}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <div className="flex justify-between" style={{ fontSize: '8px' }}>
          <div style={{ width: '48%' }}>
            <div><span style={{ fontWeight: 700 }}>Invoice No:</span> {sale.bill_number}</div>
            <div><span style={{ fontWeight: 700 }}>Date:</span> {formatDate(sale.bill_date)}</div>
            <div><span style={{ fontWeight: 700 }}>Time:</span> {formatTime(sale.bill_time)}</div>
            <div><span style={{ fontWeight: 700 }}>Cashier ID:</span> {sale.user_id?.slice(0, 8) || '-'}</div>
            <div><span style={{ fontWeight: 700 }}>Cashier:</span> {sale.user_name || '-'}</div>
          </div>
          <div style={{ width: '48%' }}>
            <div><span style={{ fontWeight: 700 }}>Customer ID:</span> {sale.customer_id?.slice(0, 8) || '-'}</div>
            <div><span style={{ fontWeight: 700 }}>Customer:</span> {sale.customer_name || 'Walk-In Customer'}</div>
            <div><span style={{ fontWeight: 700 }}>Mobile:</span> {sale.customer_mobile || '-'}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5px', margin: '1.5mm 0' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'left', fontWeight: 700, width: '6mm' }}>#</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'left', fontWeight: 700 }}>Item</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'center', fontWeight: 700, width: '6mm' }}>Unit</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'center', fontWeight: 700, width: '7mm' }}>Qty</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'right', fontWeight: 700, width: '10mm' }}>Rate</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'right', fontWeight: 700, width: '7mm' }}>Disc%</th>
              <th style={{ padding: '1.5mm 0.5mm', textAlign: 'right', fontWeight: 700, width: '12mm' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'left' }}>{idx + 1}</td>
                <td style={{ padding: '0.8mm 0.5mm' }}>{item.product_name}</td>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'right' }}>
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td style={{ padding: '0.8mm 0.5mm', textAlign: 'right', fontWeight: 600 }}>
                  {Number(item.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Items Count & Total Qty */}
        <div className="flex justify-between" style={{ fontSize: '8px', marginBottom: '1.5mm' }}>
          <span>Items Count: {items.length}</span>
          <span>Total Quantity: {totalQty}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '8px' }}>
          <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
            <span>Sub Total</span>
            <span>{formatCurrency(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount_amount) > 0 && (
            <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
              <span>Discount</span>
              <span>-{formatCurrency(Number(sale.discount_amount))}</span>
            </div>
          )}
          {cgst > 0 && (
            <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
              <span>CGST</span>
              <span>{formatCurrency(cgst)}</span>
            </div>
          )}
          {sgst > 0 && (
            <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
              <span>SGST</span>
              <span>{formatCurrency(sgst)}</span>
            </div>
          )}
          {Number(sale.round_off) !== 0 && (
            <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
              <span>Round Off</span>
              <span>{Number(sale.round_off).toFixed(2)}</span>
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '2mm 0 1.5mm' }} />

        {/* ═══════════ GRAND TOTAL ═══════════ */}
        <div
          className="flex justify-between items-center"
          style={{
            background: '#000',
            color: '#fff',
            fontWeight: 900,
            fontSize: '13px',
            padding: '2mm 2mm',
            marginBottom: '2mm',
          }}
        >
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        {/* ═══════════ AMOUNT IN WORDS ═══════════ */}
        <div style={{ fontSize: '7.5px', textAlign: 'center', marginBottom: '2mm', fontStyle: 'italic' }}>
          {numberToWords(Math.round(grandTotal))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ PAYMENT INFO ═══════════ */}
        <div style={{ fontSize: '8px', marginBottom: '2mm' }}>
          <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
            <span>Payment Method</span>
            <span>{(sale.payment_mode || '').toUpperCase()}</span>
          </div>
          <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
            <span>Received Amount</span>
            <span>{formatCurrency(Math.round(grandTotal))}</span>
          </div>
          <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
            <span>Balance Amount</span>
            <span>{formatCurrency(0)}</span>
          </div>
          {sale.notes && (
            <div className="flex justify-between" style={{ padding: '0.4mm 0' }}>
              <span>Reference No</span>
              <span>{sale.notes}</span>
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ BANK DETAILS ═══════════ */}
        <div style={{ marginBottom: '2mm' }}>
          <div style={{ fontWeight: 700, fontSize: '8px', marginBottom: '0.5mm' }}>Bank Details</div>
          <div style={{ fontSize: '7.5px' }}>
            <div className="flex justify-between" style={{ padding: '0.3mm 0' }}>
              <span>Bank Name</span>
              <span>{settings['bank_name'] || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ padding: '0.3mm 0' }}>
              <span>A/c Name</span>
              <span>{settings['account_name'] || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ padding: '0.3mm 0' }}>
              <span>A/c No</span>
              <span>{settings['account_number'] || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ padding: '0.3mm 0' }}>
              <span>IFSC Code</span>
              <span>{settings['ifsc_code'] || '-'}</span>
            </div>
            <div className="flex justify-between" style={{ padding: '0.3mm 0' }}>
              <span>UPI ID</span>
              <span>{upiId || '-'}</span>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═════════ BOTTOM: BARCODE + QR CODE ══════════ */}
        <div className="flex justify-between items-center" style={{ margin: '2mm 0' }}>
          <div className="flex flex-col items-center">
            <div style={{ fontSize: '7px', marginBottom: '0.5mm' }}>Invoice Barcode</div>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px' }}>
              {sale.bill_number?.replace(/[^A-Za-z0-9]/g, '*') || 'N/A'}
            </div>
          </div>
          <div className="flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '33mm', height: '33mm' }} />
            ) : (
              <div
                style={{
                  width: '33mm',
                  height: '33mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '7px',
                  color: '#999',
                }}
              >
                Loading QR...
              </div>
            )}
            <div style={{ fontSize: '7px', marginTop: '0.5mm' }}>Scan & Pay (UPI)</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ TERMS & CONDITIONS ═══════════ */}
        <div style={{ textAlign: 'center', fontSize: '7px', lineHeight: '1.6', marginBottom: '1.5mm' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.3mm' }}>Terms & Conditions:</div>
          <div>{settings['terms_conditions'] || 'Goods once sold cannot be returned or exchanged.'}</div>
          <div>Please retain this receipt for future reference.</div>
          <div>Thank you for choosing Student Xerox.</div>
        </div>

        {/* ═══════════ CONTACT ═══════════ */}
        <div style={{ textAlign: 'center', fontSize: '7px', lineHeight: '1.5', marginBottom: '1.5mm' }}>
          {company.email && <div>Email: {company.email}</div>}
          {settings['whatsapp'] && <div>WhatsApp: {settings['whatsapp']}</div>}
          {settings['instagram'] && <div>Instagram: {settings['instagram']}</div>}
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* ═══════════ THANK YOU ═══════════ */}
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '10px', margin: '2.5mm 0 1mm' }}>
          THANK YOU VISIT AGAIN!
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '9px' }}>
          {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '7px', color: '#555', marginTop: '0.5mm' }}>
          Fast Service • Quality Printing
        </div>
      </div>
    </div>
  );
}
