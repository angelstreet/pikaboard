import { useState, useEffect } from 'react';
import { api, Task, UsageSummary, InsightsData, SessionContextInfo } from '../api/client';
import ThemeToggle from './ThemeToggle';

type ConnectionStatus = 'connected' | 'disconnected' | 'loading';
type TimePeriod = 'today' | 'alltime';

// Format currency for display
function formatCurrencyCompact(amount: number): string {
  if (amount >= 100) {
    return `$${amount.toFixed(0)}`;
  } else if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  } else if (amount >= 0.01) {
    return `$${amount.toFixed(3)}`;
  }
  return amount > 0 ? `<$0.01` : '$0';
}

// Format token count to k format (e.g. 45000 -> 45k)
function formatTokensK(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}k`;
  }
  return count.toString();
}

export default function HeaderStatsBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskCounts, setTaskCounts] = useState<{ inbox: number; active: number; done: number; total: number }>({
    inbox: 0,
    active: 0,
    done: 0,
    total: 0,
  });
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('today');
  const [contextTokens, setContextTokens] = useState({ current: 45000, total: 200000 });
  const [sessionContext, setSessionContext] = useState<SessionContextInfo | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Poll tasks every 30 seconds
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasks: Task[] = await api.getTasks();
        const inbox = tasks.filter((t) => t.status === 'inbox').length;
        const active = tasks.filter((t) => ['up_next', 'in_progress', 'in_review'].includes(t.status)).length;
        const done = tasks.filter((t) => t.status === 'done').length;
        setTaskCounts({ inbox, active, done, total: tasks.length });
        setStatus('connected');
      } catch {
        setStatus('disconnected');
      }
    };

    fetchTasks();
    const poller = setInterval(fetchTasks, 30000);
    return () => clearInterval(poller);
  }, []);

  // Poll insights every 60 seconds (for completed today/week/month)
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const data = await api.getInsights();
        setInsights(data);
      } catch (e) {
        console.error('Failed to fetch insights:', e);
      }
    };

    fetchInsights();
    const insightsPoller = setInterval(fetchInsights, 60000);
    return () => clearInterval(insightsPoller);
  }, []);

  // Poll usage every 60 seconds
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await api.getUsageSummary();
        setUsage(data);
      } catch (e) {
        console.error('Failed to fetch usage:', e);
      }
    };

    fetchUsage();
    const usagePoller = setInterval(fetchUsage, 60000);
    return () => clearInterval(usagePoller);
  }, []);

  // Poll session context every 30 seconds
  useEffect(() => {
    const fetchSessionContext = async () => {
      try {
        const data = await api.getSessionContext();
        setSessionContext(data);
      } catch (e) {
        console.error('Failed to fetch session context:', e);
      }
    };

    fetchSessionContext();
    const contextPoller = setInterval(fetchSessionContext, 30000);
    return () => clearInterval(contextPoller);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const statusConfig = {
    connected: { color: 'bg-green-500', text: 'Online', pulse: false },
    disconnected: { color: 'bg-red-500', text: 'Offline', pulse: false },
    loading: { color: 'bg-yellow-500', text: 'Connecting...', pulse: true },
  };

  const { color, text, pulse } = statusConfig[status];

  // Get values based on time period
  const currentUsage = timePeriod === 'alltime' && usage ? usage.monthly : (usage?.daily || { anthropic: 0, kimi: 0, total: 0 });
  const completedCount = timePeriod === 'today' 
    ? (insights?.summary.completedToday ?? 0)
    : (insights?.summary.totalCompleted ?? taskCounts.done);

  return (
    <div className="bg-gray-800 text-gray-200 px-4 py-1.5 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Date & Time - Compact on mobile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-gray-400 hidden sm:inline">📅</span>
          <span className="font-medium text-xs sm:text-sm">{formatDate(currentTime)}</span>
          <span className="text-gray-500 hidden sm:inline">|</span>
          <span className="font-mono text-xs sm:text-sm">{formatTime(currentTime)}</span>
        </div>

        {/* Time Period Toggle & Stats - Hidden on mobile, compact on tablet */}
        <div className="hidden sm:flex items-center gap-2 md:gap-4">
          {/* Toggle Button */}
          <div className="flex items-center bg-gray-700 rounded-md p-0.5">
            <button
              onClick={() => setTimePeriod('today')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                timePeriod === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimePeriod('alltime')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                timePeriod === 'alltime'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All-time
            </button>
          </div>

          <span className="text-gray-600 hidden md:inline">|</span>

          {/* Stats - Simplified on tablet */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1" title="Completed">
              <span className="text-gray-400 text-xs">✅</span>
              <span className="hidden md:inline text-xs">
                Done: <span className="font-semibold text-green-400">{completedCount}</span>
              </span>
              <span className="md:hidden font-semibold text-green-400 text-xs">{completedCount}</span>
            </div>
            <div className="flex items-center gap-1" title="Active">
              <span className="text-gray-400 text-xs">⚡</span>
              <span className="hidden md:inline text-xs">
                Active: <span className="font-semibold text-blue-400">{taskCounts.active}</span>
              </span>
              <span className="md:hidden font-semibold text-blue-400 text-xs">{taskCounts.active}</span>
            </div>
            <div className="flex items-center gap-1" title="Inbox">
              <span className="text-gray-400 text-xs">📥</span>
              <span className="hidden md:inline text-xs">
                Inbox: <span className="font-semibold text-yellow-400">{taskCounts.inbox}</span>
              </span>
              <span className="md:hidden font-semibold text-yellow-400 text-xs">{taskCounts.inbox}</span>
            </div>
            <div className="flex items-center gap-1" title="Context Tokens">
              <span className="text-gray-400 text-xs">🧮</span>
              <span className="hidden md:inline text-xs">
                Context: <span className="font-semibold text-blue-400">{formatTokensK(contextTokens.current)}/{formatTokensK(contextTokens.total)}</span>
              </span>
              <span className="md:hidden font-semibold text-blue-400 text-xs">{formatTokensK(contextTokens.current)}/{formatTokensK(contextTokens.total)}</span>
            </div>
          </div>
          
          <span className="text-gray-600 hidden lg:inline">|</span>

          {/* Cost - Hidden on tablet */}
          <div className="hidden lg:flex items-center gap-2" title={timePeriod === 'today' ? 'Today\'s cost' : 'Monthly cost'}>
            <span className="text-gray-400">💰</span>
            <span className="font-semibold text-green-400">
              {formatCurrencyCompact(currentUsage.total)}
            </span>
          </div>

          <span className="text-gray-600 hidden xl:inline">|</span>

          {/* Session Context Tokens - Hidden on smaller screens */}
          <div 
            className="hidden xl:flex items-center gap-1" 
            title={sessionContext ? `Context: ${formatTokensK(sessionContext.currentTokens)} / ${formatTokensK(sessionContext.contextTokens)} (${sessionContext.percentUsed}%)` : 'Session context'}
          >
            <span className="text-gray-400">🧮</span>
            {sessionContext ? (
              <span className={`font-semibold ${sessionContext.percentUsed > 90 ? 'text-red-400' : sessionContext.percentUsed > 75 ? 'text-yellow-400' : 'text-blue-400'}`}>
                {formatTokensK(sessionContext.currentTokens)}/{formatTokensK(sessionContext.contextTokens)}
              </span>
            ) : (
              <span className="text-gray-500 text-xs">--</span>
            )}
          </div>
        </div>

        {/* Status Indicator & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/openclaw/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="Open OpenClaw Gateway"
          >
            <div className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-gray-400 hidden sm:inline">{text}</span>
          </a>
          <button
            onClick={async () => {
              try {
                await fetch('/openclaw/api/restart', { method: 'POST' });
              } catch (e) {
                console.error('Restart failed', e);
              }
            }}
            className="p-1 text-gray-400 hover:text-orange-500 transition-colors hidden sm:block"
            title="Restart OpenClaw Gateway"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
