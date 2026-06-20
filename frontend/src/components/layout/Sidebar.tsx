import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, IndianRupee, Package, ShoppingCart, Warehouse,
  Users, BarChart3, Settings, LogOut, Store, AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import api, { BACKEND_URL } from '../../services/api';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/billing', label: 'Billing', icon: IndianRupee },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { path: '/stock', label: 'Stock', icon: Warehouse },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/suppliers', label: 'Suppliers', icon: Store },
  { path: '/pending-payments', label: 'Pending Payments', icon: AlertTriangle },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    api.get('/settings/company').then(({ data }) => {
      if (data.logo_url) setLogoUrl(`${BACKEND_URL}${data.logo_url}`);
    }).catch(() => {});
  }, []);

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-9 h-9 object-contain rounded" crossOrigin="anonymous" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Student Xerox</h1>
            <p className="text-[10px] text-gray-500">Billing Software</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : 'text-gray-600'}`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-gray-100">
        <button onClick={logout} className="sidebar-item text-gray-600 w-full">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
