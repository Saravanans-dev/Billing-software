import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import type { Product } from '../types';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ product_name: '', category: '', unit: 'Kg', hsn_code: '', gst_percentage: 0, purchase_rate: 0, wholesale_rate: 0, retail_rate: 0, minimum_stock: 0, current_stock: 0, barcode: '' });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${search}&page=${page}&limit=50`);
      setProducts(data.products);
      setTotal(data.total);
    } catch { toast.error('Failed to load products'); } finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, [search, page]);

  const openAdd = () => { setEditId(null); setForm({ product_name: '', category: '', unit: 'Kg', hsn_code: '', gst_percentage: 0, purchase_rate: 0, wholesale_rate: 0, retail_rate: 0, minimum_stock: 0, current_stock: 0, barcode: '' }); setShowModal(true); };

  const openEdit = (p: Product) => { setEditId(p.id); setForm(p); setShowModal(true); };

  const handleSave = async () => {
    if (!form.product_name) { toast.error('Product name is required'); return; }
    try {
      if (editId) {
        await api.put(`/products/${editId}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/products', form);
        toast.success('Product created');
      }
      setShowModal(false);
      loadProducts();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Product deleted'); loadProducts(); } catch { toast.error('Failed'); }
  };

  const exportExcel = () => { window.open(`${BACKEND_URL}/api/exports/products-excel`, '_blank'); };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportExcel}><Download className="w-3.5 h-3.5" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Product</Button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <DataTable
            searchable
            searchValue={search}
            onSearch={setSearch}
            columns={[
              { key: 'product_name', header: 'Product Name', className: 'font-medium' },
              { key: 'category', header: 'Category' },
              { key: 'unit', header: 'Unit' },
              { key: 'current_stock', header: 'Stock', render: (v) => v ?? 0 },
              { key: 'purchase_rate', header: 'Purchase Rate', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'wholesale_rate', header: 'Wholesale', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'retail_rate', header: 'Retail', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'gst_percentage', header: 'GST %', render: (v) => `${v || 0}%` },
              { key: 'id', header: 'Actions', render: (_, row) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ) },
            ]}
            data={products}
            loading={loading}
            page={page}
            total={total}
            onPageChange={setPage}
            emptyMessage="No Products Found"
          />
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Product' : 'Add Product'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Product Name *" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          <Input label="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input label="HSN Code" value={form.hsn_code || ''} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} />
          <Input label="GST %" type="number" value={form.gst_percentage} onChange={(e) => setForm({ ...form, gst_percentage: parseFloat(e.target.value) || 0 })} />
          <Input label="Barcode" value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <Input label="Purchase Rate" type="number" value={form.purchase_rate} onChange={(e) => setForm({ ...form, purchase_rate: parseFloat(e.target.value) || 0 })} />
          <Input label="Wholesale Rate" type="number" value={form.wholesale_rate} onChange={(e) => setForm({ ...form, wholesale_rate: parseFloat(e.target.value) || 0 })} />
          <Input label="Retail Rate" type="number" value={form.retail_rate} onChange={(e) => setForm({ ...form, retail_rate: parseFloat(e.target.value) || 0 })} />
          <Input label="Minimum Stock" type="number" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: parseFloat(e.target.value) || 0 })} />
          <Input label="Current Stock" type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
        </div>
      </Modal>
    </div>
  );
}
