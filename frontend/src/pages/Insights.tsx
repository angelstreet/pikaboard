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
import { api, InsightsData, Board, Task, UsageData, Agent } from '../api/client';

// Color palette
const COLORS = {
  primary: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b', '#6366f1', '#84cc16', '#d946ef'],
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

// Period options - reused from Usage.tsx
const PERIOD_OPTIONS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
] as const;

type Period = typeof PERIOD_OPTIONS[number]['value'];

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

// Pie chart component - reused pattern
function DistributionPieChart({
  data,
  title,
  subtitle,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {item.name}: <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to get date range from period
function getDateRange(period: Period): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(1970, 0, 1);
      break;
  }

  return { startDate, endDate };
}

// Filter tasks by period based on creation or completion date
function filterTasksByPeriod(tasks: Task[], period: Period): Task[] {
  if (period === 'all') return tasks;

  const { startDate, endDate } = getDateRange(period);

  return tasks.filter(task => {
    const taskDate = task.completed_at
      ? new Date(task.completed_at)
      : new Date(task.created_at);
    return taskDate >= startDate && taskDate <= endDate;
  });
}

// Filter activities by period
function filterActivitiesByPeriod(data: InsightsData, period: Period): InsightsData {
  if (period === 'all') return data;

  const { startDate, endDate } = getDateRange(period);

  // Filter daily completions
  const filteredDaily = data.completions.daily.filter(d => {
    const date = new Date(d.date);
    return date >= startDate && date <= endDate;
  });

  // Filter activity trend
  const filteredTrend = data.activityTrend.filter(d => {
    const date = new Date(d.date);
    return date >= startDate && date <= endDate;
  });

  // Recalculate summary based on filtered data
  const totalCompleted = filteredDaily.reduce((sum, d) => sum + d.count, 0);

  return {
    ...data,
    completions: {
      ...data.completions,
      daily: filteredDaily,
    },
    activityTrend: filteredTrend,
    summary: {
      ...data.summary,
      totalCompleted,
    },
  };
}

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const [insights, boardsData, tasksData, usage, agentsData] = await Promise.all([
        api.getInsights(),
        api.getBoards(),
        api.getTasks(),
        api.getUsage(period),
        api.getAgents(),
      ]);
      setData(insights);
      setBoards(boardsData);
      setTasks(tasksData);
      setUsageData(usage);
      setAgents(agentsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts with period filtering
  const chartData = useMemo(() => {
    if (!data) return null;

    // Filter data by selected period
    const filteredData = filterActivitiesByPeriod(data, period);
    let filteredTasks = filterTasksByPeriod(tasks, period);

    // Apply agent filter if selected
    if (selectedAgent !== 'all') {
      // Filter tasks by agent - tasks with tags containing agent name or assigned to agent
      filteredTasks = filteredTasks.filter(task => {
        const taskTags = Array.isArray(task.tags) ? task.tags : (task.tags?.split(',') || []);
        return taskTags.some(tag => tag.toLowerCase().includes(selectedAgent.toLowerCase()));
      });
    }

    // Tasks completed over time (respect period)
    const completionTrend = filteredData.completions.daily.map(d => ({
      date: formatDate(d.date),
      fullDate: d.date,
      completed: d.count,
    }));

    // Agent productivity data - enhanced with usage metrics
    const agentData = Object.entries(filteredData.agents)
      .map(([agent, stats]) => {
        const agentKey = agent.toLowerCase();
        const usage = usageData?.byAgent?.[agentKey];
        
        // Calculate tasks completed by this agent from filtered tasks
        const tasksCompleted = filteredTasks.filter(t => {
          if (t.status !== 'done') return false;
          const tags = Array.isArray(t.tags) ? t.tags : (t.tags?.split(',') || []);
          return tags.some(tag => tag.toLowerCase().includes(agentKey));
        }).length;

        return {
          name: agent.charAt(0).toUpperCase() + agent.slice(1),
          actions: stats.actions,
          avgRating: stats.avgRating || 0,
          ratedTasks: stats.ratedTasks || 0,
          lastActive: stats.lastActive,
          // Enhanced metrics from usage data
          tokens: usage?.tokens || 0,
          cost: usage?.cost || 0,
          tasksCompleted,
          efficiency: usage?.tokens ? (tasksCompleted / (usage.tokens / 1000)).toFixed(2) : '0.00',
        };
      })
      .sort((a, b) => b.actions - a.actions);

    // Status distribution for pie chart
    const statusData = Object.entries(filteredData.distributions.status).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: COLORS.status[status as keyof typeof COLORS.status] || '#9ca3af',
    }));

    // Priority distribution
    const priorityData = Object.entries(filteredData.distributions.priority).map(([priority, count]) => ({
      name: priority.toUpperCase(),
      value: count,
      color: COLORS.priority[priority as keyof typeof COLORS.priority] || '#9ca3af',
    }));

    // Activity trend (respect period)
    const activityData = filteredData.activityTrend.map(d => ({
      date: formatDate(d.date),
      activities: d.count,
    }));

    // Activity by type (respect period by filtering from trend)
    const activityTypeData = Object.entries(filteredData.activityByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([type, count]) => ({
        type: type.length > 15 ? type.slice(0, 15) + '...' : type,
        count,
      }));

    // PER-BOARD DISTRIBUTION - Calculate from filtered tasks
    const boardDistribution: Record<number | string, { name: string; count: number }> = {};
    
    // Initialize with all boards (even empty ones)
    boards.forEach(board => {
      boardDistribution[board.id] = { name: board.name, count: 0 };
    });
    boardDistribution['none'] = { name: 'No Board', count: 0 };

    // Count tasks per board
    filteredTasks.forEach(task => {
      const key = task.board_id ?? 'none';
      if (boardDistribution[key]) {
        boardDistribution[key].count++;
      }
    });

    // Convert to pie chart data
    const boardData = Object.entries(boardDistribution)
      .filter(([, data]) => data.count > 0) // Only show boards with tasks
      .map(([, data], index) => ({
        name: data.name,
        value: data.count,
        color: COLORS.primary[index % COLORS.primary.length],
      }))
      .sort((a, b) => b.value - a.value);

    // PER-AGENT DISTRIBUTION (pie chart showing actions)
    const agentPieData = agentData
      .filter(agent => agent.actions > 0)
      .map((agent, index) => ({
        name: agent.name,
        value: agent.actions,
        color: COLORS.primary[index % COLORS.primary.length],
      }));

    return {
      completionTrend,
      agentData,
      statusData,
      priorityData,
      activityData,
      activityTypeData,
      boardData,
      agentPieData,
      filteredData,
      filteredTasks,
    };
  }, [data, tasks, boards, period, usageData, agents, selectedAgent]);

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

  const completionRate = chartData.filteredTasks.length > 0
    ? Math.round((chartData.filteredTasks.filter(t => t.status === 'done').length / chartData.filteredTasks.length) * 100)
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent Filter */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.name.toLowerCase()}>
                🤖 {agent.name}
              </option>
            ))}
          </select>

          {/* Period Filter - reused from Usage.tsx */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === option.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
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
          label="Completed"
          value={chartData.filteredData.summary.totalCompleted}
          icon="✅"
          trend={chartData.filteredData.summary.totalCompleted > 0 ? 'up' : 'neutral'}
          trendValue={chartData.filteredData.summary.totalCompleted > 0 ? 'On track' : 'No tasks'}
        />
        <StatCard
          label="Total Tasks"
          value={chartData.filteredTasks.length}
          icon="📋"
          subtitle="in selected period"
        />
        <StatCard
          label="Active Agents"
          value={Object.keys(chartData.filteredData.agents).length}
          icon="🤖"
          subtitle="contributing"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon="🎯"
          subtitle={`of filtered tasks`}
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
          label="Total Activities"
          value={Object.values(chartData.filteredData.activityByType).reduce((a, b) => a + b, 0)}
          icon="📝"
          subtitle="logged actions"
        />
        <StatCard
          label="Boards Used"
          value={new Set(chartData.filteredTasks.map(t => t.board_id)).size}
          icon="📁"
          subtitle="active boards"
        />
      </div>

      {/* Tasks Completed Over Time */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📈 Tasks Completed Over Time
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Daily completion trend for selected period</p>
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

      {/* Distribution Charts Grid - Status, Priority, Board, Agent */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <DistributionPieChart
          title="📊 Status Distribution"
          subtitle="Tasks by current status"
          data={chartData.statusData}
        />

        {/* Priority Distribution */}
        <DistributionPieChart
          title="🎯 Priority Distribution"
          subtitle="Tasks by priority level"
          data={chartData.priorityData}
        />

        {/* PER-BOARD DISTRIBUTION */}
        <DistributionPieChart
          title="📁 Per-Board Distribution"
          subtitle="Tasks by board"
          data={chartData.boardData}
        />

        {/* PER-AGENT DISTRIBUTION */}
        <DistributionPieChart
          title="🤖 Per-Agent Distribution"
          subtitle="Actions by agent"
          data={chartData.agentPieData}
        />
      </div>

      {/* Task Completion by Agent */}
      {chartData.agentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              ✅ Task Completion by Agent
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tasks completed per agent {selectedAgent !== 'all' && `- Filtered by ${selectedAgent}`}
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.agentData.filter(a => a.tasksCompleted > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="tasksCompleted"
                  name="Tasks Completed"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Completion Rate Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {chartData.agentData
              .filter(a => a.tasksCompleted > 0)
              .map((agent) => {
                const totalTasks = chartData.filteredTasks.filter((t: Task) => {
                  const tags = Array.isArray(t.tags) ? t.tags : (t.tags?.split(',') || []);
                  return tags.some((tag: string) => tag.toLowerCase().includes(agent.name.toLowerCase()));
                }).length;
                const completionRate = totalTasks > 0 ? Math.round((agent.tasksCompleted / totalTasks) * 100) : 0;
                
                return (
                  <div
                    key={agent.name}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400">{agent.name}</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      {agent.tasksCompleted}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {completionRate}% completion rate
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Agent Productivity (Bar Chart) */}
      {chartData.agentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🤖 Agent Productivity
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Actions, tokens, tasks, and efficiency by agent</p>
          </div>
          
          {/* Multi-metric bar chart */}
          <div className="h-72 mb-6">
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
                <Legend />
                <Bar dataKey="actions" name="Actions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="tasksCompleted" name="Tasks Done" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Details Grid - Enhanced with metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chartData.agentData.map((agent) => (
              <div
                key={agent.name}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <span className="font-medium text-gray-900 dark:text-white">{agent.name}</span>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{agent.actions}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">actions</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{agent.tasksCompleted}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">tasks</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {agent.tokens > 0 ? `${(agent.tokens / 1000).toFixed(1)}k` : '0'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">tokens</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {agent.efficiency}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">efficiency</div>
                  </div>
                </div>

                {agent.cost > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    💰 ${agent.cost.toFixed(2)} spent
                  </div>
                )}
                
                {agent.avgRating > 0 && (
                  <div className="flex items-center gap-1">
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

      {/* Activity Trend */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📈 Activity Trend
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Actions logged over the selected period</p>
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
              {Math.round((data.summary.totalCompleted / Math.max(data.summary.totalTasks, 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">overall rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
