import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ThermalReceipt } from '../components/invoice/ThermalReceipt';
import type { Sale, SaleItem, CompanySettings } from '../types';

export function ReceiptPrint() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<(Sale & { items: SaleItem[]; user_name?: string }) | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/sales/${id}`),
      api.get('/settings/company'),
      api.get('/settings'),
    ])
      .then(([saleRes, companyRes, settingsRes]) => {
        setSale(saleRes.data);
        setCompany(companyRes.data);
        setSettings(settingsRes.data);
      })
      .catch(() => toast.error('Failed to load receipt'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && sale) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, sale]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'monospace', fontSize: '14px' }}>
        Loading receipt...
      </div>
    );
  }

  if (!sale || !company) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'monospace', fontSize: '14px', color: 'red' }}>
        Receipt not found
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '10px', fontFamily: 'monospace' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '8px 24px',
            fontSize: '14px',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Print Receipt
        </button>
      </div>
      <ThermalReceipt sale={sale} company={company} settings={settings} />
    </div>
  );
}
