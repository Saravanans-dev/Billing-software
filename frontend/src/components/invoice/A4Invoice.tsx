import { formatCurrency } from '../../lib/utils';
import { numberToWords } from '../../lib/numberToWords';
import { BACKEND_URL } from '../../services/api';
import type { Sale, SaleItem, CompanySettings } from '../../types';

interface A4InvoiceProps {
  sale: Sale & { items: SaleItem[]; user_name?: string };
  company: CompanySettings;
  settings: Record<string, string>;
}

export function A4Invoice({ sale, company, settings }: A4InvoiceProps) {
  const items = sale.items || [];
  const grandTotal = Number(sale.grand_total) || 0;
  const gstAmount = Number(sale.gst_amount) || 0;
  const upiId = settings['upi_id'] || '';
  const isGstBill = company.gst_number && gstAmount > 0;

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <style>{`
        @page { size: A4; margin: 12mm 15mm; }
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div
        className="mx-auto bg-white"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 12mm',
          fontFamily: "'Arial', 'Helvetica', sans-serif",
          color: '#000',
          fontSize: '10pt',
          lineHeight: '1.4',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        {/* ═══════════ HEADER ═══════════ */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5mm', paddingBottom: '4mm', borderBottom: '2px solid #1a1a2e' }}>
          <div style={{ width: '55mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {company.logo_url ? (
              <img
                src={`${BACKEND_URL}${company.logo_url}`}
                alt="Logo"
                style={{ maxWidth: '50mm', maxHeight: '25mm', objectFit: 'contain' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ width: '50mm', height: '25mm', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '4px', fontSize: '9pt', color: '#999' }}>
                Company Logo
              </div>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '18pt', fontWeight: 900, letterSpacing: '1px', color: '#1a1a2e', marginBottom: '2mm' }}>
              {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
            </div>
            <div style={{ fontSize: '9pt', color: '#555', lineHeight: '1.6' }}>
              {company.address && <div>{company.address}</div>}
              <div>
                {company.mobile && <span>Phone: {company.mobile} | </span>}
                {company.email && <span>Email: {company.email}</span>}
              </div>
              {company.gst_number && <div style={{ fontWeight: 600 }}>GST No: {company.gst_number}</div>}
              {company.pan_number && !company.gst_number && <div>PAN: {company.pan_number}</div>}
            </div>
          </div>
        </div>

        {/* ═══════════ TITLE ═══════════ */}
        <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '14pt',
            fontWeight: 900,
            letterSpacing: '3px',
            padding: '1.5mm 10mm',
            borderBottom: '3px double #1a1a2e',
            color: '#1a1a2e',
          }}>
            {isGstBill ? 'TAX INVOICE' : 'INVOICE'}
          </div>
        </div>

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <table style={{ width: '100%', marginBottom: '4mm', fontSize: '9pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '5mm' }}>
                <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: '1.5mm' }}>Bill To:</div>
                <div style={{ lineHeight: '1.7', color: '#333' }}>
                  <div style={{ fontWeight: 600 }}>{sale.customer_name || 'Walk-In Customer'}</div>
                  {sale.customer_mobile && <div>Mobile: {sale.customer_mobile}</div>}
                  {sale.customer_address && <div>Address: {sale.customer_address}</div>}
                  {sale.customer_gst && <div>GST: {sale.customer_gst}</div>}
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '1mm 2mm', fontWeight: 600, border: '1px solid #ccc', width: '50%' }}>Invoice No</td>
                      <td style={{ padding: '1mm 2mm', border: '1px solid #ccc' }}>{sale.bill_number}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1mm 2mm', fontWeight: 600, border: '1px solid #ccc' }}>Date</td>
                      <td style={{ padding: '1mm 2mm', border: '1px solid #ccc' }}>{formatDate(sale.bill_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1mm 2mm', fontWeight: 600, border: '1px solid #ccc' }}>Time</td>
                      <td style={{ padding: '1mm 2mm', border: '1px solid #ccc' }}>{sale.bill_time?.toString().slice(0, 5)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1mm 2mm', fontWeight: 600, border: '1px solid #ccc' }}>Cashier</td>
                      <td style={{ padding: '1mm 2mm', border: '1px solid #ccc' }}>{sale.user_name || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1mm 2mm', fontWeight: 600, border: '1px solid #ccc' }}>Payment</td>
                      <td style={{ padding: '1mm 2mm', border: '1px solid #ccc' }}>{(sale.payment_mode || 'CASH').toUpperCase()}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: '#1a1a2e', color: '#fff' }}>
              <th style={{ padding: '2mm 1.5mm', textAlign: 'center', width: '8mm' }}>#</th>
              <th style={{ padding: '2mm 1.5mm', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '2mm 1.5mm', textAlign: 'center', width: '15mm' }}>Unit</th>
              <th style={{ padding: '2mm 1.5mm', textAlign: 'center', width: '14mm' }}>Qty</th>
              <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '20mm' }}>Rate</th>
              {isGstBill && <th style={{ padding: '2mm 1.5mm', textAlign: 'center', width: '12mm' }}>GST %</th>}
              {isGstBill && <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '18mm' }}>GST Amt</th>}
              <th style={{ padding: '2mm 1.5mm', textAlign: 'right', width: '22mm' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'center', color: '#666' }}>{idx + 1}</td>
                <td style={{ padding: '1.5mm 1.5mm' }}>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  {Number(item.discount_percentage) > 0 && (
                    <div style={{ fontSize: '8pt', color: '#e53935' }}>Discount: {Number(item.discount_percentage).toFixed(1)}%</div>
                  )}
                </td>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                {isGstBill && <td style={{ padding: '1.5mm 1.5mm', textAlign: 'center' }}>{Number(item.gst_percentage).toFixed(1)}%</td>}
                {isGstBill && <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right' }}>{Number(item.gst_amount).toFixed(2)}</td>}
                <td style={{ padding: '1.5mm 1.5mm', textAlign: 'right', fontWeight: 600 }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={isGstBill ? 8 : 6} style={{ padding: '10mm', textAlign: 'center', color: '#999' }}>
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ═══════════ TOTALS SECTION ═══════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5mm' }}>
          <div style={{ width: '55%', fontSize: '9pt' }}>
            {sale.notes && (
              <div style={{ marginBottom: '2mm' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5mm' }}>Notes:</div>
                <div style={{ color: '#555', fontStyle: 'italic' }}>{sale.notes}</div>
              </div>
            )}
            <div style={{ fontWeight: 600, marginTop: '2mm' }}>Amount in Words:</div>
            <div style={{ fontWeight: 700, fontSize: '10pt', color: '#1a1a2e', textTransform: 'uppercase' }}>
              {numberToWords(Math.round(grandTotal))}
            </div>
          </div>
          <div style={{ width: '40%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', fontWeight: 500 }}>Sub Total</td>
                  <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(Number(sale.subtotal))}</td>
                </tr>
                {Number(sale.discount_amount) > 0 && (
                  <tr>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', fontWeight: 500 }}>Discount</td>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', textAlign: 'right', color: '#e53935' }}>
                      -{formatCurrency(Number(sale.discount_amount))}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', fontWeight: 500 }}>Taxable Amount</td>
                  <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(Number(sale.taxable_amount))}</td>
                </tr>
                {gstAmount > 0 && (
                  <tr>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', fontWeight: 500 }}>GST</td>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(gstAmount)}</td>
                  </tr>
                )}
                {Number(sale.round_off) !== 0 && (
                  <tr>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', fontWeight: 500 }}>Round Off</td>
                    <td style={{ padding: '1mm 2mm', border: '1px solid #ddd', textAlign: 'right' }}>{Number(sale.round_off).toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                  <td style={{ padding: '1.5mm 2mm', fontWeight: 900, fontSize: '11pt' }}>Grand Total</td>
                  <td style={{ padding: '1.5mm 2mm', textAlign: 'right', fontWeight: 900, fontSize: '11pt' }}>
                    {formatCurrency(Math.round(grandTotal))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ═══════════ BANK DETAILS & PAYMENT INFO ═══════════ */}
        <div style={{ display: 'flex', gap: '5mm', marginBottom: '4mm', fontSize: '9pt' }}>
          <div style={{ flex: 1, padding: '2mm 3mm', border: '1px solid #ddd', borderRadius: '2mm' }}>
            <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: '1.5mm', color: '#1a1a2e' }}>Bank Details</div>
            <div style={{ lineHeight: '1.8', color: '#444' }}>
              <div><span style={{ fontWeight: 600 }}>Bank:</span> {settings['bank_name'] || '-'}</div>
              <div><span style={{ fontWeight: 600 }}>Account Name:</span> {settings['account_name'] || '-'}</div>
              <div><span style={{ fontWeight: 600 }}>A/c No:</span> {settings['account_number'] || '-'}</div>
              <div><span style={{ fontWeight: 600 }}>IFSC:</span> {settings['ifsc_code'] || '-'}</div>
              {upiId && <div><span style={{ fontWeight: 600 }}>UPI ID:</span> {upiId}</div>}
            </div>
          </div>
          <div style={{ flex: 1, padding: '2mm 3mm', border: '1px solid #ddd', borderRadius: '2mm' }}>
            <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: '1.5mm', color: '#1a1a2e' }}>Payment Details</div>
            <div style={{ lineHeight: '1.8', color: '#444' }}>
              <div><span style={{ fontWeight: 600 }}>Payment Mode:</span> {(sale.payment_mode || 'CASH').toUpperCase()}</div>
              <div><span style={{ fontWeight: 600 }}>Total Amount:</span> {formatCurrency(Math.round(grandTotal))}</div>
              <div><span style={{ fontWeight: 600 }}>Paid Amount:</span> {formatCurrency(Math.round(grandTotal))}</div>
              <div><span style={{ fontWeight: 600 }}>Balance:</span> {formatCurrency(0)}</div>
            </div>
          </div>
        </div>

        {/* ═══════════ TERMS & CONDITIONS ═══════════ */}
        <div style={{ fontSize: '8pt', color: '#666', lineHeight: '1.6', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 700, fontSize: '9pt', color: '#333', marginBottom: '0.5mm' }}>Terms & Conditions:</div>
          <div>1. Goods once sold will not be taken back or exchanged.</div>
          <div>2. All disputes are subject to local jurisdiction.</div>
          <div>3. This is a computer-generated invoice.</div>
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={{ borderTop: '2px solid #1a1a2e', paddingTop: '3mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '11pt', letterSpacing: '1px', color: '#1a1a2e' }}>
                THANK YOU - VISIT AGAIN!
              </div>
              <div style={{ fontSize: '9pt', color: '#666', marginTop: '0.5mm' }}>
                {company.company_name?.toUpperCase() || 'STUDENT XEROX'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '7.5pt', color: '#999', marginTop: '2mm' }}>
            This is a computer generated invoice | {company.company_name || 'Student Xerox'} | {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}
