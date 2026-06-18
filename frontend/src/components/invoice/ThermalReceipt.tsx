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
    <div className="thermal-receipt">
      <style>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .thermal-receipt { box-shadow: none !important; }
          .no-print { display: none !important; }
        }
        .thermal-receipt {
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          background: #fff;
          color: #000;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 9px;
          line-height: 1.35;
          padding: 2mm 3mm;
          box-shadow: 0 0 8px rgba(0,0,0,0.1);
        }
        .receipt-header { text-align: center; margin-bottom: 3mm; }
        .receipt-logo { max-width: 50mm; max-height: 15mm; margin-bottom: 1mm; object-fit: contain; }
        .receipt-title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin: 0; }
        .receipt-info { font-size: 8px; color: #333; line-height: 1.4; }
        .receipt-divider { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
        .receipt-divider-solid { border: none; border-top: 1px solid #000; margin: 2mm 0; }
        .receipt-section-title { font-weight: 700; font-size: 9px; margin-bottom: 1mm; }
        .details-grid { display: flex; justify-content: space-between; font-size: 8px; }
        .details-grid > div { width: 48%; }
        .receipt-table { width: 100%; border-collapse: collapse; font-size: 8px; margin: 2mm 0; }
        .receipt-table th {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 1.5mm 0.5mm;
          text-align: left;
          font-weight: 700;
          font-size: 7.5px;
        }
        .receipt-table td { padding: 1mm 0.5mm; vertical-align: top; }
        .receipt-table tr:last-child td { border-bottom: 1px solid #000; }
        .amount-col { text-align: right; }
        .qty-col { text-align: center; }
        .rate-col { text-align: right; }
        .disc-col { text-align: right; }
        .summary-row { display: flex; justify-content: space-between; font-size: 8px; padding: 0.5mm 0; }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          background: #000;
          color: #fff;
          font-weight: 900;
          font-size: 12px;
          padding: 2mm 1.5mm;
          margin: 2mm 0;
        }
        .amount-words { font-size: 7.5px; text-align: center; margin: 2mm 0; font-style: italic; }
        .payment-section { font-size: 8px; margin: 2mm 0; }
        .bank-section { font-size: 7.5px; margin: 2mm 0; }
        .qr-section { display: flex; justify-content: space-between; align-items: center; margin: 2mm 0; }
        .qr-section img { width: 35mm; height: 35mm; }
        .barcode-section { display: flex; flex-direction: column; align-items: center; }
        .barcode-section svg { max-width: 40mm; }
        .footer-section { text-align: center; font-size: 7.5px; margin: 2mm 0; line-height: 1.5; }
        .thank-you { text-align: center; font-weight: 900; font-size: 10px; margin: 3mm 0 1mm; }
        .contact-line { font-size: 7.5px; text-align: center; }
      `}</style>

      {/* Header */}
      <div className="receipt-header">
        {company.logo_url && (
          <img src={company.logo_url} alt="Logo" className="receipt-logo" crossOrigin="anonymous" />
        )}
        <div className="receipt-title">{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
        <div className="receipt-info">
          {company.address && <div>{company.address}</div>}
          <div>
            {company.mobile && <span>Ph: {company.mobile} </span>}
            {company.email && <span>| Email: {company.email}</span>}
          </div>
          {company.gst_number && <div>GSTIN: {company.gst_number}</div>}
        </div>
      </div>

      <hr className="receipt-divider" />

      {/* Invoice & Customer Details */}
      <div className="details-grid">
        <div>
          <div><strong>Invoice No:</strong> {sale.bill_number}</div>
          <div><strong>Date:</strong> {formatDate(sale.bill_date)}</div>
          <div><strong>Time:</strong> {formatTime(sale.bill_time)}</div>
          <div><strong>Cashier ID:</strong> {sale.user_id?.slice(0, 8) || '-'}</div>
          <div><strong>Cashier:</strong> {sale.user_name || '-'}</div>
        </div>
        <div>
          <div><strong>Customer ID:</strong> {sale.customer_id?.slice(0, 8) || '-'}</div>
          <div><strong>Customer:</strong> {sale.customer_name || 'Walk-In Customer'}</div>
          <div><strong>Mobile:</strong> {sale.customer_mobile || '-'}</div>
        </div>
      </div>

      <hr className="receipt-divider" />

      {/* Items Table */}
      <table className="receipt-table">
        <thead>
          <tr>
            <th style={{width:'8mm'}}>#</th>
            <th>Item Name</th>
            <th style={{width:'6mm', textAlign:'center'}}>Unit</th>
            <th style={{width:'8mm', textAlign:'center'}}>Qty</th>
            <th style={{width:'10mm', textAlign:'right'}}>Rate</th>
            <th style={{width:'7mm', textAlign:'right'}}>Disc%</th>
            <th style={{width:'12mm', textAlign:'right'}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td>{idx + 1}</td>
              <td>{item.product_name}</td>
              <td className="qty-col">{item.unit || '-'}</td>
              <td className="qty-col">{Number(item.quantity)}</td>
              <td className="rate-col">{Number(item.rate).toFixed(2)}</td>
              <td className="disc-col">{Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}</td>
              <td className="amount-col">{Number(item.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Items Count & Total Qty */}
      <div style={{display:'flex', justifyContent:'space-between', fontSize:'8px', marginBottom:'2mm'}}>
        <span>Items Count: {items.length}</span>
        <span>Total Quantity: {totalQty}</span>
      </div>

      <hr className="receipt-divider" />

      {/* Summary */}
      <div className="summary-row">
        <span>Sub Total</span>
        <span>{formatCurrency(Number(sale.subtotal))}</span>
      </div>
      {Number(sale.discount_amount) > 0 && (
        <div className="summary-row">
          <span>Discount</span>
          <span>-{formatCurrency(Number(sale.discount_amount))}</span>
        </div>
      )}
      {cgst > 0 && (
        <div className="summary-row">
          <span>CGST @{(Number(sale.gst_amount) / (Number(sale.taxable_amount) || 1) * 100 / 2).toFixed(1)}%</span>
          <span>{formatCurrency(cgst)}</span>
        </div>
      )}
      {sgst > 0 && (
        <div className="summary-row">
          <span>SGST @{(Number(sale.gst_amount) / (Number(sale.taxable_amount) || 1) * 100 / 2).toFixed(1)}%</span>
          <span>{formatCurrency(sgst)}</span>
        </div>
      )}
      {Number(sale.round_off) !== 0 && (
        <div className="summary-row">
          <span>Round Off</span>
          <span>{Number(sale.round_off).toFixed(2)}</span>
        </div>
      )}

      <hr className="receipt-divider-solid" />

      {/* Grand Total */}
      <div className="grand-total-row">
        <span>Grand Total</span>
        <span>{formatCurrency(Math.round(grandTotal))}</span>
      </div>

      {/* Amount in Words */}
      <div className="amount-words">
        {numberToWords(Math.round(grandTotal))}
      </div>

      <hr className="receipt-divider" />

      {/* Payment Info */}
      <div className="payment-section">
        <div className="summary-row">
          <span>Payment Method</span>
          <span>{(sale.payment_mode || '').toUpperCase()}</span>
        </div>
        <div className="summary-row">
          <span>Received Amount</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>
        <div className="summary-row">
          <span>Balance Amount</span>
          <span>{formatCurrency(0)}</span>
        </div>
        {sale.notes && (
          <div className="summary-row">
            <span>Ref Number</span>
            <span>{sale.notes}</span>
          </div>
        )}
      </div>

      <hr className="receipt-divider" />

      {/* Bank Details */}
      <div className="receipt-section-title">Bank Details</div>
      <div className="bank-section">
        <div className="summary-row"><span>Bank Name</span><span>{settings['bank_name'] || '-'}</span></div>
        <div className="summary-row"><span>Account Name</span><span>{settings['account_name'] || '-'}</span></div>
        <div className="summary-row"><span>Account No</span><span>{settings['account_number'] || '-'}</span></div>
        <div className="summary-row"><span>IFSC Code</span><span>{settings['ifsc_code'] || '-'}</span></div>
        <div className="summary-row"><span>UPI ID</span><span>{upiId || '-'}</span></div>
      </div>

      <hr className="receipt-divider" />

      {/* Barcode & QR Code */}
      <div className="qr-section">
        <div className="barcode-section">
          <div style={{fontSize:'7px', marginBottom:'1mm'}}>Invoice Barcode</div>
          <div style={{fontSize:'10px', fontWeight:700, letterSpacing:'2px'}}>
            {sale.bill_number?.replace(/[^A-Za-z0-9]/g, '*') || 'N/A'}
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI QR" style={{width:'35mm', height:'35mm'}} />
          ) : (
            <div style={{width:'35mm', height:'35mm', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'7px', color:'#999', border:'1px dashed #ccc'}}>
              Loading QR...
            </div>
          )}
          <div style={{fontSize:'7px', marginTop:'0.5mm'}}>Scan & Pay (UPI)</div>
        </div>
      </div>

      <hr className="receipt-divider" />

      {/* Terms & Conditions */}
      <div className="footer-section">
        <div style={{fontWeight:700, marginBottom:'0.5mm'}}>Terms & Conditions:</div>
        <div>{settings['terms_conditions'] || 'Goods once sold cannot be returned or exchanged.'}</div>
        <div>Please retain this receipt for future reference.</div>
        <div>Thank you for choosing Student Xerox.</div>
      </div>

      {/* Contact */}
      <div className="contact-line">
        {company.email && <div>Email: {company.email}</div>}
        {settings['whatsapp'] && <div>WhatsApp: {settings['whatsapp']}</div>}
        {settings['instagram'] && <div>Instagram: {settings['instagram']}</div>}
      </div>

      <hr className="receipt-divider" />

      {/* Thank You */}
      <div className="thank-you">THANK YOU VISIT AGAIN!</div>
      <div className="footer-section" style={{fontWeight:700}}>
        {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
      </div>
      <div className="footer-section" style={{fontSize:'7px'}}>
        Fast Service • Quality Printing
      </div>
    </div>
  );
}
