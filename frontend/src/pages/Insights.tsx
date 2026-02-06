import { useEffect, useState } from 'react';
import { api, InsightsData } from '../api/client';

// Simple bar chart using CSS
function BarChart({ 
  data, 
  labelKey, 
  valueKey,
  color = 'blue',
  maxHeight = 120,
}: { 
  data: Array<{ [key: string]: string | number }>;
  labelKey: string;
  valueKey: string;
  color?: string;
  maxHeight?: number;
}) {
  const maxValue = Math.max(...data.map(d => Number(d[valueKey])), 1);
  
  const colors: Record<string, string> = {
    blue: 'bg-blue-500 dark:bg-blue-600',
    green: 'bg-green-500 dark:bg-green-600',
    purple: 'bg-purple-500 dark:bg-purple-600',
    orange: 'bg-orange-500 dark:bg-orange-600',
  };
  
  return (
    <div className="flex items-end gap-1 h-full" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const value = Number(d[valueKey]);
        const height = maxValue > 0 ? (value / maxValue) * maxHeight : 0;
        return (
          <div key={i} className="flex flex-col items-center flex-1 min-w-0">
            <div className="relative w-full flex justify-center group">
              <div
                className={`w-full max-w-[24px] ${colors[color]} rounded-t transition-all hover:opacity-80`}
                style={{ height: Math.max(height, 2) }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                {value}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
              {String(d[labelKey]).slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar for distribution
function HorizontalBar({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400 w-24 capitalize">{label.replace('_', ' ')}</span>
      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">{value}</span>
    </div>
  );
}

// Stat card
function StatCard({ 
  label, 
  value, 
  icon, 
  subtitle,
  trend,
}: { 
  label: string; 
  value: number | string; 
  icon: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${trend ? trendColors[trend] : 'text-gray-500 dark:text-gray-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading insights...</div>
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

  if (!data) return null;

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-blue-500',
    low: 'bg-gray-400',
  };

  const statusColors: Record<string, string> = {
    inbox: 'bg-yellow-500',
    up_next: 'bg-purple-500',
    in_progress: 'bg-blue-500',
    testing: 'bg-cyan-500',
    in_review: 'bg-orange-500',
    done: 'bg-green-500',
  };

  const totalPriority = Object.values(data.distributions.priority).reduce((a, b) => a + b, 0);
  const totalStatus = Object.values(data.distributions.status).reduce((a, b) => a + b, 0);

  // Get chart data based on time range
  const chartData = timeRange === 'daily' 
    ? data.completions.daily.slice(-14)
    : timeRange === 'weekly'
    ? data.completions.weekly
    : data.completions.monthly;

  const chartLabelKey = timeRange === 'daily' ? 'date' : timeRange === 'weekly' ? 'week' : 'month';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Insights</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Analytics and productivity metrics</p>
        </div>
        <a
          href="http://65.108.14.251:8080/grafana/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          📊 Open Grafana
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Today"
          value={data.summary.completedToday}
          icon="📅"
          subtitle="tasks completed"
        />
        <StatCard
          label="This Week"
          value={data.summary.completedThisWeek}
          icon="📈"
          subtitle="tasks completed"
          trend={data.summary.completedThisWeek > 5 ? 'up' : 'neutral'}
        />
        <StatCard
          label="This Month"
          value={data.summary.completedThisMonth}
          icon="🗓️"
          subtitle="tasks completed"
        />
        <StatCard
          label="Current Streak"
          value={`${data.summary.currentStreak} days`}
          icon="🔥"
          subtitle={data.summary.currentStreak > 3 ? 'Keep it up!' : 'Build momentum'}
          trend={data.summary.currentStreak > 3 ? 'up' : 'neutral'}
        />
      </div>

      {/* Completions Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Tasks Completed</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completion trend over time</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <BarChart 
          data={chartData}
          labelKey={chartLabelKey}
          valueKey="count"
          color="green"
          maxHeight={140}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Priority Distribution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active tasks by priority</p>
          </div>
          <div className="space-y-3">
            {Object.entries(data.distributions.priority).map(([priority, count]) => (
              <HorizontalBar
                key={priority}
                label={priority}
                value={count}
                total={totalPriority}
                color={priorityColors[priority]}
              />
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Status Distribution</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">All tasks by status</p>
          </div>
          <div className="space-y-3">
            {Object.entries(data.distributions.status).map(([status, count]) => (
              <HorizontalBar
                key={status}
                label={status}
                value={count}
                total={totalStatus}
                color={statusColors[status]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Activity Trend */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Activity Trend</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actions logged over the last 14 days</p>
        </div>
        <BarChart 
          data={data.activityTrend}
          labelKey="date"
          valueKey="count"
          color="purple"
          maxHeight={100}
        />
      </div>

      {/* Agent Stats */}
      {Object.keys(data.agents).length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Agent Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Productivity by agent</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(data.agents).map(([agent, stats]) => (
              <div 
                key={agent}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🤖</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{agent}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.actions}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  actions logged
                </div>
                {stats.lastActive && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Last: {new Date(stats.lastActive).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Types */}
      {Object.keys(data.activityByType).length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Activity by Type</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Breakdown of logged activities</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.activityByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span 
                  key={type}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">{type}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Stats */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Lifetime Stats</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold text-green-600 dark:text-green-400">{data.summary.totalCompleted}</span> tasks completed
              {' '}out of <span className="font-bold">{data.summary.totalTasks}</span> total
              {data.summary.avgCompletionHours > 0 && (
                <>
                  {' '}• Avg completion time: <span className="font-bold">{data.summary.avgCompletionHours}h</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
