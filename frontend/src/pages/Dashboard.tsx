import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, Package, IndianRupee, AlertTriangle,
  Receipt, ShoppingCart, Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDate } from '../lib/utils';
import type { DashboardStats } from '../types';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await api.get('/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading dashboard...
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Today's Sales", value: formatCurrency(stats?.todaySales?.total || 0), sub: `${stats?.todaySales?.count || 0} bills`, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Monthly Sales', value: formatCurrency(stats?.monthlySales?.total || 0), sub: `${stats?.monthlySales?.count || 0} bills`, icon: IndianRupee, color: 'text-green-600 bg-green-50' },
    { label: 'Yearly Sales', value: formatCurrency(stats?.yearlySales?.total || 0), sub: `${stats?.yearlySales?.count || 0} bills`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { label: 'Total Customers', value: String(stats?.totalCustomers || 0), sub: 'active customers', icon: Users, color: 'text-orange-600 bg-orange-50' },
    { label: 'Total Products', value: String(stats?.totalProducts || 0), sub: 'active products', icon: Package, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Stock Value', value: formatCurrency(stats?.stockValue || 0), sub: 'current inventory', icon: IndianRupee, color: 'text-teal-600 bg-teal-50' },
    { label: 'Pending Payments', value: formatCurrency(stats?.pendingPayments || 0), sub: 'outstanding amount', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Low Stock', value: String(stats?.lowStockProducts || 0), sub: 'products need attention', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
  ];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time business overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate('/billing')}>
            <Plus className="w-3.5 h-3.5" /> New Bill
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/purchases')}>
            <ShoppingCart className="w-3.5 h-3.5" /> New Purchase
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/products')}>
            <Package className="w-3.5 h-3.5" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-800">Monthly Revenue</h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#1a56db" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-800">Top Selling Products</h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="product_name" type="category" width={130} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total_amount" fill="#1a56db" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-800">Recent Sales</h3>
        </div>
        <div className="card-body p-0">
          <DataTable
            columns={[
              { key: 'bill_number', header: 'Bill No' },
              { key: 'customer_name', header: 'Customer', render: (v) => v || 'Walk-In' },
              { key: 'bill_date', header: 'Date', render: (v) => formatDate(v) },
              { key: 'grand_total', header: 'Amount', render: (v) => formatCurrency(v), className: 'text-right font-medium' },
              { key: 'payment_mode', header: 'Payment', render: (v) => <span className="badge-blue capitalize">{v}</span> },
              { key: 'user_name', header: 'User', render: (v) => v || '-' },
            ]}
            data={stats?.recentSales || []}
            emptyMessage="No Sales Yet"
          />
        </div>
      </div>
    </div>
  );
}
