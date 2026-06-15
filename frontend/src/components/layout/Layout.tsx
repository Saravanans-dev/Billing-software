import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-60 pt-14 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
