import { useState, useEffect } from 'react';
import { api, Task, UsageSummary } from '../api/client';
import ThemeToggle from './ThemeToggle';

type ConnectionStatus = 'connected' | 'disconnected' | 'loading';

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

export default function HeaderStatsBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskCounts, setTaskCounts] = useState<{ inbox: number; active: number; total: number }>({
    inbox: 0,
    active: 0,
    total: 0,
  });
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [showMonthly, setShowMonthly] = useState(false);

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
        setTaskCounts({ inbox, active, total: tasks.length });
        setStatus('connected');
      } catch {
        setStatus('disconnected');
      }
    };

    fetchTasks();
    const poller = setInterval(fetchTasks, 30000);
    return () => clearInterval(poller);
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

  // Get current usage display values
  const currentUsage = showMonthly && usage ? usage.monthly : (usage?.daily || { anthropic: 0, kimi: 0, total: 0 });
  const periodLabel = showMonthly ? 'Month' : 'Today';

  return (
    <div className="bg-gray-800 text-gray-200 px-4 py-1.5 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Date & Time */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400">📅</span>
          <span className="font-medium">{formatDate(currentTime)}</span>
          <span className="text-gray-500">|</span>
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>

        {/* Task Stats & Usage */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📥</span>
            <span>
              Inbox: <span className="font-semibold text-yellow-400">{taskCounts.inbox}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">⚡</span>
            <span>
              Active: <span className="font-semibold text-blue-400">{taskCounts.active}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">📊</span>
            <span>
              Total: <span className="font-semibold text-gray-300">{taskCounts.total}</span>
            </span>
          </div>
          
          {/* Divider */}
          <span className="text-gray-600">|</span>
          
          {/* Anthropic Usage */}
          <button
            onClick={() => setShowMonthly(!showMonthly)}
            className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
            title={`Click to toggle ${showMonthly ? 'daily' : 'monthly'} view`}
          >
            <span className="text-gray-400">🤖</span>
            <span className="text-gray-400">{periodLabel}:</span>
            <span className="font-semibold text-orange-400">
              {formatCurrencyCompact(currentUsage.anthropic)}
            </span>
            <span className="text-gray-500 text-xs">(Anthropic)</span>
          </button>
          
          {/* Total Usage (including Kimi) */}
          <span className="text-gray-500">|</span>
          <span className="flex items-center gap-1">
            <span className="text-gray-400 text-xs">Total:</span>
            <span className="font-semibold text-green-400">
              {formatCurrencyCompact(currentUsage.total)}
            </span>
          </span>
        </div>

        {/* Status Indicator & Theme Toggle */}
        <div className="flex items-center gap-4">
          <a
            href="/openclaw/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="Open OpenClaw Gateway"
          >
            <div className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-gray-400">{text}</span>
          </a>
          <button
            onClick={async () => {
              try {
                await fetch('/openclaw/api/restart', { method: 'POST' });
              } catch (e) {
                console.error('Restart failed', e);
              }
            }}
            className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
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
