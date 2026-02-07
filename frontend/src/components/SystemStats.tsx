import { useState, useEffect } from 'react';
import { api, SystemHealth } from '../api/client';

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.join(' ') || '< 1m';
}

interface ProgressBarProps {
  value: number;
  label: string;
  subLabel?: string;
}

function ProgressBar({ value, label, subLabel }: ProgressBarProps) {
  const isAlert = value > 80;
  const isWarning = value > 60 && value <= 80;

  const barColor = isAlert
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-green-500';

  const textColor = isAlert
    ? 'text-red-400'
    : isWarning
      ? 'text-yellow-400'
      : 'text-green-400';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className={`font-mono font-semibold ${textColor}`}>
          {value}%
          {isAlert && <span className="ml-1 animate-pulse">⚠️</span>}
        </span>
      </div>
      {subLabel && (
        <div className="text-xs text-gray-500 dark:text-gray-400">{subLabel}</div>
      )}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out ${isAlert ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function SystemStats() {
  const cachedHealth = api.getCached<SystemHealth>('/system/health');
  const [data, setData] = useState<SystemHealth | null>(cachedHealth);
  const [loading, setLoading] = useState(!cachedHealth);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await api.getSystemHealth();
        setData(stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load system stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Poll every 5s for more responsive alerts
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-red-500">
          <span>⚠️</span>
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasAlert = data.status === 'warning' || data.status === 'critical';
  const statusColor = data.status === 'critical' ? 'text-red-500' : data.status === 'warning' ? 'text-yellow-500' : 'text-green-500';
  const ringColor = data.status === 'critical' ? 'ring-2 ring-red-500 ring-opacity-50' : data.status === 'warning' ? 'ring-2 ring-yellow-500 ring-opacity-50' : '';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow transition-all ${ringColor}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🖥️</span>
          <div className="text-left">
            <div className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              System Monitor
              {hasAlert && <span className={`${statusColor} animate-pulse text-sm`}>●</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {data.hostname} • up {formatUptime(data.uptime)}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                data.status === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                data.status === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {data.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <span className={`font-mono ${data.cpu.usagePercent > 80 ? 'text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
              CPU {data.cpu.usagePercent}%
            </span>
            <span className={`font-mono ${data.memory.usagePercent > 80 ? 'text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
              RAM {data.memory.usagePercent}%
            </span>
            <span className="font-mono text-gray-500 dark:text-gray-400 text-xs">
              Load: {data.cpu.loadAvg[0].toFixed(2)} / {data.cpu.loadAvg[1].toFixed(2)}
            </span>
          </div>
          <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
          {/* Alerts */}
          {data.alerts && data.alerts.length > 0 && (
            <div className={`p-3 rounded-lg ${data.status === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
              <div className={`font-medium mb-2 flex items-center gap-2 ${data.status === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                <span>⚠️</span>
                <span>Resource Alerts</span>
              </div>
              <ul className="space-y-1">
                {data.alerts.map((alert, idx) => (
                  <li key={idx} className={`text-sm ${data.status === 'critical' ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'} flex items-start gap-2`}>
                    <span className="mt-1">•</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CPU & Memory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <ProgressBar
                value={data.cpu.usagePercent}
                label="CPU"
                subLabel={`${data.cpu.cores} cores • Load: ${data.cpu.loadAvg.map(l => l.toFixed(2)).join(', ')}`}
              />
            </div>
            <div className="space-y-2">
              <ProgressBar
                value={data.memory.usagePercent}
                label="Memory"
                subLabel={`${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)} (${formatBytes(data.memory.available)} available)`}
              />
            </div>
          </div>

          {/* Disk Usage */}
          {data.disk.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Disk Usage</div>
              <div className="grid grid-cols-1 gap-3">
                {data.disk.map((disk) => (
                  <ProgressBar
                    key={disk.mountpoint}
                    value={disk.usePercent}
                    label={disk.mountpoint}
                    subLabel={`${disk.used} / ${disk.size} (${disk.available} free)`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-400 text-right">
            {data.platform} • Updated {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
