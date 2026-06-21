import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/layout/Layout';
import { lazy, Suspense, useEffect, useCallback } from 'react';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Billing = lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Purchases = lazy(() => import('./pages/Purchases').then(m => ({ default: m.Purchases })));
const Stock = lazy(() => import('./pages/Stock').then(m => ({ default: m.Stock })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Suppliers = lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const ReceiptPrint = lazy(() => import('./pages/ReceiptPrint').then(m => ({ default: m.ReceiptPrint })));
const InvoicePage = lazy(() => import('./pages/InvoicePage').then(m => ({ default: m.InvoicePage })));
const PendingPayments = lazy(() => import('./pages/PendingPayments').then(m => ({ default: m.PendingPayments })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/billing" replace />;
  return <>{children}</>;
}

function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const navigate = useNavigate();

  const redirectFromLogin = useCallback(() => {
    if (token && location.pathname === '/login') {
      navigate('/billing', { replace: true });
    }
  }, [token, location.pathname, navigate]);

  useEffect(() => {
    redirectFromLogin();
  }, [redirectFromLogin]);

  useEffect(() => {
    if (!token) return;
    const handlePopState = () => {
      if (window.location.pathname === '/login') {
        window.history.pushState(null, '', window.location.href);
        navigate('/billing', { replace: true });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [token, navigate]);

  return null;
}

function App() {
  const verifyAuth = useAuthStore((s) => s.verifyAuth);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '13px', borderRadius: '8px' },
        }}
      />
      <AuthGuard />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50"><div className="text-gray-400 text-sm">Loading...</div></div>}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/billing" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="billing" element={<Billing />} />
            <Route path="products" element={<Products />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="stock" element={<Stock />} />
            <Route path="customers" element={<Customers />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pending-payments" element={<PendingPayments />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="receipt/:id" element={<ReceiptPrint />} />
          <Route path="invoice/:billNumber" element={<InvoicePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
