import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Wallet, Clock, History } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency } from '../lib/utils';

export function PendingPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments/pending');
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch { setPayments([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const recordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setSubmitting(true);
    try {
      await api.post('/payments', {
        customer_id: selected.id,
        amount: parseFloat(payAmount),
        payment_mode: payMode,
        notes: payNotes,
      });
      setShowModal(false);
      setSelected(null);
      setPayAmount('');
      setPayNotes('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Payment failed');
    }
    setSubmitting(false);
  };

  const loadHistory = async (customerId?: string) => {
    try {
      const params = customerId ? { customer_id: customerId } : {};
      const { data } = await api.get('/payments/history', { params });
      setHistory(data || []);
      setShowHistory(true);
    } catch { setHistory([]); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pending Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Total Outstanding: <span className="font-semibold text-red-600">{formatCurrency(total)}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { loadHistory(); setShowHistory(true); }}>
            <History className="w-3.5 h-3.5" /> Payment History
          </Button>
          <Button size="sm" onClick={load} disabled={loading}>
            <Clock className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No pending payments!</p>
              <p className="text-gray-400 text-xs mt-1">All customers have cleared their dues.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Mobile</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                    <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900">{p.customer_name}</td>
                      <td className="py-3 px-3 text-gray-500">{p.mobile || '-'}</td>
                      <td className="py-3 px-3 text-right font-semibold text-red-600">{formatCurrency(p.outstanding_amount)}</td>
                      <td className="py-3 px-3 text-right text-gray-500">{p.credit_limit > 0 ? formatCurrency(p.credit_limit) : '-'}</td>
                      <td className="py-3 px-3 text-center">
                        {p.status === 'over_limit' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Over Limit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded-full">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => { setSelected(p); setPayAmount(String(p.outstanding_amount)); setPayMode('cash'); setPayNotes(''); setShowModal(true); }}>
                            <Wallet className="w-3.5 h-3.5" /> Receive
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => loadHistory(p.id)}>
                            <History className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && selected && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5 w-96">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Record Payment</h2>
            <p className="text-xs text-gray-500 mb-4">Customer: <span className="font-medium text-gray-700">{selected.customer_name}</span></p>

            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex justify-between text-sm">
              <span className="text-gray-600">Outstanding Balance</span>
              <span className="font-bold text-red-600">{formatCurrency(selected.outstanding_amount)}</span>
            </div>

            <Input label="Payment Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={selected.outstanding_amount} />

            <div className="mt-3">
              <Select label="Payment Mode" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </Select>
            </div>

            <div className="mt-3">
              <Input label="Notes (optional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={recordPayment} disabled={submitting || !payAmount || parseFloat(payAmount) <= 0}>
                {submitting ? 'Processing...' : `Pay ${formatCurrency(parseFloat(payAmount || '0'))}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showHistory && (
        <Modal onClose={() => setShowHistory(false)}>
          <div className="p-5 w-[500px] max-h-[70vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Payment History</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No payments recorded yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase">Date</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase">Customer</th>
                    <th className="text-right py-2 px-2 text-xs text-gray-500 uppercase">Amount</th>
                    <th className="text-center py-2 px-2 text-xs text-gray-500 uppercase">Mode</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-600 text-xs">{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{h.customer_name || '-'}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-600">{formatCurrency(h.amount)}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{h.payment_mode?.toUpperCase()}</span>
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{h.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
