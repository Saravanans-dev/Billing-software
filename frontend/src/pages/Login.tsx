import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Store, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { BACKEND_URL } from '../services/api';
import toast from 'react-hot-toast';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login successful');
      navigate('/billing');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            {!logoError ? (
              <img
                src={`${BACKEND_URL}/uploads/logo.jpeg`}
                alt="Logo"
                className="w-20 h-20 object-contain mx-auto mb-4"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                <Store className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">Student Xerox</h1>
            <p className="text-sm text-gray-500 mt-1">Billing Software</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-xs text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-xs text-primary hover:underline">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center mt-6">
            &copy; {new Date().getFullYear()} Student Xerox
          </p>
        </div>
      </div>
    </div>
  );
}
