import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { DataTable } from '../components/ui/DataTable';
import { formatCurrency } from '../lib/utils';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ supplier_name: '', mobile: '', address: '', gst_number: '' });

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const openAdd = () => { setEditId(null); setForm({ supplier_name: '', mobile: '', address: '', gst_number: '' }); setShowModal(true); };

  const openEdit = (s: any) => { setEditId(s.id); setForm(s); setShowModal(true); };

  const handleSave = async () => {
    if (!form.supplier_name) { toast.error('Name is required'); return; }
    try {
      if (editId) { await api.put(`/suppliers/${editId}`, form); toast.success('Supplier updated'); }
      else { await api.post('/suppliers', form); toast.success('Supplier created'); }
      setShowModal(false); loadSuppliers();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await api.delete(`/suppliers/${id}`); toast.success('Deleted'); loadSuppliers(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
        <Button size="sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Supplier</Button>
      </div>
      <div className="card">
        <div className="card-body">
          <DataTable
            columns={[
              { key: 'supplier_name', header: 'Name', className: 'font-medium' },
              { key: 'mobile', header: 'Mobile' },
              { key: 'address', header: 'Address' },
              { key: 'gst_number', header: 'GST' },
              { key: 'outstanding_amount', header: 'Outstanding', render: (v) => formatCurrency(v || 0), className: 'text-right' },
              { key: 'id', header: 'Actions', render: (_, row) => (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )},
            ]}
            data={suppliers} loading={loading}
            emptyMessage="No Suppliers Found"
          />
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Supplier' : 'Add Supplier'}>
        <div className="space-y-3">
          <Input label="Supplier Name *" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} />
          <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
