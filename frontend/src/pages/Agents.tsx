import { useState, useEffect } from 'react';
import { api, Agent } from '../api/client';
import { AgentCard } from '../components/AgentCard';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetail, setAgentDetail] = useState<{ agent: Agent; soulMd?: string } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setLoading(true);
      const data = await api.getAgents();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }

  async function handleAgentClick(agent: Agent) {
    setSelectedAgent(agent);
    setDetailLoading(true);
    try {
      const detail = await api.getAgent(agent.id);
      setAgentDetail(detail);
    } catch {
      setAgentDetail({ agent });
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedAgent(null);
    setAgentDetail(null);
  }

  // Stats
  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active' || a.status === 'busy').length,
    working: agents.filter((a) => a.status === 'busy').length,
    idle: agents.filter((a) => a.status === 'idle').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🤖 Agent Roster</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Your AI team at a glance
          </p>
        </div>
        <button
          onClick={loadAgents}
          className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.working}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Working</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.idle}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Idle</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <span className="text-6xl">🤖</span>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4">No Agents Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Agents are defined in ~/.openclaw/agents/
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onClick={handleAgentClick} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAgent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeDetail}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin text-4xl">⚡</div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading agent details...</p>
              </div>
            ) : agentDetail ? (
              <AgentDetailView
                agent={agentDetail.agent}
                soulMd={agentDetail.soulMd}
                onClose={closeDetail}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Agent Detail View Component
function AgentDetailView({
  agent,
  soulMd,
  onClose,
}: {
  agent: Agent;
  soulMd?: string;
  onClose: () => void;
}) {
  const [showSoul, setShowSoul] = useState(false);

  const agentEmojis: Record<string, string> = {
    bulbi: '🌱',
    evoli: '🦊',
    psykokwak: '🦆',
    sala: '🔥',
    tortue: '🐢',
    pika: '⚡',
  };
  const emoji = agentEmojis[agent.id.toLowerCase()] || '🤖';

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {/* Header */}
      <div className="p-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{emoji}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{agent.role}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={agent.status} />
              {agent.boardId && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Board #{agent.boardId}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Purpose */}
      {agent.purpose && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Purpose
          </h3>
          <p className="text-gray-900 dark:text-gray-100">{agent.purpose}</p>
        </div>
      )}

      {/* Current Task */}
      {agent.currentTask && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">
            Currently Working On
          </h3>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
            <p className="text-purple-900 dark:text-purple-200">{agent.currentTask}</p>
          </div>
        </div>
      )}

      {/* Skills */}
      {agent.skills.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {agent.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Performance
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {agent.kpis.tasksCompleted}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {agent.kpis.tasksActive}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {agent.kpis.uptime || '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {agent.recentActivity.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Recent Activity
          </h3>
          <ul className="space-y-2">
            {agent.recentActivity.map((activity, i) => (
              <li
                key={i}
                className="text-sm text-gray-600 dark:text-gray-300 font-mono truncate"
              >
                {activity}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SOUL.md Toggle */}
      {soulMd && (
        <div className="p-6">
          <button
            onClick={() => setShowSoul(!showSoul)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {showSoul ? '▼' : '▶'} View SOUL.md
          </button>
          {showSoul && (
            <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {soulMd}
            </pre>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>ID: {agent.id}</span>
        {agent.lastSeen && <span>Last seen: {agent.lastSeen}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    busy: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', label: '⚡ Working' },
    active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: '● Active' },
    idle: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: '◐ Idle' },
    offline: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: '○ Offline' },
  };
  const c = config[status] || config.offline;
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
