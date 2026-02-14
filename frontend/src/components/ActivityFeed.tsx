import { useState, useEffect, useCallback } from 'react';
import { api, Activity } from '../api/client';

type FilterType = 'all' | 'agents' | 'tasks';

interface ActivityMetadata {
  agent_label?: string;
  session_key?: string;
  status?: 'running' | 'completed' | 'failed' | string;
  duration_sec?: number;
  tokens_total?: number;
  task_summary?: string;
  taskId?: number;
  task_id?: number | null;
  boardId?: number;
  changes?: string[];
  run_id?: string;
  started_at?: string;
  ended_at?: string;
  actor?: string;
  assignee?: string;
  task_status?: string;
}

// Agent emoji mapping
const AGENT_EMOJIS: Record<string, string> = {
  pika: '⚡',
  bulbi: '🌱',
  tortoise: '🐢',
  sala: '🦎',
  evoli: '🦊',
  psykokwak: '🦆',
  mew: '✨',
  porygon: '🔷',
  lanturn: '🔦',
  'pika-ops': '🧬',
};

// Extract agent name from session_key (e.g., "agent:psykokwak:subagent:uuid" -> "psykokwak")
// Falls back to agent_label split on "-" (e.g., "bulbi-2026-02-07-001" -> "bulbi")
function getAgentDisplayName(agentLabel?: string, sessionKey?: string): { emoji: string; name: string; full: string } {
  let agentId = '';

  // Primary: extract from session_key ("agent:NAME:subagent:...")
  if (sessionKey) {
    const parts = sessionKey.split(':');
    if (parts.length >= 2 && parts[0] === 'agent') {
      agentId = parts[1].toLowerCase();
    }
  }

  // Fallback: extract from agent_label (only if it doesn't look like a UUID)
  if (!agentId && agentLabel && !/^[0-9a-f]{8}-/.test(agentLabel)) {
    agentId = agentLabel.split('-')[0].toLowerCase();
  }

  if (!agentId) {
    return { emoji: '🤖', name: 'Agent', full: '🤖 Agent' };
  }

  // Human-friendly naming for ids that aren't meant to be shown raw.
  const displayId = agentId === 'pika-ops' ? 'mewtwo' : agentId;
  const emoji = AGENT_EMOJIS[agentId] || AGENT_EMOJIS[displayId] || '🤖';
  const name = displayId.charAt(0).toUpperCase() + displayId.slice(1);

  return { emoji, name, full: `${emoji} ${name}` };
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

// Format task reference as "#123" if available
function formatTaskRef(metadata?: ActivityMetadata): string {
  const id = metadata?.task_id ?? metadata?.taskId;
  return id ? ` (#${id})` : '';
}

// Strip redundant status prefixes from task summaries
function stripStatusPrefix(summary: string): string {
  return summary.replace(/^(Completed|Failed|Working on|Running):\s*/i, '');
}

// Strip action prefixes from task activity messages
function stripTaskPrefix(message: string): string {
  return message.replace(/^(Created|Completed|Updated|Deleted|Moved)\s+task:\s*/i, '');
}

// Build a human-readable message for agent_activity entries instead of showing raw UUIDs
// When showBadge is true, we omit the agent name and status prefix from the message to avoid duplication
function formatAgentMessage(message: string, metadata?: ActivityMetadata, showBadge: boolean = false): string {
  if (!metadata) return message;

  const agent = getAgentDisplayName(metadata.agent_label, metadata.session_key);
  const taskRef = formatTaskRef(metadata);

  if (metadata.status === 'completed') {
    // With badge: just show summary + duration/tokens (strip "Completed:" prefix)
    // Without badge: include agent name and "completed"
    if (showBadge) {
      const parts: string[] = [];
      if (metadata.task_summary) {
        const cleanSummary = stripStatusPrefix(metadata.task_summary);
        parts.push(`${cleanSummary}${taskRef}`);
      }
      if (metadata.duration_sec !== undefined) parts.push(`in ${formatDuration(metadata.duration_sec)}`);
      if (metadata.tokens_total && metadata.tokens_total > 0) parts.push(`(${formatTokens(metadata.tokens_total)} tokens)`);
      return parts.join(' ') || 'Task completed';
    } else {
      const parts = [`${agent.name} completed`];
      if (metadata.task_summary) parts[0] = `${agent.name} completed: ${metadata.task_summary}`;
      if (taskRef) parts[0] += taskRef;
      if (metadata.duration_sec !== undefined) parts.push(`in ${formatDuration(metadata.duration_sec)}`);
      if (metadata.tokens_total && metadata.tokens_total > 0) parts.push(`(${formatTokens(metadata.tokens_total)} tokens)`);
      return parts.join(' ');
    }
  }

  if (metadata.status === 'running') {
    // With badge: just show summary (strip "Working on:" prefix)
    // Without badge: include agent name and "working on"
    if (metadata.task_summary) {
      const cleanSummary = showBadge ? stripStatusPrefix(metadata.task_summary) : metadata.task_summary;
      return showBadge ? `${cleanSummary}${taskRef}` : `${agent.name} working on: ${cleanSummary}${taskRef}`;
    }
    return showBadge ? 'Running task' : `${agent.name} is running`;
  }

  if (metadata.status === 'failed') {
    // With badge: just show summary (strip "Failed:" prefix)
    // Without badge: include agent name and "failed"
    if (metadata.task_summary) {
      const cleanSummary = showBadge ? stripStatusPrefix(metadata.task_summary) : metadata.task_summary;
      return showBadge ? `${cleanSummary}${taskRef}` : `${agent.name} failed: ${cleanSummary}${taskRef}`;
    }
    return showBadge ? 'Task failed' : `${agent.name} failed`;
  }

  // Fallback: replace UUID patterns in the original message with agent name
  return message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, agent.name);
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

// Get action badge for task activities
function getTaskActionBadge(type: string): { label: string; color: string } | null {
  const badges = {
    task_created: {
      label: 'Created',
      color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
    },
    task_completed: {
      label: 'Completed',
      color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    },
    task_updated: {
      label: 'Updated',
      color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
    },
    task_deleted: {
      label: 'Deleted',
      color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
    },
    task_moved: {
      label: 'Moved',
      color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
    },
  };

  return badges[type as keyof typeof badges] || null;
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
  const isTask = activity.type.startsWith('task_');
  const isRunning = metadata?.status === 'running';

  // Get agent display for agent activities
  const agentDisplay = getAgentDisplayName(metadata?.agent_label, metadata?.session_key);

  // Get actor for task activities (who performed the action)
  const taskActor = metadata?.actor || metadata?.assignee;
  const taskActorDisplay = taskActor ? getAgentDisplayName(taskActor, undefined) : null;

  // Get action badge for task activities
  const taskActionBadge = isTask ? getTaskActionBadge(activity.type) : null;

  // Status badge styling - works for both agent and task statuses
  const getStatusBadge = (status?: string, isTaskStatus = false) => {
    if (!status) return null;

    // Agent statuses
    const agentBadges: Record<string, { label: string; color: string }> = {
      running: { label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
      completed: { label: 'Completed', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
      failed: { label: 'Failed', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
    };

    // Task statuses
    const taskBadges: Record<string, { label: string; color: string }> = {
      inbox: { label: 'Inbox', color: 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300' },
      up_next: { label: 'Up Next', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
      in_progress: { label: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' },
      in_review: { label: 'In Review', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' },
      done: { label: 'Done', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
      rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' },
    };

    const badges = isTaskStatus ? taskBadges : agentBadges;
    const badge = badges[status];
    if (!badge) return null;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div
      className={`border-l-4 rounded-r-lg px-3 py-2 cursor-pointer transition-all hover:shadow-sm ${colorClass} max-w-full overflow-hidden`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3 max-w-full">
        <span className={`text-lg flex-shrink-0 ${isRunning ? 'animate-pulse' : ''}`}>{icon}</span>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 max-w-full">
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Agent activity badges */}
              {isAgent && metadata?.agent_label && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ display: isRunning ? 'inline-block' : 'none' }}></span>
                    {agentDisplay.full}
                  </span>
                  {getStatusBadge(metadata?.status, false)}
                </div>
              )}
              {/* Task activity badges */}
              {isTask && taskActorDisplay && (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {taskActorDisplay.full}
                  </span>
                  {taskActionBadge && (
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${taskActionBadge.color}`}>
                      {taskActionBadge.label}
                    </span>
                  )}
                  {metadata?.task_status && getStatusBadge(metadata.task_status, true)}
                </div>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {isAgent
                  ? formatAgentMessage(activity.message, metadata ?? undefined, !!metadata?.agent_label)
                  : isTask
                    ? stripTaskPrefix(activity.message)
                    : activity.message}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
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
          
          {/* Expanded details - only for non-agent activities */}
          {expanded && metadata && !isAgent && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs space-y-1">
              {(metadata.task_id || metadata.taskId) && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Task:</span> #{metadata.task_id ?? metadata.taskId}
                </p>
              )}
              {metadata.changes && metadata.changes.length > 0 && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Changed:</span> {metadata.changes.join(', ')}
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
  const cachedActivity = api.getCached<{ activity: Activity[] }>('/activity?limit=100');
  const [allActivity, setAllActivity] = useState<Activity[]>(cachedActivity?.activity ?? []);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(!cachedActivity);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadActivity = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      // Always fetch all activity types to maintain consistent counts
      const data = await api.getActivity({ limit: 100 });
      // Smooth update without unmounting - only update if data actually changed
      setAllActivity(prev => {
        const prevIds = prev.map(a => a.id).join(',');
        const newIds = data.map(a => a.id).join(',');
        return prevIds === newIds ? prev : data;
      });
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadActivity(true);
  }, [loadActivity]);

  // Filter the displayed activity based on selected filter
  const activity = allActivity.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'agents') return a.type === 'agent_activity';
    if (filter === 'tasks') return a.type.startsWith('task_');
    return true;
  }).slice(0, 20);

  // Auto-refresh every 10 seconds (pass false to not show loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      loadActivity(false);
    }, 10000);

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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 w-full max-w-full overflow-hidden">
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
          Auto-refresh: 10s
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
      <div className="space-y-2 max-h-[400px] overflow-y-auto max-w-full">
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
              onClick={() => loadActivity(true)}
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
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span>Showing {activity.length} entries</span>
        </div>
      )}
    </div>
  );
}
