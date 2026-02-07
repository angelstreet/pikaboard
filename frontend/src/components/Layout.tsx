import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import HeaderStatsBar from './HeaderStatsBar';
import EnvToggle from './EnvToggle';
import TeamRoster from './TeamRoster';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import QuoteWidget from './QuoteWidget';
import { api } from '../api/client';
import { useTaskNotifications } from '../hooks/useTaskNotifications';

// Primary nav items (always visible)
const primaryNavItems = [
  { path: '/', label: '🏠 Dashboard', title: 'Dashboard' },
  { path: '/inbox', label: '📥 Inbox', title: 'Inbox', hasBadge: true },
  { path: '/boards', label: '📋 Boards', title: 'Boards' },
  { path: '/goals', label: '🎯 Goals', title: 'Goals' },
  { path: '/reminders', label: '🔔 Reminders', title: 'Reminders' },
  { path: '/agents', label: '🤖 Agents', title: 'Agents' },
  { path: '/chat', label: '💬 Chat', title: 'Chat' },
];

// Secondary nav items (in "More" dropdown)
const moreNavItems = [
  { path: '/files', label: '📁 Files', title: 'Files' },
  { path: '/library', label: '📚 Library', title: 'Library' },
  { path: '/insights', label: '📊 Insights', title: 'Insights' },
  { path: '/usage', label: '💳 Usage', title: 'Usage' },
  { path: '/settings', label: '⚙️ Settings', title: 'Settings' },
];

// Combined for mobile nav and other uses
const navItems = [...primaryNavItems, ...moreNavItems];

// Build info from env vars (set at build time)
const VERSION = import.meta.env.VITE_VERSION || '0.1.0';
const BRANCH = import.meta.env.VITE_BRANCH || 'unknown';
const COMMIT = import.meta.env.VITE_COMMIT || '?';

export default function Layout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Enable task completion notifications
  useTaskNotifications();

  // Fetch inbox count for badge
  useEffect(() => {
    const fetchInboxCount = async () => {
      try {
        const inboxTasks = await api.getTasks({ status: 'inbox' });
        const actionable = inboxTasks.filter((t: { name: string }) => {
          const upper = t.name.toUpperCase();
          return upper.startsWith('[APPROVAL]') || upper.startsWith('[QUESTION]') || upper.startsWith('[BLOCKER]');
        });
        setInboxCount(actionable.length);
      } catch {
        // Silently fail - badge just won't show
      }
    };
    fetchInboxCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchInboxCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Stats Bar */}
      <div className="hidden lg:block">
        <HeaderStatsBar />
      </div>

      {/* Header */}
      <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">PikaBoard</h1>
            <EnvToggle />
          </div>
          <nav className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
            {/* Primary nav items */}
            {primaryNavItems.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative whitespace-nowrap ${
                  location.pathname === item.path
                    ? 'bg-pika-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white'
                } ${index > 0 ? 'ml-1' : ''}`}
              >
                {item.label}
                {item.hasBadge && inboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {inboxCount > 9 ? '9+' : inboxCount}
                  </span>
                )}
              </Link>
            ))}
            
            {/* More dropdown */}
            <div className="relative group ml-1">
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  moreNavItems.some(item => location.pathname === item.path)
                    ? 'bg-pika-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white'
                }`}
                title="More"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {moreNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      location.pathname === item.path
                        ? 'bg-pika-50 text-pika-700 dark:bg-pika-900/50 dark:text-pika-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">PikaBoard</h1>
          </div>
          <div className="flex items-center gap-2">
            <EnvToggle />
            <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Team Roster */}
        <div className="hidden lg:block">
          <TeamRoster
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 overflow-y-auto pb-16 lg:pb-4">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer - Hidden on mobile and tablet */}
      <footer className="hidden xl:block bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
        PikaBoard v{VERSION} ({BRANCH}) • {COMMIT}
      </footer>
      <MobileNav onMenuClick={() => setDrawerOpen(true)} />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <QuoteWidget interval={60000} />
    </div>
  );
}
