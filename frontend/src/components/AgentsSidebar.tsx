import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface AgentInfo {
  label: string;
  status: 'running' | 'completed' | 'failed';
  taskSummary: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  tokensTotal: number;
  runId: string;
  taskId: number | null;
}

interface AgentsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AgentsSidebar({ collapsed, onToggle }: AgentsSidebarProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch agent activity and aggregate by run_id (latest entry wins)
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const activity = await api.getActivity({ type: 'agent_activity', limit: 50 });
        const agentMap = new Map<string, AgentInfo>();

        // Process activities - latest status per run_id wins
        for (const act of activity) {
          const meta = act.metadata as {
            agent_label?: string;
            status?: string;
            task_summary?: string;
            started_at?: string;
            ended_at?: string | null;
            duration_sec?: number;
            tokens_total?: number;
            run_id?: string;
            task_id?: number | null;
          };

          if (!meta?.run_id) continue;

          const existing = agentMap.get(meta.run_id);
          // Keep the entry with actual end status (completed/failed) or the latest one
          if (!existing || (meta.status && meta.status !== 'running')) {
            agentMap.set(meta.run_id, {
              label: meta.agent_label || 'Unknown Agent',
              status: (meta.status as 'running' | 'completed' | 'failed') || 'running',
              taskSummary: meta.task_summary || '',
              startedAt: meta.started_at || act.created_at,
              endedAt: meta.ended_at || null,
              durationSec: meta.duration_sec || 0,
              tokensTotal: meta.tokens_total || 0,
              runId: meta.run_id,
              taskId: meta.task_id || null,
            });
          }
        }

        // Sort by startedAt descending (most recent first)
        const sorted = Array.from(agentMap.values()).sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        );

        setAgents(sorted);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setLoading(false);
      }
    };

    fetchAgents();
    const poller = setInterval(fetchAgents, 10000); // Poll every 10s
    return () => clearInterval(poller);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600 dark:text-green-400';
      case 'completed':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const runningCount = agents.filter((a) => a.status === 'running').length;

  // Collapsed view - just icons
  if (collapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <button
          onClick={onToggle}
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700"
          title="Expand agents panel"
        >
          <span className="text-lg">🤖</span>
          {runningCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </button>
        <div className="flex-1 overflow-y-auto py-2">
          {agents.slice(0, 10).map((agent) => (
            <button
              key={agent.runId}
              onClick={() => {
                onToggle();
                setSelectedAgent(agent);
              }}
              className="w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-center"
              title={`${agent.label}: ${agent.status}`}
            >
              <span>{getStatusIcon(agent.status)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-semibold text-gray-900 dark:text-white">Agents</span>
          {runningCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
              {runningCount} running
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Collapse panel"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <span className="animate-spin inline-block">⏳</span> Loading...
          </div>
        ) : agents.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No agent activity yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {agents.map((agent) => (
              <button
                key={agent.runId}
                onClick={() => setSelectedAgent(selectedAgent?.runId === agent.runId ? null : agent)}
                className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedAgent?.runId === agent.runId ? 'bg-pika-50 dark:bg-pika-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{getStatusIcon(agent.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {agent.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTime(agent.startedAt)}
                      {agent.status !== 'running' && ` • ${formatDuration(agent.durationSec)}`}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedAgent?.runId === agent.runId && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600 space-y-2">
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Task</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{agent.taskSummary}</div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status: </span>
                        <span className={getStatusColor(agent.status)}>{agent.status}</span>
                      </div>
                      {agent.tokensTotal > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Tokens: </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {(agent.tokensTotal / 1000).toFixed(1)}k
                          </span>
                        </div>
                      )}
                    </div>
                    {agent.taskId && (
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Task #</span>
                        <span className="text-gray-700 dark:text-gray-300">{agent.taskId}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
