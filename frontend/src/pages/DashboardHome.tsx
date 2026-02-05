import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, DashboardStats, Task } from '../api/client';
import ActivityFeed from '../components/ActivityFeed';

function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'blue',
  subtitle 
}: { 
  label: string; 
  value: number; 
  icon: string; 
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className={`${colors[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
        <span className="text-3xl opacity-50">{icon}</span>
      </div>
    </div>
  );
}

function FocusTaskItem({ task, onClick }: { task: Task; onClick: () => void }) {
  const priorityColors = {
    urgent: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    high: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    medium: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    low: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
            {task.name}
          </p>
          {task.deadline && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              {isOverdue ? '⚠️ Overdue: ' : '📅 '}
              {new Date(task.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
    </button>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const statsData = await api.getStats();
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTask = () => {
    navigate('/boards');
  };

  const handleTaskClick = (_taskId: number) => {
    navigate('/boards');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <strong>Error:</strong> {error}
        <button
          onClick={loadDashboard}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🏠 Dashboard</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your tasks at a glance</p>
        </div>
        <button
          onClick={handleNewTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Done This Week"
          value={stats?.weekly.completed || 0}
          icon="✅"
          color="green"
          subtitle="Tasks completed"
        />
        <StatCard
          label="Active"
          value={stats?.current.active || 0}
          icon="⚡"
          color="blue"
          subtitle="In progress"
        />
        <StatCard
          label="Inbox"
          value={stats?.current.inbox || 0}
          icon="📥"
          color="yellow"
          subtitle="Awaiting triage"
        />
        <StatCard
          label="Overdue"
          value={stats?.current.overdue || 0}
          icon="⚠️"
          color={stats?.current.overdue ? 'red' : 'green'}
          subtitle="Past deadline"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Focus List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">🎯 Focus List</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Top priorities</span>
          </div>
          <div className="space-y-2">
            {stats?.focus && stats.focus.length > 0 ? (
              stats.focus.map((task) => (
                <FocusTaskItem
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-4xl mb-2">🎉</p>
                <p>All caught up! No urgent tasks.</p>
              </div>
            )}
          </div>
          {stats?.focus && stats.focus.length > 0 && (
            <button
              onClick={() => navigate('/boards')}
              className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View all tasks →
            </button>
          )}
        </div>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>

      {/* Quick Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">📊</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You completed <span className="font-bold text-green-600 dark:text-green-400">{stats?.weekly.completed || 0}</span> tasks this week.
              {' '}
              {stats?.current.overdue ? (
                <span className="text-red-600 dark:text-red-400">
                  <span className="font-bold">{stats.current.overdue}</span> tasks are overdue.
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">You're all caught up on deadlines! 🎉</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
