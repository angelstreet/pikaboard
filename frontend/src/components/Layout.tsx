import { Link, Outlet, useLocation } from 'react-router-dom';
import HeaderStatsBar from './HeaderStatsBar';

const navItems = [
  { path: '/', label: '📋 Dashboard', title: 'Dashboard' },
  { path: '/routines', label: '🔄 Routines', title: 'Routines' },
  { path: '/skills', label: '🧩 Skills', title: 'Skills' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Stats Bar */}
      <HeaderStatsBar />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold text-gray-900">PikaBoard</h1>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-pika-100 text-pika-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 text-center text-sm text-gray-500">
        PikaBoard v0.1.0 — OpenClaw Agent Dashboard
      </footer>
    </div>
  );
}
