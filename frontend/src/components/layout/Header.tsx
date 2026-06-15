import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-60 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Welcome, {user?.full_name || 'User'}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs font-medium text-gray-700">
            {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </p>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-700 capitalize">{user?.role || 'User'}</span>
        </div>
      </div>
    </header>
  );
}
