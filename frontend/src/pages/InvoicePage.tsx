import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { formatCurrency } from '../lib/utils';
import { API_URL } from '../services/api';

interface SaleItem {
  id?: string;
  product_name: string;
  unit: string;
  quantity: number;
  rate: number;
  discount_percentage: number;
  discount_amount: number;
  gst_percentage: number;
  gst_amount: number;
  amount: number;
}

interface Sale {
  id: string;
  bill_number: string;
  bill_date: string;
  bill_time: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_address?: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  gst_amount: number;
  grand_total: number;
  round_off: number;
  payment_mode: string;
  user_name?: string;
  items: SaleItem[];
}

interface Company {
  company_name: string;
  address?: string;
  mobile?: string;
  email?: string;
  gst_number?: string;
  logo_url?: string;
}

export function InvoicePage() {
  const { billNumber } = useParams<{ billNumber: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [upiId, setUpiId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!billNumber) return;
    fetch(`${API_URL}/invoice/${encodeURIComponent(billNumber)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) { setSale(data.sale); setCompany(data.company); setUpiId(data.upi_id || ''); setLoading(false); }
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [billNumber]);

  useEffect(() => {
    if (!upiId || !sale) return;
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(company?.company_name || '')}&am=${Number(sale.grand_total).toFixed(2)}&cu=INR&tn=${encodeURIComponent(sale.bill_number)}`;
    QRCode.toDataURL(upiLink, { width: 180, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl).catch(() => {});
  }, [upiId, sale, company]);

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    window.print();
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading invoice...</div>
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', color: '#d32f2f' }}>!</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333', margin: '0 0 8px' }}>Invoice Not Found</h1>
        <p style={{ fontSize: '14px', color: '#888' }}>The invoice you are looking for does not exist.</p>
      </div>
    );
  }

  const items = sale.items || [];
  const cgst = sale.gst_amount / 2;
  const sgst = sale.gst_amount / 2;

  const iStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '800px',
    margin: '20px auto',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  };

  const hStyle: React.CSSProperties = {
    background: '#1a237e',
    color: '#fff',
    padding: '24px 32px',
    textAlign: 'center',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '24px 32px',
  };

  const row: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '14px',
  };

  const label: React.CSSProperties = {
    color: '#666',
    fontWeight: 500,
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 8px',
    borderBottom: '2px solid #1a237e',
    fontWeight: 600,
    color: '#1a237e',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px',
    borderBottom: '1px solid #e0e0e0',
  };

  const totalStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontSize: '14px',
  };

  const grandTotalStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '18px',
    fontWeight: 700,
    borderTop: '2px solid #1a237e',
    borderBottom: '2px solid #1a237e',
    marginTop: '8px',
  };

  const btnRow: React.CSSProperties = {
    textAlign: 'center',
    padding: '16px 32px',
    background: '#fafafa',
  };

  const btn: React.CSSProperties = {
    padding: '10px 32px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    margin: '0 8px',
  };

  const printBtn: React.CSSProperties = {
    ...btn,
    background: '#1a237e',
    color: '#fff',
  };

  const footer: React.CSSProperties = {
    textAlign: 'center',
    padding: '16px 32px',
    borderTop: '1px solid #e0e0e0',
    fontSize: '12px',
    color: '#999',
  };

  return (
    <div>
      <div className="no-print" style={btnRow}>
        <button onClick={handlePrint} style={printBtn}>PRINT INVOICE</button>
        <button onClick={handleDownloadPDF} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #ccc' }}>DOWNLOAD PDF</button>
      </div>
      <div ref={printRef} style={iStyle}>
        <div style={hStyle}>
          <h1 style={{ margin: '0', fontSize: '22px', letterSpacing: '1px' }}>{company?.company_name?.toUpperCase() || 'STUDENT XEROX'}</h1>
          {company?.address ? <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>{company.address}</p> : null}
          {company?.mobile ? <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.85 }}>Ph: {company.mobile}</p> : null}
          {company?.email ? <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.85 }}>{company.email}</p> : null}
          {company?.gst_number ? <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.85 }}>GSTIN: {company.gst_number}</p> : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid #e0e0e0' }}>
          <div>
            <h3 style={{ margin: '0 0 8px', color: '#1a237e', fontSize: '16px' }}>Invoice Details</h3>
            <div style={row}><span style={label}>Invoice No</span><span>{sale.bill_number}</span></div>
            <div style={row}><span style={label}>Date</span><span>{formatDate(sale.bill_date)}</span></div>
            <div style={row}><span style={label}>Time</span><span>{sale.bill_time?.slice(0, 5)}</span></div>
            <div style={row}><span style={label}>Cashier</span><span>{sale.user_name || '-'}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: '0 0 8px', color: '#1a237e', fontSize: '16px' }}>Customer Details</h3>
            <div style={row}><span style={label}>Name</span><span>{sale.customer_name || 'Walk-In Customer'}</span></div>
            <div style={row}><span style={label}>Mobile</span><span>{sale.customer_mobile || '-'}</span></div>
            {sale.customer_address ? <div style={row}><span style={label}>Address</span><span>{sale.customer_address}</span></div> : null}
          </div>
        </div>

        <div style={sectionStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Item</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Rate</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>GST</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{item.product_name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{Number(item.quantity)} {item.unit}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(Number(item.rate))}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(item.gst_percentage)}%</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(Number(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '0 32px 24px' }}>
          <div style={totalStyle}><span>Sub Total</span><span>{formatCurrency(sale.subtotal)}</span></div>
          {sale.discount_amount > 0 ? <div style={totalStyle}><span>Discount</span><span>-{formatCurrency(sale.discount_amount)}</span></div> : null}
          <div style={totalStyle}><span>CGST (50%)</span><span>{formatCurrency(cgst)}</span></div>
          <div style={totalStyle}><span>SGST (50%)</span><span>{formatCurrency(sgst)}</span></div>
          {sale.round_off !== 0 ? <div style={totalStyle}><span>Round Off</span><span>{sale.round_off.toFixed(2)}</span></div> : null}
          <div style={grandTotalStyle}><span>Grand Total</span><span>{formatCurrency(Math.round(sale.grand_total))}</span></div>
            <div style={{ ...totalStyle, marginTop: '8px' }}>
              <span>Payment Mode</span>
              <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{sale.payment_mode || 'CASH'}</span>
            </div>
          </div>

          {upiId && qrDataUrl ? (
            <div style={{ textAlign: 'center', padding: '16px 32px 24px', borderTop: '1px solid #e0e0e0' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666', fontWeight: 500 }}>Scan to Pay</p>
              <img src={qrDataUrl} alt="UPI QR" style={{ width: 140, height: 140 }} />
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#999' }}>UPI Payment • {formatCurrency(sale.grand_total)}</p>
            </div>
          ) : null}

        <div style={footer}>
          <p style={{ margin: '0', fontWeight: 600, fontSize: '14px' }}>Thank you for choosing {company?.company_name || 'Student Xerox'}!</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px' }}>This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  );
}
