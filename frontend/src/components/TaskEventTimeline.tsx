import { useState, useEffect } from 'react';
import { TaskEvent, api } from '../api/client';

interface TaskEventTimelineProps {
  taskId: number;
}

const actionIcons: Record<string, string> = {
  created: '📝',
  status_changed: '🔄',
  assigned: '👤',
  completed: '✅',
  solved: '🔧',
  rejected: '❌',
  rated: '⭐',
  archived: '📦',
  restored: '♻️',
  deleted: '🗑️',
  // Workflow-specific events
  dispatched: '🚀',
  qa_started: '🔍',
  qa_passed: '✔️',
  qa_failed: '✖️',
  fix_started: '🔨',
  fix_completed: '🩹',
  review_requested: '👀',
  review_approved: '👍',
  review_rejected: '👎',
  deployed: '📤',
};

const actionLabels: Record<string, string> = {
  created: 'Created',
  status_changed: 'Status Changed',
  assigned: 'Assigned',
  completed: 'Completed',
  solved: 'Solved',
  rejected: 'Rejected',
  rated: 'Rated',
  archived: 'Archived',
  restored: 'Restored',
  deleted: 'Deleted',
  // Workflow-specific labels
  dispatched: 'Dispatched to Worker',
  qa_started: 'QA Review Started',
  qa_passed: 'QA Passed',
  qa_failed: 'QA Failed',
  fix_started: 'Fix Started',
  fix_completed: 'Fix Completed',
  review_requested: 'Review Requested',
  review_approved: 'Review Approved',
  review_rejected: 'Review Rejected',
  deployed: 'Deployed',
};

