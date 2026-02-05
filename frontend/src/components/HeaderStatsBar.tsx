import { useState, useEffect } from 'react';
import { api, Task } from '../api/client';

type ConnectionStatus = 'connected' | 'disconnected' | 'loading';

export default function HeaderStatsBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskCounts, setTaskCounts] = useState<{ inbox: number; active: number; total: number }>({
    inbox: 0,
    active: 0,
    total: 0,
  });
  const [status, setStatus] = useState<ConnectionStatus>('loading');

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

        {/* Task Stats */}
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
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
          <span className="text-xs text-gray-400">{text}</span>
        </div>
      </div>
    </div>
  );
}
