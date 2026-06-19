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
  const subtotal = Number(sale.subtotal) || 0;
  const discountAmount = Number(sale.discount_amount) || 0;
  const upiId = settings['upi_id'] || '';

  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(company.company_name || '')}&am=${grandTotal.toFixed(2)}&tn=${sale.bill_number || 'Bill'}`
    : '';

  useEffect(() => {
    if (upiLink) {
      QRCode.toDataURL(upiLink, {
        width: 250,
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
  const barcodeChars = billNum.split('').map(c => /[A-Za-z0-9]/.test(c) ? c : '*').join(' ');

  const cashierId = sale.user_id ? sale.user_id.slice(0, 8) : '-';
  const cashierName = sale.user_name || '-';

  return (
    <div>
      <style>{`
        @page { size: A5 portrait; margin: 8mm; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .receipt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .receipt-table th {
          padding: 2mm 1.5mm;
          font-weight: 700;
          text-align: left;
          border-bottom: 1px solid #000;
          border-top: 1px solid #000;
          font-size: 11px;
          white-space: nowrap;
        }
        .receipt-table td {
          padding: 1.2mm 1.5mm;
          font-size: 12px;
          border-bottom: 1px dotted #ddd;
        }
        .receipt-table tr:last-child td { border-bottom: none; }
        .receipt-table .amt { text-align: right; padding-right: 0.5mm; }
        .receipt-table .ctr { text-align: center; }
      `}</style>
      <div
        className="mx-auto bg-white text-black"
        style={{
          width: '132mm',
          maxWidth: '132mm',
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: '15px',
          lineHeight: '1.5',
          padding: '4mm 6mm',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          {company.logo_url && (
            <div style={{ marginBottom: '1mm' }}>
              <img
                src={`${BACKEND_URL}${company.logo_url}`}
                alt="Logo"
                style={{ width: '20mm', height: '20mm', objectFit: 'contain' }}
              />
            </div>
          )}
          <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '1px', marginBottom: '0.5mm' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#444' }}>
            <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
            <div>Phone: {company.mobile || '9876543210'}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '2mm 0' }} />

        {/* ═══════════ INVOICE DETAILS ═══════════ */}
        <div style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '3mm' }}>
          <div>Invoice No: {billNum}</div>
          <div>Date: {formatDate(sale.bill_date)} &nbsp; Time: {formatTime(sale.bill_time)}</div>
          <div>Cashier ID: {cashierId}</div>
          <div>Cashier: {cashierName}</div>
          <div>Customer Name: {sale.customer_name || 'Walk-In'}</div>
          <div>Mobile Number: {sale.customer_mobile || '-'}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '2mm 0' }} />

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table className="receipt-table" style={{ marginBottom: '1mm' }}>
          <thead>
            <tr>
              <th style={{ width: '7mm', textAlign: 'center' }}>#</th>
              <th>Item Name</th>
              <th style={{ width: '9mm', textAlign: 'center' }}>Unit</th>
              <th style={{ width: '7mm', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '17mm', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '9mm', textAlign: 'center' }}>Disc%</th>
              <th style={{ width: '20mm', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
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

        <hr style={{ border: 'none', borderTop: '1.5px dashed #aaa', margin: '2mm 0' }} />

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={{ fontSize: '14px', lineHeight: '1.7', marginBottom: '2mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Sub Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0', fontWeight: 900, fontSize: '16px', borderTop: '1.5px solid #000', paddingTop: '1mm', marginTop: '0.5mm' }}>
            <span>Grand Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1.5px dashed #aaa', margin: '2mm 0' }} />

        {/* ═══════════ PAYMENT INFORMATION ═══════════ */}
        <div style={{ fontSize: '12px', lineHeight: '1.7', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1mm' }}>
            PAYMENT INFORMATION
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Payment Method</span>
            <span style={{ fontWeight: 600 }}>{(sale.payment_mode || 'CASH').toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Received Amount</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(grandTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Balance Amount</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(0)}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1.5px dashed #aaa', margin: '2mm 0' }} />

        {/* ═══════════ BANK DETAILS ═══════════ */}
        <div style={{ fontSize: '12px', lineHeight: '1.7', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '1mm' }}>
            BANK DETAILS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Bank Name</span>
            <span>{settings['bank_name'] || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Account Name</span>
            <span>{settings['account_name'] || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>Account Number</span>
            <span>{settings['account_number'] || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>IFSC Code</span>
            <span>{settings['ifsc_code'] || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5mm 0' }}>
            <span>UPI ID</span>
            <span>{upiId || '-'}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1.5px dashed #aaa', margin: '2mm 0' }} />

        {/* ═══════════ BARCODE ═══════════ */}
        <div style={{ textAlign: 'center', margin: '2mm 0' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '0.5mm' }}>Barcode</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: '14px', letterSpacing: '1px', fontWeight: 600 }}>
            {barcodeChars || 'N/A'}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1.5px dashed #aaa', margin: '2mm 0' }} />

        {/* ═══════════ QR CODE ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '3mm 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '1mm' }}>QR Code</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '48mm', height: '48mm' }} />
            ) : (
              <div
                style={{
                  width: '48mm',
                  height: '48mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#999',
                  border: '1.5px dashed #ccc',
                }}
              >
                UPI QR
              </div>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '2mm 0' }} />

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ textAlign: 'center', marginTop: '3mm', marginBottom: '4mm' }}>
          <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '1.5px', marginBottom: '1mm' }}>
            THANK YOU VISIT AGAIN!
          </div>
          <div style={{ fontWeight: 700, fontSize: '12px', color: '#333' }}>
            {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
          </div>
        </div>
      </div>
    </div>
  );
}
