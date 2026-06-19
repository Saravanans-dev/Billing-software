import { useState, useEffect, useMemo } from 'react';
import { Search, Database } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../lib/utils';

type TabKey = 'products' | 'customers' | 'invoices' | 'items' | 'users' | 'settings';

interface AdminData {
  products: any[];
  customers: any[];
  sales: any[];
  saleItems: any[];
  users: any[];
  company: any;
  settings: Record<string, string>;
  counts: Record<string, number>;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'items', label: 'Invoice Items' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' },
];

export function AdminData() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('products');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => { setPage(1); }, [search, activeTab]);

  useEffect(() => {
    api.get('/admin/data')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const rows = data[activeTab === 'items' ? 'saleItems' : activeTab === 'invoices' ? 'sales' : activeTab] || [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r: any) =>
      Object.values(r).some((v: any) =>
        v != null && String(v).toLowerCase().includes(q)
      )
    );
  }, [data, activeTab, search]);

  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading data...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-gray-900">Admin Data Viewer</h1>
        </div>
        {data && (
          <div className="text-sm text-gray-500">
            {totalRecords} record{totalRecords !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {data && <span className="ml-1.5 text-xs text-gray-400">({data.counts[tab.key === 'items' ? 'saleItems' : tab.key === 'invoices' ? 'sales' : tab.key] || 0})</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'products' && <ProductsTable data={paginated} />}
            {activeTab === 'customers' && <CustomersTable data={paginated} />}
            {activeTab === 'invoices' && <InvoicesTable data={paginated} />}
            {activeTab === 'items' && <InvoiceItemsTable data={paginated} />}
            {activeTab === 'users' && <UsersTable data={paginated} />}
            {activeTab === 'settings' && <SettingsTable company={data?.company} settings={data?.settings} />}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsTable({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Product Name</th>
          <th>Barcode</th>
          <th>Category</th>
          <th>Unit</th>
          <th className="text-right">Purchase Rate</th>
          <th className="text-right">Retail Rate</th>
          <th className="text-right">Stock</th>
          <th className="text-right">GST %</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p, i) => (
          <tr key={p.id}>
            <td className="text-gray-500">{i + 1}</td>
            <td className="font-medium">{p.product_name}</td>
            <td className="text-gray-600">{p.barcode || '-'}</td>
            <td>{p.category || '-'}</td>
            <td>{p.unit}</td>
            <td className="text-right">{formatCurrency(p.purchase_rate)}</td>
            <td className="text-right">{formatCurrency(p.retail_rate)}</td>
            <td className="text-right">
              <span className={p.current_stock <= p.minimum_stock ? 'text-red-600 font-semibold' : ''}>
                {Number(p.current_stock).toFixed(2)}
              </span>
            </td>
            <td className="text-right">{Number(p.gst_percentage).toFixed(1)}%</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-8">No products found</td></tr>}
      </tbody>
    </table>
  );
}

function CustomersTable({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Customer Name</th>
          <th>Mobile Number</th>
          <th>Address</th>
          <th>GST Number</th>
          <th className="text-right">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c, i) => (
          <tr key={c.id}>
            <td className="text-gray-500">{i + 1}</td>
            <td className="font-medium">{c.customer_name}</td>
            <td>{c.mobile || '-'}</td>
            <td className="max-w-[200px] truncate">{c.address || '-'}</td>
            <td>{c.gst_number || '-'}</td>
            <td className="text-right">{formatCurrency(c.outstanding_amount)}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No customers found</td></tr>}
      </tbody>
    </table>
  );
}

function InvoicesTable({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Invoice No</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Payment Mode</th>
          <th>Cashier</th>
          <th className="text-right">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s, i) => (
          <tr key={s.id}>
            <td className="text-gray-500">{i + 1}</td>
            <td className="font-medium">{s.bill_number}</td>
            <td>{new Date(s.bill_date).toLocaleDateString('en-IN')}</td>
            <td>{s.customer_name || 'Walk-In'}</td>
            <td className="capitalize">{s.payment_mode || '-'}</td>
            <td>{s.user_name || '-'}</td>
            <td className="text-right font-semibold">{formatCurrency(s.grand_total)}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No invoices found</td></tr>}
      </tbody>
    </table>
  );
}

function InvoiceItemsTable({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Invoice No</th>
          <th>Product Name</th>
          <th>Unit</th>
          <th className="text-right">Quantity</th>
          <th className="text-right">Rate</th>
          <th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {data.map((si, i) => (
          <tr key={si.id}>
            <td className="text-gray-500">{i + 1}</td>
            <td className="font-medium">{si.bill_number}</td>
            <td>{si.product_name}</td>
            <td>{si.unit || '-'}</td>
            <td className="text-right">{Number(si.quantity).toFixed(2)}</td>
            <td className="text-right">{formatCurrency(si.rate)}</td>
            <td className="text-right font-semibold">{formatCurrency(si.amount)}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No invoice items found</td></tr>}
      </tbody>
    </table>
  );
}

function UsersTable({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Username</th>
          <th>Full Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Last Login</th>
        </tr>
      </thead>
      <tbody>
        {data.map((u, i) => (
          <tr key={u.id}>
            <td className="text-gray-500">{i + 1}</td>
            <td className="font-medium">{u.username}</td>
            <td>{u.full_name}</td>
            <td><span className={`badge-${u.role === 'admin' ? 'blue' : u.role === 'manager' ? 'yellow' : 'green'}`}>{u.role}</span></td>
            <td>{u.is_active ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>}</td>
            <td className="text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Never'}</td>
          </tr>
        ))}
        {data.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No users found</td></tr>}
      </tbody>
    </table>
  );
}

function SettingsTable({ company, settings }: { company: any; settings: Record<string, string> | undefined }) {
  return (
    <div className="space-y-6">
      {company && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Store Information</h3>
          <table className="data-table">
            <tbody>
              {[
                { label: 'Company Name', value: company.company_name },
                { label: 'Address', value: company.address },
                { label: 'Mobile', value: company.mobile },
                { label: 'Email', value: company.email },
                { label: 'GST Number', value: company.gst_number },
                { label: 'PAN Number', value: company.pan_number },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="font-medium w-40 border-r border-gray-100">{row.label}</td>
                  <td>{row.value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {settings && Object.keys(settings).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Application Settings</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(settings).map(([key, value]) => (
                <tr key={key}>
                  <td className="font-medium w-40 border-r border-gray-100">{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                  <td>{value || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
