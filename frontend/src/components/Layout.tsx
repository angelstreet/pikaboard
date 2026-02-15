import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import HeaderStatsBar from './HeaderStatsBar';
import GlobalEnvToggle from './GlobalEnvToggle';
import TeamRoster from './TeamRoster';
import MobileNav from './MobileNav';
import MobileDrawer from './MobileDrawer';
import { QuoteWidget } from './QuoteWidget';
import { api, API_BASE_URL } from '../api/client';
import { useTaskNotifications } from '../hooks/useTaskNotifications';

// Mobile Health Status Component
function MobileHealthStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Use the public health endpoint for proper health check
        const res = await fetch('/health', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      } catch {
        setStatus('disconnected');
      }
      setLastCheck(new Date());
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    connected: { 
      color: 'bg-green-500', 
      pulse: 'animate-pulse bg-green-400',
      text: 'Online', 
      shortText: 'On',
      borderColor: 'border-green-200 dark:border-green-800',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    disconnected: { 
      color: 'bg-red-500', 
      pulse: '',
      text: 'Offline', 
      shortText: 'Off',
      borderColor: 'border-red-200 dark:border-red-800',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    loading: { 
      color: 'bg-yellow-500', 
      pulse: 'animate-pulse',
      text: '...', 
      shortText: '...',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
  };

  const { color, pulse, text, shortText, borderColor, bgColor } = statusConfig[status];

  return (
    <a
      href="/openclaw/"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border ${borderColor} ${bgColor} hover:opacity-90 active:opacity-75 transition-all shrink-0 shadow-sm`}
      title={`OpenClaw Gateway: ${text}${lastCheck ? ` (checked ${lastCheck.toLocaleTimeString()})` : ''}`}
    >
      <div className="relative shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        {status === 'connected' && <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${pulse}`} style={{ animationDuration: '2s' }} />}
      </div>
      <span className={`text-xs font-semibold hidden sm:inline ${status === 'disconnected' ? 'text-red-700 dark:text-red-400' : status === 'connected' ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
        {text}
      </span>
      <span className={`text-xs font-semibold sm:hidden ${status === 'disconnected' ? 'text-red-700 dark:text-red-400' : status === 'connected' ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
        {shortText}
      </span>
    </a>
  );
}

// Mobile Restart Button Component
function MobileRestartButton() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    variant: 'success' | 'error';
  }>({ title: '', message: '', variant: 'success' });

  const handleRestart = async () => {
    if (isRestarting) return;
    setShowConfirm(true);
  };

  const showAlertModal = (title: string, message: string, variant: 'success' | 'error') => {
    setAlertConfig({ title, message, variant });
    setShowAlert(true);
  };

  const confirmRestart = async () => {
    setIsRestarting(true);
    setShowConfirm(false);
    try {
      // Restart via authenticated backend endpoint
      const res = await fetch(`${API_BASE_URL}/openclaw/restart`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pikaboard_token') || ''}`,
        },
      });
      if (res.ok) {
        showAlertModal('Success', 'Restart command sent successfully. Gateway will restart shortly.', 'success');
      } else {
        throw new Error('Restart endpoint returned error');
      }
    } catch (e) {
      console.error('Restart failed', e);
      showAlertModal('Restart Failed', 'Please check gateway status or restart manually.', 'error');
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleRestart}
        disabled={isRestarting}
        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-red-500 dark:from-red-700 dark:to-red-600 border border-red-500 dark:border-red-600 rounded-lg hover:from-red-700 hover:to-red-600 dark:hover:from-red-600 dark:hover:to-red-500 active:scale-95 transition-all disabled:opacity-50 shadow-md hover:shadow-lg shrink-0 whitespace-nowrap"
        title="Restart OpenClaw Gateway"
      >
        {isRestarting ? (
          <>
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>...</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restart</span>
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Restart Gateway?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This will restart the OpenClaw gateway service.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestart}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 dark:bg-red-700 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAlert(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 sm:p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                alertConfig.variant === 'success' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <span className="text-2xl">{alertConfig.variant === 'success' ? '✅' : '❌'}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{alertConfig.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{alertConfig.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAlert(false)}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${
                  alertConfig.variant === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Primary nav items (always visible)
const primaryNavItems = [
  { path: '/', label: '🏠 Dashboard', title: 'Dashboard' },
  { path: '/inbox', label: '📥 Inbox', title: 'Inbox', hasBadge: true },
  { path: '/boards', label: '📋 Boards', title: 'Boards' },
  { path: '/goals', label: '🎯 Goals', title: 'Goals' },
  { path: '/reminders', label: '🔔 Reminders', title: 'Reminders' },
  { path: '/agents', label: '🤖 Agents', title: 'Agents' },
  { path: '/apps', label: '🚀 Apps', title: 'Apps' },
  { path: '/chat', label: '💬 Chat', title: 'Chat' },
];

// Secondary nav items (in "More" dropdown)
const moreNavItems = [
  { path: '/files', label: '📁 Files', title: 'Files' },
  { path: '/library', label: '📚 Library', title: 'Library' },
  { path: '/insights', label: '📊 Insights', title: 'Insights' },
  { path: '/usage', label: '💳 Usage', title: 'Usage' },
  { path: '/crypto', label: '💰 Crypto', title: 'Crypto' },
  { path: '/settings', label: '⚙️ Settings', title: 'Settings' },
  { path: '#logout', label: '🚪 Logout', title: 'Logout' },
];

// primaryNavItems + moreNavItems used directly in components

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

  // Fetch inbox count for badge (only actionable tasks: approvals, questions, blockers, issues)
  useEffect(() => {
    const fetchInboxCount = async () => {
      try {
        const inboxTasks = await api.getTasks({ status: 'inbox' });
        const actionable = inboxTasks.filter((t: { name: string }) => {
          const upper = t.name.toUpperCase();
          return (
            upper.startsWith('[APPROVAL]') ||
            upper.startsWith('[QUESTION]') ||
            upper.startsWith('[BLOCKER]') ||
            upper.startsWith('[ISSUE]')
          );
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
            <GlobalEnvToggle />
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
                } ${index > 0 ? 'ml-1' : ''} ${item.hasBadge ? 'pr-9' : ''}`}
              >
                {item.label}
                {item.hasBadge && inboxCount > 0 && (
                  <span className="pointer-events-none absolute top-0.5 right-1 bg-red-500 text-white text-xs font-bold min-w-5 h-5 px-1 flex items-center justify-center rounded-full leading-none">
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
                  item.path === '#logout' ? (
                    <button
                      key={item.path}
                      onClick={() => {
                        localStorage.removeItem('pikaboard_token');
                        window.location.reload();
                      }}
                      className="w-full text-left block px-4 py-2 text-sm transition-colors last:rounded-b-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`block px-4 py-2 text-sm transition-colors first:rounded-t-lg ${
                        location.pathname === item.path
                          ? 'bg-pika-50 text-pika-700 dark:bg-pika-900/50 dark:text-pika-300'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
            <span className="text-xl">⚡</span>
            <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">PikaBoard</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <MobileHealthStatus />
            <MobileRestartButton />
            <div className="hidden sm:inline">
              <GlobalEnvToggle />
            </div>
            <button onClick={() => setDrawerOpen(true)} className="p-1.5 sm:p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0">
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
      <QuoteWidget />
    </div>
  );
}
