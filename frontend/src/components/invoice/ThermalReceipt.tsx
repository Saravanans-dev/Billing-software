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
  const gstAmount = Number(sale.gst_amount) || 0;
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
        .receipt-table { width: 100%; border-collapse: collapse; }
        .receipt-table th {
          padding: 1.5mm 0.5mm 1mm;
          font-weight: 700;
          text-align: left;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          font-size: 7.5px;
        }
        .receipt-table td {
          padding: 0.8mm 0.5mm;
          font-size: 7.5px;
        }
        .receipt-table th:last-child,
        .receipt-table td:last-child { text-align: right; }
        .receipt-table th:nth-child(3),
        .receipt-table th:nth-child(4),
        .receipt-table th:nth-child(6),
        .receipt-table td:nth-child(3),
        .receipt-table td:nth-child(4),
        .receipt-table td:nth-child(6) { text-align: center; }
        .receipt-table th:nth-child(5),
        .receipt-table td:nth-child(5) { text-align: right; }
        .receipt-table td:nth-child(7) { text-align: right; font-weight: 600; }
        .col-sno { width: 7mm; }
        .col-unit { width: 9mm; }
        .col-qty { width: 8mm; }
        .col-rate { width: 12mm; }
        .col-disc { width: 9mm; }
        .col-amt { width: 14mm; }
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
          boxShadow: '0 0 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ textAlign: 'center', marginBottom: '2.5mm' }}>
          {company.logo_url && (
            <img
              src={`${BACKEND_URL}${company.logo_url}`}
              alt="Logo"
              style={{ maxWidth: '45mm', maxHeight: '14mm', margin: '0 auto 1mm', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          )}
          <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '1px', marginBottom: '0.8mm' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '8px', lineHeight: '1.5', color: '#444' }}>
            <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
            <div>Phone: {company.mobile || '9876543210'}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <div style={{ fontSize: '8px', lineHeight: '1.6', marginBottom: '2mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div><span style={{ fontWeight: 700 }}>Invoice No:</span> {sale.bill_number}</div>
              <div><span style={{ fontWeight: 700 }}>Date:</span> {formatDate(sale.bill_date)}</div>
              <div><span style={{ fontWeight: 700 }}>Time:</span> {formatTime(sale.bill_time)}</div>
              <div><span style={{ fontWeight: 700 }}>Cashier ID:</span> {sale.user_id?.slice(0, 8) || '-'}</div>
              <div><span style={{ fontWeight: 700 }}>Cashier:</span> {sale.user_name || '-'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><span style={{ fontWeight: 700 }}>Customer Name:</span> {sale.customer_name || 'Walk-In Customer'}</div>
              <div><span style={{ fontWeight: 700 }}>Mobile Number:</span> {sale.customer_mobile || '-'}</div>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="receipt-table" style={{ marginBottom: '1.5mm' }}>
          <thead>
            <tr>
              <th className="col-sno">#</th>
              <th>Item Name</th>
              <th className="col-unit">Unit</th>
              <th className="col-qty">Qty</th>
              <th className="col-rate">Rate</th>
              <th className="col-disc">Disc %</th>
              <th className="col-amt">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="col-sno">{idx + 1}</td>
                <td>{item.product_name}</td>
                <td style={{ textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '8.5px', lineHeight: '1.7', marginBottom: '1.5mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
            <span>Sub Total</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(Number(sale.subtotal))}</span>
          </div>
          {Number(sale.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>Discount</span>
              <span style={{ fontWeight: 600 }}>-{formatCurrency(Number(sale.discount_amount))}</span>
            </div>
          )}
          {gstAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3mm 0' }}>
              <span>GST</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(gstAmount)}</span>
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
            fontSize: '14px',
            padding: '2mm 3mm',
            marginBottom: '2mm',
          }}
        >
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ PAYMENT INFORMATION & BANK DETAILS ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm', fontSize: '8px', lineHeight: '1.6' }}>
          <div style={{ width: '48%' }}>
            <div style={{ fontWeight: 700, fontSize: '8px', marginBottom: '0.8mm', letterSpacing: '0.3px' }}>
              PAYMENT INFORMATION
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Payment Method:</span> {(sale.payment_mode || 'CASH').toUpperCase()}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Received Amount:</span> {formatCurrency(Math.round(grandTotal))}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Balance Amount:</span> {formatCurrency(0)}
            </div>
          </div>
          <div style={{ width: '48%' }}>
            <div style={{ fontWeight: 700, fontSize: '8px', marginBottom: '0.8mm', letterSpacing: '0.3px' }}>
              BANK DETAILS
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Bank Name:</span> {settings['bank_name'] || '-'}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Account Name:</span> {settings['account_name'] || '-'}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>Account Number:</span> {settings['account_number'] || '-'}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>IFSC Code:</span> {settings['ifsc_code'] || '-'}
            </div>
            <div style={{ padding: '0.3mm 0' }}>
              <span style={{ fontWeight: 600 }}>UPI ID:</span> {upiId || '-'}
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ BARCODE & QR CODE ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2mm 0' }}>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '8px', fontWeight: 600, marginBottom: '1.5mm' }}>Barcode</div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: '#000' }}>
              {sale.bill_number?.replace(/[^A-Za-z0-9]/g, '*') || 'N/A'}
            </div>
          </div>
          <div style={{ width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            <div style={{ fontSize: '8px', fontWeight: 600, marginTop: '1mm' }}>QR Code</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ textAlign: 'center', marginTop: '2mm', marginBottom: '2mm' }}>
          <div style={{ fontWeight: 900, fontSize: '11px', letterSpacing: '1px', marginBottom: '0.8mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: 700, fontSize: '9px' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
        </div>
      </div>
    </div>
  );
}
