import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api, InsightsData } from '../api/client';

// Color palette
const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4'],
  status: {
    inbox: '#eab308',
    up_next: '#a855f7',
    in_progress: '#3b82f6',
    in_review: '#f97316',
    done: '#22c55e',
    rejected: '#ef4444',
  },
  priority: {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#3b82f6',
    low: '#9ca3af',
  },
};

// Stat card component
function StatCard({
  label,
  value,
  icon,
  subtitle,
  trend,
  trendValue,
}: {
  label: string;
  value: number | string;
  icon: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→',
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trendColors[trend]}`}>
              <span>{trendIcons[trend]}</span>
              <span>{trendValue}</span>
            </p>
          )}
        </div>
        <span className="text-3xl bg-gray-100 dark:bg-gray-700 rounded-lg p-2">{icon}</span>
      </div>
    </div>
  );
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d' | '90d'>('14d');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const insights = await api.getInsights();
      setData(insights);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data) return null;

    // Tasks completed over time
    const completionTrend = data.completions.daily.slice(-getDaysFromRange(timeRange)).map(d => ({
      date: formatDate(d.date),
      fullDate: d.date,
      completed: d.count,
    }));

    // Agent productivity data
    const agentData = Object.entries(data.agents)
      .map(([agent, stats]) => ({
        name: agent.charAt(0).toUpperCase() + agent.slice(1),
        actions: stats.actions,
        avgRating: stats.avgRating || 0,
        ratedTasks: stats.ratedTasks || 0,
        lastActive: stats.lastActive,
      }))
      .sort((a, b) => b.actions - a.actions);

    // Status distribution for pie chart
    const statusData = Object.entries(data.distributions.status).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: COLORS.status[status as keyof typeof COLORS.status] || '#9ca3af',
    }));

    // Priority distribution
    const priorityData = Object.entries(data.distributions.priority).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count,
      color: COLORS.priority[priority as keyof typeof COLORS.priority] || '#9ca3af',
    }));

    // Activity trend
    const activityData = data.activityTrend.slice(-14).map(d => ({
      date: formatDate(d.date),
      activities: d.count,
    }));

    // Activity by type
    const activityTypeData = Object.entries(data.activityByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([type, count]) => ({
        type: type.length > 15 ? type.slice(0, 15) + '...' : type,
        count,
      }));

    return {
      completionTrend,
      agentData,
      statusData,
      priorityData,
      activityData,
      activityTypeData,
    };
  }, [data, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <strong>Error:</strong> {error}
        <button onClick={loadInsights} className="ml-4 text-sm underline hover:no-underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data || !chartData) return null;

  const completionRate = data.summary.totalTasks > 0
    ? Math.round((data.summary.totalCompleted / data.summary.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 Insights
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Analytics and productivity metrics for your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://65.108.14.251:8080/grafana/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            📊 Grafana
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Completed Today"
          value={data.summary.completedToday}
          icon="✅"
          trend={data.summary.completedToday > 0 ? 'up' : 'neutral'}
          trendValue={data.summary.completedToday > 0 ? 'On track' : 'No tasks yet'}
        />
        <StatCard
          label="This Week"
          value={data.summary.completedThisWeek}
          icon="📈"
          subtitle="tasks completed"
          trend={data.summary.completedThisWeek >= 5 ? 'up' : 'neutral'}
          trendValue={`${data.summary.completedThisWeek} tasks`}
        />
        <StatCard
          label="This Month"
          value={data.summary.completedThisMonth}
          icon="🗓️"
          subtitle="tasks completed"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon="🎯"
          subtitle={`${data.summary.totalCompleted} of ${data.summary.totalTasks}`}
          trend={completionRate > 50 ? 'up' : 'neutral'}
          trendValue={completionRate > 50 ? 'Good progress' : 'Keep going'}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Current Streak"
          value={`${data.summary.currentStreak}d`}
          icon="🔥"
          subtitle={data.summary.currentStreak > 3 ? 'Keep it up!' : 'Build momentum'}
          trend={data.summary.currentStreak > 3 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Avg Completion"
          value={data.summary.avgCompletionHours > 0 ? `${data.summary.avgCompletionHours}h` : 'N/A'}
          icon="⏱️"
          subtitle="per task"
        />
        <StatCard
          label="Active Agents"
          value={Object.keys(data.agents).length}
          icon="🤖"
          subtitle="contributing"
        />
        <StatCard
          label="Total Activities"
          value={Object.values(data.activityByType).reduce((a, b) => a + b, 0)}
          icon="📝"
          subtitle="logged actions"
        />
      </div>

      {/* Tasks Completed Over Time */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📈 Tasks Completed Over Time
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Daily completion trend</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['7d', '14d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.completionTrend}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Tasks Completed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Productivity */}
      {chartData.agentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🤖 Agent Productivity
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actions and performance by agent</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.agentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="actions"
                  name="Actions"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Agent Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {chartData.agentData.map((agent) => (
              <div
                key={agent.name}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="font-medium text-gray-900 dark:text-white">{agent.name}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{agent.actions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">actions</div>
                {agent.avgRating > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xs ${star <= Math.round(agent.avgRating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {agent.avgRating.toFixed(1)} ({agent.ratedTasks})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Status & Priority Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Status Distribution
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tasks by current status</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Status Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {chartData.statusData.map((status) => (
              <div key={status.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {status.name}: <span className="font-medium text-gray-900 dark:text-white">{status.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🎯 Priority Distribution
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tasks by priority level</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                  {chartData.priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Trend */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📈 Activity Trend
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actions logged over the last 14 days</p>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="activities"
                name="Activities"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity by Type */}
      {chartData.activityTypeData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📝 Activity by Type
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Most frequent activity types</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.activityTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="type"
                  stroke="#9ca3af"
                  fontSize={11}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Count"
                  fill="#ec4899"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lifetime Stats Footer */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Lifetime Statistics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold text-green-600 dark:text-green-400 text-lg">{data.summary.totalCompleted}</span> tasks completed
              {' '}out of <span className="font-bold">{data.summary.totalTasks}</span> total tasks
              {data.summary.avgCompletionHours > 0 && (
                <>
                  {' '}• Average completion time: <span className="font-bold">{data.summary.avgCompletionHours} hours</span>
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {completionRate}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">completion rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDaysFromRange(range: string): number {
  switch (range) {
    case '7d': return 7;
    case '14d': return 14;
    case '30d': return 30;
    case '90d': return 90;
    default: return 14;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
