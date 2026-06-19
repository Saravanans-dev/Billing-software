import { useState, useEffect, useRef } from 'react';
import { Save, Building2, Printer, Shield, Database, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { BACKEND_URL } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { User, CompanySettings } from '../types';

export function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const [company, setCompany] = useState<CompanySettings>({} as CompanySettings);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings/company');
      setCompany(data);
      const { data: usersData } = await api.get('/settings/users');
      setUsers(usersData);
    } catch { toast.error('Failed to load settings'); }
  };

  const saveCompany = async () => {
    setLoading(true);
    try {
      await api.put('/settings/company', company);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'invoice', label: 'Invoice', icon: Printer },
    { id: 'users', label: 'Users', icon: Shield },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  return (
    <div className="page-container">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Settings</h1>

      <div className="flex gap-5">
        <div className="w-48 shrink-0">
          <div className="space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                  activeTab === t.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-800">
                {tabs.find(t => t.id === activeTab)?.label} Settings
              </h3>
            </div>
            <div className="card-body">
              {activeTab === 'company' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        {company.logo_url ? (
                          <img src={`${BACKEND_URL}${company.logo_url}`} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <label className="btn-ghost text-xs mt-2 w-full flex items-center justify-center gap-1 cursor-pointer">
                        <Upload className="w-3 h-3" /> Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('logo', file);
                          try {
                            const { data } = await api.post('/upload/logo', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            setCompany({ ...company, logo_url: data.logo_url });
                            toast.success('Logo uploaded');
                          } catch { toast.error('Upload failed'); }
                        }} />
                      </label>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Company Name" value={company.company_name || ''} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} />
                        <Input label="Mobile" value={company.mobile || ''} onChange={(e) => setCompany({ ...company, mobile: e.target.value })} />
                        <Input label="Email" value={company.email || ''} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                        <Input label="GST Number" value={company.gst_number || ''} onChange={(e) => setCompany({ ...company, gst_number: e.target.value })} />
                        <Input label="PAN Number" value={company.pan_number || ''} onChange={(e) => setCompany({ ...company, pan_number: e.target.value })} />
                      </div>
                      <Input label="Address" value={company.address || ''} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={saveCompany} loading={loading}><Save className="w-4 h-4" /> Save</Button>
                  </div>
                </div>
              )}

              {activeTab === 'invoice' && (
                <div className="space-y-4 max-w-2xl">
                  <Input label="Thermal Printer Name" value={company.thermal_printer || ''} onChange={(e) => setCompany({ ...company, thermal_printer: e.target.value })} />
                  <Input label="A5 Printer Name" value={company.a5_printer || ''} onChange={(e) => setCompany({ ...company, a5_printer: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={company.auto_backup_enabled || false} onChange={(e) => setCompany({ ...company, auto_backup_enabled: e.target.checked })} className="w-4 h-4" />
                    <label className="text-sm">Enable Auto Backup</label>
                  </div>
                  <Button onClick={saveCompany} loading={loading}><Save className="w-4 h-4" /> Save</Button>
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Username</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Full Name</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Role</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100">
                          <td className="px-4 py-2.5 font-medium">{u.username}</td>
                          <td className="px-4 py-2.5">{u.full_name}</td>
                          <td className="px-4 py-2.5 capitalize">{u.role}</td>
                          <td className="px-4 py-2.5"><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td className="px-4 py-2.5 text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'backup' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Database backup management</p>
                  <Button variant="secondary">Create Backup Now</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
