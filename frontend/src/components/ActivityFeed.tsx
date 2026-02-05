import { useState, useEffect, useCallback } from 'react';
import { api, Activity } from '../api/client';

type FilterType = 'all' | 'agents' | 'tasks';

interface ActivityMetadata {
  agent_label?: string;
  status?: 'running' | 'completed' | 'failed';
  duration_sec?: number;
  tokens_total?: number;
  task_summary?: string;
  taskId?: number;
  boardId?: number;
  changes?: string[];
  run_id?: string;
  started_at?: string;
  ended_at?: string;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

function getActivityIcon(type: string, metadata?: ActivityMetadata): string {
  if (type === 'agent_activity') {
    switch (metadata?.status) {
      case 'running': return '🤖';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '🤖';
    }
  }
  
  switch (type) {
    case 'task_created': return '➕';
    case 'task_completed': return '✅';
    case 'task_updated': return '✏️';
    case 'task_deleted': return '🗑️';
    case 'task_moved': return '📦';
    default: return '📝';
  }
}

function getActivityColor(type: string, metadata?: ActivityMetadata): string {
  if (type === 'agent_activity') {
    switch (metadata?.status) {
      case 'running': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30';
      case 'completed': return 'border-l-green-500 bg-green-50 dark:bg-green-950/30';
      case 'failed': return 'border-l-red-500 bg-red-50 dark:bg-red-950/30';
      default: return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  }
  
  switch (type) {
    case 'task_created': return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/30';
    case 'task_completed': return 'border-l-green-500 bg-green-50 dark:bg-green-950/30';
    case 'task_updated': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
    case 'task_deleted': return 'border-l-red-500 bg-red-50 dark:bg-red-950/30';
    default: return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
  }
}

function ActivityItem({ 
  activity, 
  expanded, 
  onToggle 
}: { 
  activity: Activity; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const metadata = activity.metadata as ActivityMetadata | null;
  const icon = getActivityIcon(activity.type, metadata ?? undefined);
  const colorClass = getActivityColor(activity.type, metadata ?? undefined);
  const timeAgo = getTimeAgo(new Date(activity.created_at));
  
  const isAgent = activity.type === 'agent_activity';
  const isRunning = metadata?.status === 'running';
  
  return (
    <div 
      className={`border-l-4 rounded-r-lg px-3 py-2 cursor-pointer transition-all hover:shadow-sm ${colorClass}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <span className={`text-lg ${isRunning ? 'animate-pulse' : ''}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {isAgent && metadata?.agent_label && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ display: isRunning ? 'inline-block' : 'none' }}></span>
                  {metadata.agent_label}
                </span>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {activity.message}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{timeAgo}</span>
              {isAgent && metadata?.status === 'completed' && metadata.duration_sec !== undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span title="Duration">⏱️ {formatDuration(metadata.duration_sec)}</span>
                  {metadata.tokens_total !== undefined && metadata.tokens_total > 0 && (
                    <span title="Tokens used">🎟️ {formatTokens(metadata.tokens_total)}</span>
                  )}
                </div>
              )}
              {isAgent && isRunning && metadata?.duration_sec !== undefined && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  ⏱️ {formatDuration(metadata.duration_sec)}...
                </span>
              )}
            </div>
          </div>
          
          {/* Expanded details */}
          {expanded && metadata && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1">
              {isAgent && metadata.task_summary && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Task:</span> {metadata.task_summary}
                </p>
              )}
              {metadata.taskId && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Task ID:</span> #{metadata.taskId}
                </p>
              )}
              {metadata.changes && metadata.changes.length > 0 && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Changed:</span> {metadata.changes.join(', ')}
                </p>
              )}
              {isAgent && metadata.started_at && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Started:</span>{' '}
                  {new Date(metadata.started_at).toLocaleString()}
                </p>
              )}
              {isAgent && metadata.ended_at && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Ended:</span>{' '}
                  {new Date(metadata.ended_at).toLocaleString()}
                </p>
              )}
              {isAgent && metadata.run_id && (
                <p className="text-gray-500 dark:text-gray-500 font-mono text-[10px]">
                  Run: {metadata.run_id.slice(0, 8)}...
                </p>
              )}
            </div>
          )}
        </div>
        <span className="text-gray-400 dark:text-gray-600 text-xs mt-1">
          {expanded ? '▼' : '▶'}
        </span>
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const [allActivity, setAllActivity] = useState<Activity[]>([]); // Full dataset for counts
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadActivity = useCallback(async () => {
    try {
      // Always fetch all activity types to maintain consistent counts
      const data = await api.getActivity({ limit: 100 });
      setAllActivity(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadActivity();
  }, [loadActivity]);

  // Filter the displayed activity based on selected filter
  const activity = allActivity.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'agents') return a.type === 'agent_activity';
    if (filter === 'tasks') return a.type.startsWith('task_');
    return true;
  }).slice(0, 20);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActivity();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadActivity]);

  const handleToggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filterButtons: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'agents', label: 'Agents', icon: '🤖' },
    { key: 'tasks', label: 'Tasks', icon: '✅' },
  ];

  // Count by type for badges (from full dataset, not filtered)
  const agentCount = allActivity.filter(a => a.type === 'agent_activity').length;
  const taskCount = allActivity.filter(a => a.type.startsWith('task_')).length;
  const runningCount = allActivity.filter(a => {
    const meta = a.metadata as ActivityMetadata | null;
    return a.type === 'agent_activity' && meta?.status === 'running';
  }).length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">📜 Activity Feed</h3>
          {runningCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full animate-pulse">
              {runningCount} running
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400" title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}>
          Auto-refresh: 30s
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {filterButtons.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
              filter === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span className="text-[10px] opacity-70">
              ({key === 'all' ? allActivity.length : key === 'agents' ? agentCount : taskCount})
            </span>
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {loading && activity.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Loading...
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 dark:text-red-400">
            <p className="text-4xl mb-2">⚠️</p>
            <p>{error}</p>
            <button
              onClick={loadActivity}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : activity.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-2">📭</p>
            <p>No {filter === 'all' ? '' : filter} activity yet</p>
          </div>
        ) : (
          activity.map((item) => (
            <ActivityItem 
              key={item.id} 
              activity={item} 
              expanded={expandedId === item.id}
              onToggle={() => handleToggleExpand(item.id)}
            />
          ))
        )}
      </div>
      
      {/* Footer */}
      {activity.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Showing {activity.length} entries</span>
          <button
            onClick={loadActivity}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            disabled={loading}
          >
            {loading ? <span className="animate-spin">⏳</span> : '🔄'} Refresh
          </button>
        </div>
      )}
    </div>
  );
}
