import { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, TrendingUp, Package, Users, Store, AlertTriangle, Receipt } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDate } from '../lib/utils';

const reportTypes = [
  { id: 'daily-sales', label: 'Daily Sales Report', icon: Receipt },
  { id: 'monthly-sales', label: 'Monthly Sales Report', icon: BarChart3 },
  { id: 'yearly-sales', label: 'Yearly Sales Report', icon: TrendingUp },
  { id: 'purchase', label: 'Purchase Report', icon: Package },
  { id: 'stock', label: 'Stock Report', icon: Package },
  { id: 'customer', label: 'Customer Report', icon: Users },
  { id: 'supplier', label: 'Supplier Report', icon: Store },
  { id: 'profit-loss', label: 'Profit & Loss Report', icon: TrendingUp },
  { id: 'gst', label: 'GST Report', icon: FileText },
  { id: 'outstanding', label: 'Outstanding Report', icon: AlertTriangle },
];

export function Reports() {
  const [activeReport, setActiveReport] = useState('daily-sales');
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      let params: any = { from: fromDate, to: toDate };

      switch (activeReport) {
        case 'daily-sales': params.period = 'daily'; endpoint = '/reports/sales'; break;
        case 'monthly-sales': params.period = 'monthly'; endpoint = '/reports/sales'; break;
        case 'yearly-sales': params.period = 'yearly'; endpoint = '/reports/sales'; break;
        case 'stock': endpoint = '/reports/stock'; break;
        case 'profit-loss': endpoint = '/reports/profit-loss'; break;
        case 'gst': endpoint = '/reports/gst'; break;
        case 'outstanding': endpoint = '/reports/outstanding'; break;
        default: endpoint = '/reports/sales';
      }

      const { data: result } = await api.get(endpoint, { params });
      // Handle grouped responses like { value: [...], Count: N }
      const rows = result?.value ?? result;
      setData(Array.isArray(rows) ? rows : [rows]);
    } catch (error) {
      console.error('Report error:', error);
      setData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [activeReport]);

  const exportExcel = async () => {
    try {
      const res = await api.get('/exports/sales-excel', {
        params: { from: fromDate, to: toDate },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      window.open(url, '_blank');
    } catch {
      // ignore
    }
  };

  const renderReportContent = () => {
    if (activeReport === 'profit-loss' && data.length > 0) {
      const d = data[0];
      return (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="stat-card"><p className="text-xs text-gray-500">Total Sales</p><p className="text-lg font-bold text-green-600">{formatCurrency(d.totalSales || 0)}</p></div>
          <div className="stat-card"><p className="text-xs text-gray-500">Total Cost</p><p className="text-lg font-bold text-red-600">{formatCurrency(d.totalCost || 0)}</p></div>
          <div className="stat-card"><p className="text-xs text-gray-500">Gross Profit</p><p className="text-lg font-bold text-blue-600">{formatCurrency(d.grossProfit || 0)}</p></div>
          <div className="stat-card"><p className="text-xs text-gray-500">Purchases</p><p className="text-lg font-bold">{formatCurrency(d.totalPurchases || 0)}</p></div>
          <div className="stat-card"><p className="text-xs text-gray-500">Expenses</p><p className="text-lg font-bold text-orange-600">{formatCurrency(d.totalExpenses || 0)}</p></div>
          <div className="stat-card"><p className="text-xs text-gray-500">Net Profit</p><p className={`text-lg font-bold ${d.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(d.netProfit || 0)}</p></div>
        </div>
      );
    }

    return (
      <DataTable
        columns={
          data.length > 0 ? Object.keys(data[0]).map(key => ({
            key,
            header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            render: (v: any) => {
              if (typeof v === 'number') return formatCurrency(v);
              if (v instanceof Date || typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) return formatDate(v);
              return v;
            }
          })) : []
        }
        data={data} loading={loading}
        emptyMessage="No Report Data Available"
      />
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <Button variant="secondary" size="sm" onClick={exportExcel}>
          <Download className="w-3.5 h-3.5" /> Export Excel
        </Button>
      </div>

      <div className="flex gap-5">
        <div className="w-56 shrink-0">
          <div className="space-y-1">
            {reportTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                  activeReport === r.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <r.icon className="w-4 h-4" />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">{reportTypes.find(r => r.id === activeReport)?.label}</h3>
              <div className="flex items-center gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg" />
                <Button size="sm" onClick={loadReport}>Load</Button>
              </div>
            </div>
            <div className="card-body">
              {renderReportContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
