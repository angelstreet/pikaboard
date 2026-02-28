import { useEffect, useState } from 'react';
import { api, type Agent, type Goal, type Board } from '../api/client';
import { Modal } from '../components/Modal';
import { getTeamMember } from '../config/team';

// Get agent emoji from team config
function getAgentEmoji(agentId: string): string {
  const member = getTeamMember(agentId);
  return member?.avatar || '🤖';
}

// Status badge component
function StatusBadge({ status }: { status: Goal['status'] }) {
  const colors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-green-200 dark:border-green-800',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    achieved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };

  const labels = {
    active: 'Active',
    paused: 'Paused',
    achieved: 'Achieved',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

// Progress bar component
function ProgressBar({ progress }: { progress: number }) {
  const colorClass = progress >= 100 
    ? 'bg-green-500' 
    : progress >= 50 
    ? 'bg-blue-500' 
    : 'bg-orange-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">Progress</span>
        <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Goal card component
function GoalCard({ 
  goal, 
  agent, 
  onClick 
}: { 
  goal: Goal; 
  agent?: Agent; 
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {goal.title}
          </h3>
        </div>
        <StatusBadge status={goal.status} />
      </div>

      {goal.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {goal.description}
        </p>
      )}

      <div className="mb-4">
        <ProgressBar progress={goal.progress} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          {agent && (
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🤖</span>
              <span className="text-gray-600 dark:text-gray-400">{agent.name}</span>
            </div>
          )}
          {!agent && goal.type === 'global' && (
            <span className="text-gray-500 dark:text-gray-500">🌍 Global</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          {goal.task_count !== undefined && (
            <span className="flex items-center gap-1">
              📋 {goal.done_count || 0}/{goal.task_count}
            </span>
          )}
          {goal.deadline && (
            <span className={`flex items-center gap-1 ${isOverdue(goal.deadline) ? 'text-red-500' : ''}`}>
              📅 {formatDate(goal.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Goal detail modal
function GoalModal({ 
  goal, 
  agent, 
  isOpen, 
  onClose,
  onUpdate,
}: { 
  goal: Goal | null; 
  agent?: Agent;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<Goal>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setEditedGoal({
        title: goal.title,
        description: goal.description,
        status: goal.status,
        deadline: goal.deadline,
      });
    }
  }, [goal]);

  if (!goal) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.updateGoal(goal.id, editedGoal);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update goal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAchieved = async () => {
    try {
      await api.updateGoal(goal.id, { status: 'achieved', progress: 100 });
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to mark goal as achieved:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎯 Goal Details">
      <div className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editedGoal.title || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editedGoal.description || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={editedGoal.status}
                  onChange={(e) => setEditedGoal({ ...editedGoal, status: e.target.value as Goal['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="achieved">Achieved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editedGoal.deadline || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, deadline: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{goal.title}</h2>
                {agent && (
                  <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
                    <span>🤖</span>
                    <span>{agent.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm">{agent.role}</span>
                  </div>
                )}
              </div>
              <StatusBadge status={goal.status} />
            </div>

            {goal.description && (
              <p className="text-gray-600 dark:text-gray-400">{goal.description}</p>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <ProgressBar progress={goal.progress} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-500">Type</span>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {goal.type === 'global' ? '🌍 Global' : '👤 Agent-specific'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-500">Linked Tasks</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {goal.done_count || 0} done / {goal.task_count || 0} total
                </p>
              </div>
              {goal.deadline && (
                <div>
                  <span className="text-gray-500 dark:text-gray-500">Deadline</span>
                  <p className={`font-medium ${isOverdue(goal.deadline) ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {formatDate(goal.deadline)} {isOverdue(goal.deadline) && '(Overdue)'}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-500">Created</span>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(goal.created_at)}</p>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {goal.status !== 'achieved' && (
                <button
                  onClick={handleMarkAchieved}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <span>✓</span> Mark as Achieved
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  const deadline = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadline < today;
}

// Main Goals page component
export default function Goals() {
  const cachedGoals = api.getCached<{ goals: Goal[] }>('/goals');
  const cachedAgents = api.getCached<{ agents: Agent[] }>('/agents');
  const cachedBoards = api.getCached<Board[]>('/boards');

  const [goals, setGoals] = useState<Goal[]>(cachedGoals?.goals ?? []);
  const [agents, setAgents] = useState<Agent[]>(cachedAgents?.agents ?? []);
  const [boards, setBoards] = useState<Board[]>(cachedBoards ?? []);
  const [loading, setLoading] = useState(!cachedGoals);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'agent' | 'board'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      if (!goals.length) setLoading(true);
      const [goalsData, agentsData, boardsData] = await Promise.all([
        api.getGoals(),
        api.getAgents(),
        api.getBoards(),
      ]);
      setGoals(goalsData.goals);
      setAgents(agentsData);
      setBoards(boardsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const filteredGoals = goals.filter((goal) => {
    if (filterType === 'all') return true;
    if (filterType === 'agent' && selectedAgentId) {
      // Filter by agent - match agent_id or agent's board_id
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent?.boardId) {
        return goal.board_id === agent.boardId || goal.agent_id === selectedAgentId;
      }
      return goal.agent_id === selectedAgentId;
    }
    if (filterType === 'board' && selectedBoardId) {
      return goal.board_id === Number(selectedBoardId);
    }
    return true;
  });

  const getAgent = (agentId: string | null) => {
    if (!agentId) return undefined;
    return agents.find((a) => a.id === agentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading goals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <strong>Error:</strong> {error}
        <button onClick={loadGoals} className="ml-4 text-sm underline hover:no-underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🎯 Goals
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Strategic objectives for agents and the team
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {goals.filter(g => g.status === 'achieved').length} of {goals.length} achieved
        </div>
      </div>

      {/* Agent Filter - Horizontal chips */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFilterType('all');
              setSelectedAgentId('');
              setSelectedBoardId('');
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
              filterType === 'all'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {agents.filter(a => a.id !== 'main' && a.id !== 'pika-ops').map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                setFilterType('agent');
                setSelectedAgentId(agent.id);
                setSelectedBoardId('');
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                filterType === 'agent' && selectedAgentId === agent.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="text-base">{getAgentEmoji(agent.id)}</span>
              <span>{agent.name}</span>
            </button>
          ))}
        </div>

        {/* Board Filter - Horizontal chips */}
        <div className="flex flex-wrap items-center gap-2">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => {
                setFilterType('board');
                setSelectedBoardId(String(board.id));
                setSelectedAgentId('');
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${
                filterType === 'board' && selectedBoardId === String(board.id)
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>{board.icon}</span>
              <span>{board.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              agent={getAgent(goal.agent_id)}
              onClick={() => setSelectedGoal(goal)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <span className="text-4xl mb-4 block">🎯</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No goals found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filterType === 'all' 
              ? 'Get started by creating your first goal'
              : filterType === 'agent' && selectedAgentId
              ? `No goals for this agent yet`
              : filterType === 'board' && selectedBoardId
              ? `No goals for this board yet`
              : 'Select an agent or board to filter'
            }
          </p>
        </div>
      )}

      {/* Goal Detail Modal */}
      <GoalModal
        goal={selectedGoal}
        agent={selectedGoal ? getAgent(selectedGoal.agent_id) : undefined}
        isOpen={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        onUpdate={loadGoals}
      />
    </div>
  );
}
