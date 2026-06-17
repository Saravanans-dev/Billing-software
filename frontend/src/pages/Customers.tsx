import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import type { Customer } from '../types';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: '', mobile: '', address: '', gst_number: '', credit_limit: 0 });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/customers?search=${search}&page=${page}&limit=50`);
      setCustomers(data.customers);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadCustomers(); }, [search, page]);

  const openAdd = () => { setEditId(null); setForm({ customer_name: '', mobile: '', address: '', gst_number: '', credit_limit: 0 }); setShowModal(true); };

  const openEdit = (c: any) => { setEditId(c.id); setForm(c); setShowModal(true); };

  const handleSave = async () => {
    if (!form.customer_name) { toast.error('Name is required'); return; }
    try {
      if (editId) { await api.put(`/customers/${editId}`, form); toast.success('Customer updated'); }
      else { await api.post('/customers', form); toast.success('Customer created'); }
      setShowModal(false); loadCustomers();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); toast.success('Deleted'); loadCustomers(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Customer</Button>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            searchable searchValue={search} onSearch={setSearch}
            columns={[
              { key: 'customer_name', header: 'Name', className: 'font-medium' },
              { key: 'mobile', header: 'Mobile' },
              { key: 'gst_number', header: 'GST' },
              { key: 'credit_limit', header: 'Credit Limit', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'outstanding_amount', header: 'Outstanding', render: (v) => <span className={v > 0 ? 'text-red-500 font-medium' : ''}>{formatCurrency(v || 0)}</span>, className: 'text-right' },
              { key: 'id', header: 'Actions', render: (_, row) => (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )},
            ]}
            data={customers} loading={loading} page={page} total={total} onPageChange={setPage}
            emptyMessage="No Customers Found"
          />
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-3">
          <Input label="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
          <Input label="Credit Limit" type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
