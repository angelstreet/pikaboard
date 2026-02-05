import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import HeaderStatsBar from './HeaderStatsBar';
import EnvToggle from './EnvToggle';
import TeamRoster from './TeamRoster';

const navItems = [
  { path: '/', label: '🏠 Dashboard', title: 'Dashboard' },
  { path: '/boards', label: '📋 Boards', title: 'Boards' },
  { path: '/agents', label: '🤖 Agents', title: 'Agents' },
  { path: '/insights', label: '📊 Insights', title: 'Insights' },
  { path: '/settings', label: '⚙️ Settings', title: 'Settings' },
];

// Build info from env vars (set at build time)
const VERSION = import.meta.env.VITE_VERSION || '0.1.0';
const BRANCH = import.meta.env.VITE_BRANCH || 'unknown';
const COMMIT = import.meta.env.VITE_COMMIT || '?';

export default function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Stats Bar */}
      <HeaderStatsBar />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">PikaBoard</h1>
            <EnvToggle />
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-pika-100 text-pika-700 dark:bg-pika-900 dark:text-pika-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Team Roster */}
        <TeamRoster
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
        PikaBoard v{VERSION} ({BRANCH}) • {COMMIT}
      </footer>
    </div>
  );
}
