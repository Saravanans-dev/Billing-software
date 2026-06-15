import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../lib/utils';

export function Stock() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/stock');
      setStock(data);
    } catch {} finally { setLoading(false); }
  };

  const lowStockCount = stock.filter((s: any) => s.stock_status === 'low_stock' || s.stock_status === 'out_of_stock').length;
  const stockValue = stock.reduce((sum: number, s: any) => sum + parseFloat(s.stock_value || 0), 0);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Stock Management</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Stock Value</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(stockValue)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Low Stock Alerts</p>
            <p className={`text-sm font-bold ${lowStockCount > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {lowStockCount > 0 ? `${lowStockCount} items` : 'None'}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: 'product_name', header: 'Product', className: 'font-medium' },
              { key: 'category', header: 'Category' },
              { key: 'current_stock', header: 'Available Qty', render: (v, row) => (
                <span className={
                  row.stock_status === 'out_of_stock' ? 'text-red-600 font-bold' :
                  row.stock_status === 'low_stock' ? 'text-red-500 font-medium' :
                  row.stock_status === 'near_low' ? 'text-orange-500' : 'text-green-600'
                }>{v ?? 0}</span>
              )},
              { key: 'unit', header: 'Unit' },
              { key: 'minimum_stock', header: 'Min Stock' },
              { key: 'stock_value', header: 'Stock Value', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'purchase_rate', header: 'Purchase Rate', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'wholesale_rate', header: 'Wholesale', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'retail_rate', header: 'Retail', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'stock_status', header: 'Status', render: (v) => {
                if (v === 'out_of_stock') return <span className="badge-red flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Out of Stock</span>;
                if (v === 'low_stock') return <span className="badge-red">Low Stock</span>;
                if (v === 'near_low') return <span className="badge-yellow">Near Low</span>;
                return <span className="badge-green">Healthy</span>;
              }},
            ]}
            data={stock}
            loading={loading}
            emptyMessage="No Products in Stock"
          />
        </div>
      </div>
    </div>
  );
}
