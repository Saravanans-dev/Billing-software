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

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    return t.toString().slice(0, 5);
  };

  const barcodeChars = sale.bill_number?.replace(/[^A-Za-z0-9]/g, '') || '';

  const styles = {
    card: {
      maxWidth: '820px',
      margin: '20px auto',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 2px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      padding: '35px 40px',
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      color: '#1a1a2e',
      fontSize: '13px',
      lineHeight: '1.5',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      paddingBottom: '18px',
      borderBottom: '2px solid #1a1a2e',
      marginBottom: '20px',
    },
    headerLogo: {
      width: '60px',
      height: '60px',
      objectFit: 'contain' as const,
      borderRadius: '6px',
    },
    headerLogoPlaceholder: {
      width: '60px',
      height: '60px',
      background: '#f0f0f5',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      color: '#999',
      flexShrink: 0,
    },
    headerInfo: {
      flex: 1,
    },
    companyName: {
      fontSize: '20px',
      fontWeight: 900,
      letterSpacing: '0.3px',
      color: '#1a1a2e',
      marginBottom: '2px',
    },
    companyDetails: {
      fontSize: '12px',
      color: '#555',
      lineHeight: '1.6',
    },
    titleBadge: {
      textAlign: 'center' as const,
      marginBottom: '22px',
    },
    titleText: {
      display: 'inline-block',
      fontSize: '16px',
      fontWeight: 800,
      letterSpacing: '2px',
      padding: '4px 28px',
      borderBottom: '3px double #1a1a2e',
      color: '#1a1a2e',
    },
    infoRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '18px',
    },
    infoBox: {
      flex: 1,
      background: '#f8f9fc',
      borderRadius: '8px',
      padding: '14px 16px',
      fontSize: '12px',
      lineHeight: '1.8',
    },
    infoBoxTitle: {
      fontWeight: 700,
      fontSize: '12px',
      color: '#1a1a2e',
      marginBottom: '4px',
      paddingBottom: '4px',
      borderBottom: '1px solid #e0e0e8',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '10px',
      fontSize: '12px',
    },
    tableHead: {
      background: '#1a1a2e',
      color: '#fff',
    },
    tableTh: {
      padding: '10px 8px',
      fontWeight: 600,
      fontSize: '11px',
      textAlign: 'left' as const,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap' as const,
    },
    tableTd: {
      padding: '8px',
      borderBottom: '1px solid #eee',
      fontSize: '12px',
    },
    countRow: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '16px',
      fontSize: '12px',
      color: '#555',
      padding: '4px 0 12px',
    },
    summarySection: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginBottom: '14px',
    },
    summaryTable: {
      width: '320px',
      fontSize: '12px',
      lineHeight: '2',
    },
    summaryTd: {
      padding: '3px 0',
    },
    summaryLabel: {
      textAlign: 'left' as const,
      color: '#444',
    },
    summaryValue: {
      textAlign: 'right' as const,
      fontWeight: 600,
    },
    grandTotalBar: {
      background: '#1a1a2e',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 20px',
      borderRadius: '6px',
      fontWeight: 900,
      fontSize: '16px',
      marginBottom: '10px',
    },
    amountWords: {
      textAlign: 'center' as const,
      fontSize: '12px',
      padding: '8px 0 14px',
      color: '#444',
    },
    amountWordsHighlight: {
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      fontSize: '12px',
      color: '#1a1a2e',
      marginTop: '2px',
    },
    twoCol: {
      display: 'flex',
      gap: '20px',
      margin: '16px 0',
    },
    twoColBox: {
      flex: 1,
      border: '1px solid #e0e0e8',
      borderRadius: '8px',
      padding: '14px 16px',
      fontSize: '12px',
      lineHeight: '2',
    },
    twoColBoxTitle: {
      fontWeight: 700,
      fontSize: '12px',
      color: '#1a1a2e',
      marginBottom: '6px',
      paddingBottom: '4px',
      borderBottom: '1px solid #e0e0e8',
    },
    bottomRow: {
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
      margin: '16px 0',
    },
    bottomBox: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
    },
    barcode: {
      fontFamily: "'Courier New', monospace",
      fontSize: '28px',
      fontWeight: 700,
      letterSpacing: '3px',
      lineHeight: 1,
      color: '#000',
      marginBottom: '4px',
    },
    barcodeLabel: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#555',
      marginBottom: '8px',
    },
    qrLabel: {
      fontSize: '11px',
      fontWeight: 600,
      color: '#555',
      marginBottom: '8px',
    },
    terms: {
      fontSize: '11px',
      color: '#666',
      lineHeight: '1.7',
      marginBottom: '14px',
      padding: '12px 0',
      borderTop: '1px solid #e0e0e8',
    },
    footer: {
      textAlign: 'center' as const,
      borderTop: '2px solid #1a1a2e',
      paddingTop: '14px',
    },
    footerThank: {
      fontWeight: 900,
      fontSize: '14px',
      letterSpacing: '1px',
      color: '#1a1a2e',
      marginBottom: '4px',
    },
    footerName: {
      fontWeight: 700,
      fontSize: '12px',
      color: '#555',
      marginBottom: '2px',
    },
    footerTag: {
      fontSize: '11px',
      color: '#999',
    },
  };

  return (
    <div>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .inv-card { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>
      <div className="inv-card" style={styles.card}>
        {/* ═══════════ HEADER ═══════════ */}
        <div style={styles.header}>
          {company.logo_url ? (
            <img src={`${BACKEND_URL}${company.logo_url}`} alt="Logo" style={styles.headerLogo} />
          ) : (
            <div style={styles.headerLogoPlaceholder}>Logo</div>
          )}
          <div style={styles.headerInfo}>
            <div style={styles.companyName}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
            <div style={styles.companyDetails}>
              <div>{company.address || 'Therikiyur, Ayyampalayam, Trichy - 621005'}</div>
              <div>Phone: {company.mobile || '9876543210'} {company.gst_number ? `| GSTIN: ${company.gst_number}` : ''} {company.email ? `| Email: ${company.email}` : ''}</div>
            </div>
          </div>
        </div>

        {/* ═══════════ INVOICE TITLE ═══════════ */}
        <div style={styles.titleBadge}>
          <div style={styles.titleText}>TAX INVOICE</div>
        </div>

        {/* ═══════════ INVOICE & CUSTOMER DETAILS ═══════════ */}
        <div style={styles.infoRow}>
          <div style={styles.infoBox}>
            <div style={styles.infoBoxTitle}>INVOICE</div>
            <div><strong>Invoice No:</strong> {sale.bill_number}</div>
            <div><strong>Date:</strong> {formatDate(sale.bill_date)}</div>
            <div><strong>Time:</strong> {formatTime(sale.bill_time)}</div>
            <div><strong>Cashier ID:</strong> {sale.user_id?.slice(0, 8) || '-'}</div>
            <div><strong>Cashier:</strong> {sale.user_name || '-'}</div>
          </div>
          <div style={styles.infoBox}>
            <div style={styles.infoBoxTitle}>CUSTOMER</div>
            <div><strong>Customer ID:</strong> {sale.customer_id?.slice(0, 8) || 'WALK-IN'}</div>
            <div><strong>Name:</strong> {sale.customer_name || 'Walk-In Customer'}</div>
            <div><strong>Mobile:</strong> {sale.customer_mobile || '-'}</div>
          </div>
        </div>

        {/* ═══════════ ITEMS TABLE ═══════════ */}
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHead}>
              <th style={{ ...styles.tableTh, width: '30px', textAlign: 'center' }}>#</th>
              <th style={styles.tableTh}>Item Name</th>
              <th style={{ ...styles.tableTh, width: '55px', textAlign: 'center' }}>Unit</th>
              <th style={{ ...styles.tableTh, width: '50px', textAlign: 'center' }}>Qty</th>
              <th style={{ ...styles.tableTh, width: '85px', textAlign: 'right' }}>Rate</th>
              <th style={{ ...styles.tableTh, width: '60px', textAlign: 'center' }}>Disc%</th>
              <th style={{ ...styles.tableTh, width: '100px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td style={{ ...styles.tableTd, textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                <td style={styles.tableTd}>{item.product_name}</td>
                <td style={{ ...styles.tableTd, textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ ...styles.tableTd, textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ ...styles.tableTd, textAlign: 'right' }}>{Number(item.rate).toFixed(2)}</td>
                <td style={{ ...styles.tableTd, textAlign: 'center' }}>
                  {Number(item.discount_percentage) > 0 ? Number(item.discount_percentage).toFixed(1) : '-'}
                </td>
                <td style={{ ...styles.tableTd, textAlign: 'right', fontWeight: 600 }}>{Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#999' }}>No items</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={styles.countRow}>
          <span><strong>Items Count:</strong> {items.length}</span>
          <span><strong>Total Quantity:</strong> {totalQty}</span>
        </div>

        {/* ═══════════ SUMMARY ═══════════ */}
        <div style={styles.summarySection}>
          <table style={styles.summaryTable}>
            <tbody>
              <tr>
                <td style={{ ...styles.summaryTd, ...styles.summaryLabel }}>Sub Total</td>
                <td style={{ ...styles.summaryTd, ...styles.summaryValue }}>{formatCurrency(subtotal)}</td>
              </tr>
              {discountAmount > 0 && (
                <tr>
                  <td style={{ ...styles.summaryTd, ...styles.summaryLabel }}>Discount</td>
                  <td style={{ ...styles.summaryTd, ...styles.summaryValue, color: '#e53935' }}>-{formatCurrency(discountAmount)}</td>
                </tr>
              )}
              {cgst > 0 && (
                <tr>
                  <td style={{ ...styles.summaryTd, ...styles.summaryLabel }}>CGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</td>
                  <td style={{ ...styles.summaryTd, ...styles.summaryValue }}>{formatCurrency(cgst)}</td>
                </tr>
              )}
              {sgst > 0 && (
                <tr>
                  <td style={{ ...styles.summaryTd, ...styles.summaryLabel }}>SGST ({((gstTotal / 2 / subtotal) * 100).toFixed(2)}%)</td>
                  <td style={{ ...styles.summaryTd, ...styles.summaryValue }}>{formatCurrency(sgst)}</td>
                </tr>
              )}
              {roundOff !== 0 && (
                <tr>
                  <td style={{ ...styles.summaryTd, ...styles.summaryLabel }}>Round Off</td>
                  <td style={{ ...styles.summaryTd, ...styles.summaryValue }}>{roundOff.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.grandTotalBar}>
          <span>Grand Total</span>
          <span>{formatCurrency(Math.round(grandTotal))}</span>
        </div>

        <div style={styles.amountWords}>
          <span>Amount In Words:</span>
          <div style={styles.amountWordsHighlight}>{numberToWords(Math.round(grandTotal))} ONLY</div>
        </div>

        {/* ═══════════ PAYMENT & BANK ═══════════ */}
        <div style={styles.twoCol}>
          <div style={styles.twoColBox}>
            <div style={styles.twoColBoxTitle}>PAYMENT INFORMATION</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Method</span><span style={{ fontWeight: 600 }}>{(sale.payment_mode || 'CASH').toUpperCase()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Received Amount</span><span style={{ fontWeight: 600 }}>{formatCurrency(Math.round(grandTotal))}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Balance Amount</span><span style={{ fontWeight: 600 }}>{formatCurrency(0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Reference Number</span><span style={{ fontWeight: 600 }}>{sale.bill_number || '-'}</span></div>
          </div>
          <div style={styles.twoColBox}>
            <div style={styles.twoColBoxTitle}>BANK DETAILS</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bank Name</span><span>{settings['bank_name'] || '-'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account Name</span><span>{settings['account_name'] || '-'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Account Number</span><span>{settings['account_number'] || '-'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IFSC Code</span><span>{settings['ifsc_code'] || '-'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>UPI ID</span><span>{upiId || '-'}</span></div>
          </div>
        </div>

        {/* ═══════════ BARCODE & QR ═══════════ */}
        <div style={styles.bottomRow}>
          <div style={styles.bottomBox}>
            <div style={styles.barcodeLabel}>Invoice Barcode</div>
            <div style={styles.barcode}>{barcodeChars}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: '#555' }}>{barcodeChars}</div>
          </div>
          <div style={styles.bottomBox}>
            <div style={styles.qrLabel}>Scan & Pay (UPI)</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '110px', height: '110px' }} />
            ) : (
              <div style={{ width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#999', border: '1px dashed #ccc', borderRadius: '6px' }}>
                UPI QR
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ TERMS ═══════════ */}
        <div style={styles.terms}>
          <strong>Terms &amp; Conditions:</strong><br />
          1. Goods once sold cannot be returned.<br />
          2. Please retain this receipt for future reference.<br />
          3. Thank you for choosing {company.company_name || 'Student Xerox'}.
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div style={styles.footer}>
          <div style={styles.footerThank}>THANK YOU VISIT AGAIN!</div>
          <div style={styles.footerName}>{company.company_name?.toUpperCase() || 'STUDENT XEROX'}</div>
          <div style={styles.footerTag}>Fast Service &bull; Quality Printing</div>
        </div>
      </div>
    </div>
  );
}
