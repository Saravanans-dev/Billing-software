import { useState, useEffect } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency, formatDate } from '../lib/utils';

export function Purchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierMobile, setSupplierMobile] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPurchases();
    api.get('/suppliers').then(({ data }) => setSuppliers(data));
    api.get('/products?limit=200').then(({ data }) => setProducts(data.products));
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchases?limit=100');
      setPurchases(data.purchases);
    } catch {} finally { setLoading(false); }
  };

  const addItem = (product: any) => {
    setItems([...items, {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.product_name,
      category: product.category,
      unit: product.unit || 'Kg',
      hsn_code: product.hsn_code,
      quantity: 1,
      rate: product.purchase_rate || 0,
      gst_percentage: parseFloat(product.gst_percentage) || 0,
      gst_amount: 0,
      amount: product.purchase_rate || 0,
    }]);
  };

  const updateItem = (id: string, field: string, value: number) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const u = { ...i, [field]: value };
      if (field === 'quantity' || field === 'rate') {
        u.amount = u.quantity * u.rate;
        u.gst_amount = (u.amount * u.gst_percentage) / 100;
      }
      return u;
    }));
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const gstAmount = items.reduce((s, i) => s + i.gst_amount, 0);
    try {
      await api.post('/purchases', { supplier_id: supplierId || null, supplier_name: supplierName, supplier_mobile: supplierMobile, items, subtotal, gst_amount: gstAmount, grand_total: subtotal + gstAmount, payment_mode: paymentMode, notes });
      toast.success('Purchase saved');
      setShowModal(false);
      setItems([]);
      setSupplierId('');
      setSupplierName('');
      loadPurchases();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Purchases</h1>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus className="w-3.5 h-3.5" /> New Purchase</Button>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: 'purchase_number', header: 'Purchase #', className: 'font-medium' },
              { key: 'purchase_date', header: 'Date', render: (v) => formatDate(v) },
              { key: 'supplier_name', header: 'Supplier' },
              { key: 'grand_total', header: 'Total', render: (v) => formatCurrency(v), className: 'text-right font-medium' },
              { key: 'payment_mode', header: 'Payment', render: (v) => v ? <span className="badge-blue capitalize">{v}</span> : '-' },
              { key: 'user_name', header: 'User' },
            ]}
            data={purchases}
            loading={loading}
            emptyMessage="No Purchases Found"
          />
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setItems([]); }} title="New Purchase Entry" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Supplier</label>
              <select className="input-field" value={supplierId} onChange={(e) => {
                const s = suppliers.find(sp => sp.id === e.target.value);
                setSupplierId(e.target.value);
                setSupplierName(s?.supplier_name || '');
                setSupplierMobile(s?.mobile || '');
              }}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <Input label="Supplier Name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            <Input label="Mobile" value={supplierMobile} onChange={(e) => setSupplierMobile(e.target.value)} />
          </div>

          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search product to add..." className="input-field pl-10"
                onChange={(e) => {
                  const term = e.target.value;
                  if (term.length > 1) {
                    api.get(`/products?search=${term}&limit=10`).then(({ data }) => setProducts(data.products));
                  }
                }}
              />
            </div>
            {products.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {products.filter(p => p.is_active !== false).slice(0, 10).map(p => (
                  <button key={p.id} onClick={() => addItem(p)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">{p.product_name}</button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Rate</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-16">GST</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Amount</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{item.product_name}</td>
                    <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 text-right text-xs border rounded" /></td>
                    <td className="px-3 py-2"><input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 text-right text-xs border rounded" /></td>
                    <td className="px-3 py-2 text-right">{item.gst_percentage}%</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="px-3 py-2"><button onClick={() => removeItem(item.id)} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payment Mode</label>
              <select className="input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => { setShowModal(false); setItems([]); }}>Cancel</Button>
            <Button onClick={handleSave}>Save Purchase</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