// Status transition mapping for workflow visualization
const workflowStages: Record<string, { label: string; color: string; icon: string }> = {
  inbox: { label: 'Inbox', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: '📥' },
  up_next: { label: 'Up Next', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '⏳' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '⚡' },
  testing: { label: 'Testing', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '🧪' },
  in_review: { label: 'In Review', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: '👀' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' },
  solved: { label: 'Solved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '🔧' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '❌' },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTimestamp(timestamp);
}

export function TaskEventTimeline({ taskId }: TaskEventTimelineProps) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true);
        const data = await api.getTaskEvents(taskId);
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [taskId]);

  // Extract unique status transitions for workflow visualization
  const statusTransitions = events
    .filter(e => e.action === 'status_changed' && e.details?.from && e.details?.to)
    .map(e => ({
      from: String(e.details!.from),
      to: String(e.details!.to),
      timestamp: e.timestamp,
      actor: e.actor
    }))
    .reverse(); // Chronological order

  const handleCopy = () => {
    const text = events.map(e => {
      const details = e.details ? JSON.stringify(e.details) : '';
      return `[${formatTimestamp(e.timestamp)}] ${actionLabels[e.action] || e.action} by ${e.actor}${details ? ` - ${details}` : ''}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-500">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">Failed to load timeline: {error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No events recorded yet.</p>
      </div>
    );
  }

  const toggleEventExpansion = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          📊 Execution Timeline ({events.length} events)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWorkflow(!showWorkflow)}
            className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
          >
            {showWorkflow ? '📈 Hide Flow' : '📈 Show Flow'}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Workflow Visualization */}
      {showWorkflow && statusTransitions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Workflow Journey</h4>
          <div className="flex flex-wrap items-center gap-1">
            {statusTransitions.map((transition, idx) => (
              <div key={idx} className="flex items-center">
                {idx === 0 && workflowStages[transition.from] && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${workflowStages[transition.from].color}`}>
                    {workflowStages[transition.from].icon} {workflowStages[transition.from].label}
                  </span>
                )}
                <svg className="w-4 h-4 mx-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {workflowStages[transition.to] ? (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${workflowStages[transition.to].color}`}>
                    {workflowStages[transition.to].icon} {workflowStages[transition.to].label}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    {transition.to}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Execution Stats */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold text-gray-900 dark:text-white">{events.filter(e => e.action === 'status_changed').length}</div>
              <div className="text-gray-500 dark:text-gray-400">Status Changes</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold text-gray-900 dark:text-white">{events.filter(e => e.action === 'assigned').length}</div>
              <div className="text-gray-500 dark:text-gray-400">Reassignments</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold text-gray-900 dark:text-white">{events.filter(e => e.action === 'rejected').length}</div>
              <div className="text-gray-500 dark:text-gray-400">Rejections</div>
            </div>
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <div className="font-bold text-gray-900 dark:text-white">
                {events.length > 0 ? Math.round((new Date().getTime() - new Date(events[events.length - 1].timestamp).getTime()) / (1000 * 60 * 60)) : 0}h
              </div>
              <div className="text-gray-500 dark:text-gray-400">Total Duration</div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

        {/* Events */}
        <div className="space-y-3">
          {events.map((event, index) => {
            const isExpanded = expandedEvents.has(event.id);
            const hasDetails = event.details && Object.keys(event.details).length > 0;
            
            return (
              <div key={event.id} className="relative flex items-start gap-3 group">
                {/* Icon/dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm shadow-sm transition-colors ${
                  event.action === 'rejected' ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700' :
                  event.action === 'completed' || event.action === 'solved' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700' :
                  'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                }`}>
                  {actionIcons[event.action] || '•'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${
                      event.action === 'rejected' ? 'text-red-700 dark:text-red-400' :
                      event.action === 'completed' || event.action === 'solved' ? 'text-green-700 dark:text-green-400' :
                      'text-gray-900 dark:text-gray-100'
                    }`}>
                      {actionLabels[event.action] || event.action}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by <span className="font-medium">{event.actor}</span>
                    </span>
                    {hasDetails && (
                      <button
                        onClick={() => toggleEventExpansion(event.id)}
                        className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {isExpanded ? '▼ less' : '▶ more'}
                      </button>
                    )}
                  </div>

                  {/* Details */}
                  {(isExpanded || !hasDetails) && event.details && (
                    <div className="mt-1.5 text-xs">
                      {event.action === 'status_changed' && event.details.from && event.details.to && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-medium ${workflowStages[String(event.details.from)]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {workflowStages[String(event.details.from)]?.icon || '•'} {String(event.details.from)}
                          </span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <span className={`px-2 py-0.5 rounded font-medium ${workflowStages[String(event.details.to)]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {workflowStages[String(event.details.to)]?.icon || '•'} {String(event.details.to)}
                          </span>
                        </span>
                      )}
                      {event.action === 'assigned' && (
                        <span className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {event.details.from ? `👤 ${String(event.details.from)}` : '👤 unassigned'} 
                          <span className="mx-1">→</span>
                          {event.details.to ? `👤 ${String(event.details.to)}` : '👤 unassigned'}
                        </span>
                      )}
                      {event.action === 'rejected' && event.details.reason && (
                        <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400">
                          <span className="font-semibold">Rejection Reason:</span> {String(event.details.reason)}
                        </div>
                      )}
                      {event.action === 'rated' && event.details.rating && (
                        <span className="text-yellow-500 text-sm">
                          {'★'.repeat(Number(event.details.rating))}
                          {'☆'.repeat(5 - Number(event.details.rating))}
                          <span className="text-gray-400 ml-1">({Number(event.details.rating)}/5)</span>
                        </span>
                      )}
                      {event.action === 'created' && event.details.name && (
                        <span className="text-gray-500 italic">{String(event.details.name)}</span>
                      )}
                      
                      {/* Show raw details for other actions */}
                      {isExpanded && event.action !== 'status_changed' && event.action !== 'assigned' && event.action !== 'rejected' && event.action !== 'rated' && event.action !== 'created' && (
                        <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Timestamp and IDs */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span className="font-medium" title={formatTimestamp(event.timestamp)}>
                      🕐 {formatRelativeTime(event.timestamp)}
                    </span>
                    {event.sessionId && (
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded" title={`Session: ${event.sessionId}`}>
                        🔗 {event.sessionId.slice(0, 8)}...
                      </span>
                    )}
                    {event.subagentId && (
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded" title={`Subagent: ${event.subagentId}`}>
                        🤖 {event.subagentId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
