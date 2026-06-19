import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Trash2, Printer, Download, Save, X, UserPlus,
  ChevronDown, Calculator, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import type { Product, Customer } from '../types';

interface LineItem {
  id: string;
  product_id: string;
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

export function Billing() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-In Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ customer_name: '', mobile: '', address: '', gst_number: '' });
  const productSearchRef = useRef<HTMLInputElement>(null);

  const productSearchTimer = useRef<any>();

  useEffect(() => {
    api.get('/customers?limit=100').then(({ data }) => setCustomers(data.customers));
    api.get('/products?limit=200').then(({ data }) => setProducts(data.products));
  }, []);

  const searchProducts = useCallback((term: string) => {
    setProductSearch(term);
    clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(() => {
      api.get(`/products?search=${term}&limit=20`).then(({ data }) => setProducts(data.products));
    }, 300);
  }, []);

  const addItem = (product: Product) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems(items.map((i) =>
        i.product_id === product.id ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.rate } : i
      ));
    } else {
      const rate = parseFloat(product.wholesale_rate) || parseFloat(product.retail_rate) || 0;
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.product_name,
        unit: product.unit || 'Kg',
        quantity: 1,
        rate,
        discount_percentage: 0,
        discount_amount: 0,
        gst_percentage: parseFloat(product.gst_percentage) || 0,
        gst_amount: 0,
        amount: rate,
      }]);
    }
    setShowProductSearch(false);
    setProductSearch('');
  };

  const updateItem = (id: string, field: string, value: number) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate;
      }
      if (updated.gst_percentage > 0) {
        updated.gst_amount = (updated.amount * updated.gst_percentage) / 100;
      }
      if (updated.discount_percentage > 0) {
        updated.discount_amount = (updated.amount * updated.discount_percentage) / 100;
      }
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const totalDiscount = items.reduce((sum, i) => sum + i.discount_amount, 0);
    const discountAmount = discountType === 'percentage' ? (subtotal * discountValue) / 100 : discountValue;
    const taxableAmount = subtotal - discountAmount - totalDiscount;
    const gstAmount = items.reduce((sum, i) => sum + i.gst_amount, 0);
    const grandTotal = taxableAmount + gstAmount;
    const roundOff = Math.round(grandTotal) - grandTotal;
    return { subtotal, discountAmount, taxableAmount, gstAmount, grandTotal, roundOff };
  };

  const handleSave = async (format?: 'a4' | 'thermal') => {
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    setSaving(true);
    const totals = calculateTotals();
    try {
      const { data } = await api.post('/sales', {
        customer_id: customerId || null,
        customer_name: customerName,
        customer_mobile: customerMobile,
        customer_address: customerAddress,
        customer_gst: customerGst,
        items: items.map(({ id, ...rest }) => rest),
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        taxable_amount: totals.taxableAmount,
        gst_amount: totals.gstAmount,
        grand_total: totals.grandTotal,
        round_off: totals.roundOff,
        discount_type: discountType,
        discount_value: discountValue,
        payment_mode: paymentMode,
        notes,
      });
      toast.success(`Bill ${data.bill_number} saved!`, {
        duration: 5000,
        action: {
          label: 'View Bills',
          onClick: () => navigate('/reports'),
        },
      });
      if (format) {
        window.open(`/receipt/${data.id}?format=${format}`, '_blank');
      }
      resetBill();
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const resetBill = () => {
    setItems([]);
    setCustomerId('');
    setCustomerName('Walk-In Customer');
    setCustomerMobile('');
    setCustomerAddress('');
    setCustomerGst('');
    setDiscountValue(0);
    setDiscountType('percentage');
    setPaymentMode('cash');
    setNotes('');
  };

  const addNewCustomer = async () => {
    try {
      const { data } = await api.post('/customers', newCustomer);
      setCustomerId(data.id);
      setCustomerName(data.customer_name);
      setCustomerMobile(data.mobile || '');
      setCustomerAddress(data.address || '');
      setCustomerGst(data.gst_number || '');
      setShowCustomerModal(false);
      setNewCustomer({ customer_name: '', mobile: '', address: '', gst_number: '' });
      toast.success('Customer added');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.customer_name);
    setCustomerMobile(c.mobile || '');
    setCustomerAddress(c.address || '');
    setCustomerGst(c.gst_number || '');
    setCustomerSearch('');
  };

  const totals = calculateTotals();

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Bill</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            {' | '}
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            {' | User: '}{user?.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={resetBill}>
            <RotateCcw className="w-3.5 h-3.5" /> New Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          {/* Customer Section */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Customer Details</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      clearTimeout(productSearchTimer.current);
                      productSearchTimer.current = setTimeout(() => {
                        api.get(`/customers?search=${e.target.value}&limit=10`).then(({ data }) => setCustomers(data.customers));
                      }, 300);
                    }}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
                  />
                </div>
                <button type="button" onClick={() => setShowCustomerModal(true)} className="btn-ghost p-1.5">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-4 gap-3">
                <Input label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <Input label="Mobile" value={customerMobile} onChange={(e) => setCustomerMobile(e.target.value)} />
                <Input label="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                <Input label="GST No" value={customerGst} onChange={(e) => setCustomerGst(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Products</h3>
              <div className="relative">
                <input
                  ref={productSearchRef}
                  type="text"
                  placeholder="Search product by name or barcode... (F2)"
                  value={productSearch}
                  onChange={(e) => searchProducts(e.target.value)}
                  onFocus={() => setShowProductSearch(true)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                {showProductSearch && productSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {products.filter(p => p.is_active !== false).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-medium">{p.product_name}</span>
                        <span className="text-gray-500">{(parseFloat(p.wholesale_rate) || parseFloat(p.retail_rate) || 0).toFixed(2)}</span>
                      </button>
                    ))}
                    {products.length === 0 && (
                      <div className="px-3 py-4 text-xs text-gray-400 text-center">No products found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600">Product</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-16">Unit</th>
                      <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-20">Qty</th>
                      <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-24">Rate</th>
                      <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-20">Disc %</th>
                      <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-16">GST %</th>
                      <th className="px-3 py-2.5 text-right font-medium text-gray-600 w-24">Amount</th>
                      <th className="px-3 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2">{item.unit}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-right text-xs border border-gray-200 rounded focus:outline-none focus:border-primary"
                            min="0"
                            step="0.001"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-right text-xs border border-gray-200 rounded focus:outline-none focus:border-primary"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.discount_percentage}
                            onChange={(e) => updateItem(item.id, 'discount_percentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-right text-xs border border-gray-200 rounded focus:outline-none focus:border-primary"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">{item.gst_percentage}%</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeItem(item.id)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <Plus className="w-6 h-6" />
                            <span className="text-sm">Search and add products above</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-800">Payment Mode</h3>
              </div>
              <div className="card-body">
                <div className="flex flex-wrap gap-2">
                  {['cash', 'upi', 'card', 'bank_transfer', 'credit'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
                        paymentMode === mode
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {mode.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
              </div>
              <div className="card-body">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Summary & Actions */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800">Bill Summary</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <label className="text-xs text-gray-500 mb-1 block">Discount</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                      type="button"
                      className={`px-3 py-1 text-xs rounded ${discountType === 'percentage' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                      type="button"
                      className={`px-3 py-1 text-xs rounded ${discountType === 'fixed' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Fixed
                  </button>
                </div>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Discount value"
                  min="0"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-500">-{formatCurrency(totals.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Taxable</span>
                <span className="font-medium">{formatCurrency(totals.taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST</span>
                <span className="font-medium">{formatCurrency(totals.gstAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Round Off</span>
                <span className="font-medium">{totals.roundOff.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(Math.round(totals.grandTotal + totals.roundOff))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full" size="lg" onClick={() => handleSave()} disabled={saving || items.length === 0}>
              {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Bill</>}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => handleSave('thermal')} disabled={saving || items.length === 0}>
              <Printer className="w-4 h-4" /> Save & Print
            </Button>
            <Button variant="secondary" className="w-full" onClick={resetBill}>
              <RotateCcw className="w-4 h-4" /> New Bill
            </Button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add New Customer" size="sm">
        <div className="space-y-3">
          <Input label="Customer Name" value={newCustomer.customer_name} onChange={(e) => setNewCustomer({ ...newCustomer, customer_name: e.target.value })} />
          <Input label="Mobile" value={newCustomer.mobile} onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })} />
          <Input label="Address" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
          <Input label="GST Number" value={newCustomer.gst_number} onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })} />
          <Button className="w-full" onClick={addNewCustomer}>Add Customer</Button>
        </div>
      </Modal>
    </div>
  );
}
