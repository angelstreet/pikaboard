import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, DashboardStats, Activity, Task } from '../api/client';

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
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
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
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">
            {task.name}
          </p>
          {task.deadline && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
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

function ActivityItem({ activity }: { activity: Activity }) {
  const typeIcons: Record<string, string> = {
    task_created: '➕',
    task_completed: '✅',
    task_updated: '✏️',
    task_deleted: '🗑️',
  };

  const icon = typeIcons[activity.type] || '📝';
  const timeAgo = getTimeAgo(new Date(activity.created_at));

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{activity.message}</p>
        <p className="text-xs text-gray-400">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        api.getStats(),
        api.getActivity({ limit: 10 }),
      ]);
      setStats(statsData);
      setActivity(activityData);
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
    // Navigate to boards page - the task modal can be opened there
    navigate('/boards');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
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
          <h2 className="text-2xl font-bold text-gray-900">🏠 Dashboard</h2>
          <p className="text-gray-500 mt-1">Your tasks at a glance</p>
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
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">🎯 Focus List</h3>
            <span className="text-xs text-gray-500">Top priorities</span>
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
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">🎉</p>
                <p>All caught up! No urgent tasks.</p>
              </div>
            )}
          </div>
          {stats?.focus && stats.focus.length > 0 && (
            <button
              onClick={() => navigate('/boards')}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all tasks →
            </button>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">📜 Recent Activity</h3>
            <span className="text-xs text-gray-500">Last 10 events</span>
          </div>
          <div className="divide-y divide-gray-100">
            {activity.length > 0 ? (
              activity.map((item) => (
                <ActivityItem key={item.id} activity={item} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-2">📭</p>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">📊</span>
          <div>
            <h3 className="font-semibold text-gray-900">Weekly Summary</h3>
            <p className="text-sm text-gray-600">
              You completed <span className="font-bold text-green-600">{stats?.weekly.completed || 0}</span> tasks this week.
              {' '}
              {stats?.current.overdue ? (
                <span className="text-red-600">
                  <span className="font-bold">{stats.current.overdue}</span> tasks are overdue.
                </span>
              ) : (
                <span className="text-green-600">You're all caught up on deadlines! 🎉</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
