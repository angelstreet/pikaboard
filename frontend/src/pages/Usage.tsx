import { useEffect, useState } from 'react';
import { api, UsageData } from '../api/client';

// Format currency
function formatCurrency(amount: number): string {
  if (amount >= 100) {
    return `$${amount.toFixed(0)}`;
  } else if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  } else if (amount >= 0.01) {
    return `$${amount.toFixed(3)}`;
  }
  return `$${amount.toFixed(4)}`;
}

// Format tokens
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

// Stat card component
function StatCard({ 
  label, 
  value, 
  subtitle,
  trend,
  icon,
}: { 
  label: string; 
  value: string; 
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
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
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}

// Simple bar chart component
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
  const maxValue = Math.max(...data.map(d => Number(d[valueKey])), 0.01);
  
  const colors: Record<string, string> = {
    blue: 'bg-blue-500 dark:bg-blue-600',
    green: 'bg-green-500 dark:bg-green-600',
    purple: 'bg-purple-500 dark:bg-purple-600',
    orange: 'bg-orange-500 dark:bg-orange-600',
    red: 'bg-red-500 dark:bg-red-600',
    yellow: 'bg-yellow-500 dark:bg-yellow-600',
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
                {formatCurrency(value)}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">
              {String(d[labelKey]).slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Model split pie chart
function ModelSplitChart({
  byModel,
  total,
}: {
  byModel: Record<string, { cost: number; tokens: number; name: string }>;
  total: number;
}) {
  const models = Object.entries(byModel).sort(([, a], [, b]) => b.cost - a.cost);
  const colors: Record<string, string> = {
    opus: 'bg-purple-500 dark:bg-purple-600',
    kimi: 'bg-green-500 dark:bg-green-600',
    unknown: 'bg-gray-400 dark:bg-gray-500',
  };

  return (
    <div className="space-y-3">
      {models.map(([key, data]) => {
        const percentage = total > 0 ? (data.cost / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-24">{data.name}</span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors[key] || colors.unknown} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
              {formatCurrency(data.cost)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
              {percentage.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Agent breakdown chart
function AgentBreakdownChart({
  byAgent,
  total,
}: {
  byAgent: Record<string, { cost: number; tokens: number }>;
  total: number;
}) {
  const agents = Object.entries(byAgent).sort(([, a], [, b]) => b.cost - a.cost);
  const colors = ['bg-blue-500 dark:bg-blue-600', 'bg-indigo-500 dark:bg-indigo-600', 'bg-cyan-500 dark:bg-cyan-600', 'bg-teal-500 dark:bg-teal-600', 'bg-sky-500 dark:bg-sky-600'];

  return (
    <div className="space-y-3">
      {agents.map(([key, data], index) => {
        const percentage = total > 0 ? (data.cost / total) * 100 : 0;
        const colorClass = colors[index % colors.length];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-24 capitalize">{key}</span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorClass} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
              {formatCurrency(data.cost)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
              {percentage.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Board breakdown chart
function BoardBreakdownChart({
  byBoard,
  total,
}: {
  byBoard: Record<string, { cost: number; tokens: number; boardId: number | null; name: string }>;
  total: number;
}) {
  const boards = Object.entries(byBoard).sort(([, a], [, b]) => b.cost - a.cost);
  const colors = ['bg-orange-500 dark:bg-orange-600', 'bg-red-500 dark:bg-red-600', 'bg-pink-500 dark:bg-pink-600', 'bg-rose-500 dark:bg-rose-600', 'bg-amber-500 dark:bg-amber-600', 'bg-yellow-500 dark:bg-yellow-600'];

  return (
    <div className="space-y-3">
      {boards.map(([key, data], index) => {
        const percentage = total > 0 ? (data.cost / total) * 100 : 0;
        const colorClass = colors[index % colors.length];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate" title={data.name}>
              {data.name}
            </span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
              <div
                className={`h-full ${colorClass} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
              {formatCurrency(data.cost)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-14 text-right">
              {percentage.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Savings card
function SavingsCard({ amount, percentage }: { amount: number; percentage: number }) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <span className="text-4xl">💰</span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Cost Savings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Using Kimi instead of Opus for sub-agents has saved{' '}
            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(amount)}</span>
            {' '}({percentage.toFixed(1)}%)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Usage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const usage = await api.getUsage();
      setData(usage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading usage data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <strong>Error:</strong> {error}
        <button onClick={loadUsage} className="ml-4 text-sm underline hover:no-underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">💳 Usage</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Token usage and cost tracking</p>
        </div>
        <a
          href="https://65.108.14.251:8080/grafana/"
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

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Today"
          value={formatCurrency(data.today.total)}
          subtitle={`${formatTokens(data.today.tokens)} tokens`}
          icon="📅"
        />
        <StatCard
          label="This Week"
          value={formatCurrency(data.thisWeek.total)}
          subtitle={`${formatTokens(data.thisWeek.tokens)} tokens`}
          icon="📈"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(data.thisMonth.total)}
          subtitle={`${formatTokens(data.thisMonth.tokens)} tokens`}
          icon="🗓️"
        />
        <StatCard
          label="All Time"
          value={formatCurrency(data.total.cost)}
          subtitle={`${formatTokens(data.total.tokens)} tokens`}
          icon="💰"
        />
      </div>

      {/* Savings Card */}
      {data.savings.amount > 0 && (
        <SavingsCard amount={data.savings.amount} percentage={data.savings.percentage} />
      )}

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Spend Chart */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Daily Spend</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cost trend over last 30 days</p>
          </div>
          <BarChart
            data={data.daily.map(d => ({ date: d.date, cost: d.cost }))}
            labelKey="date"
            valueKey="cost"
            color="blue"
            maxHeight={140}
          />
        </div>

        {/* Model Split */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Model Split</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cost breakdown by model</p>
          </div>
          <ModelSplitChart
            byModel={data.byModel}
            total={data.total.cost}
          />
        </div>
      </div>

      {/* Breakdown by Agent and Board */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Agent */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">By Agent</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cost breakdown by agent</p>
          </div>
          <AgentBreakdownChart
            byAgent={data.byAgent}
            total={data.total.cost}
          />
        </div>

        {/* By Board */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">By Board</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cost breakdown by board/project</p>
          </div>
          <BoardBreakdownChart
            byBoard={data.byBoard}
            total={data.total.cost}
          />
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Token Breakdown</h3>
          <p className="text-sm text-gray-gray-500 dark:text-gray-400">Input vs output tokens by model</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(data.byModel).map(([key, model]) => (
            <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-3 h-3 rounded-full ${key === 'opus' ? 'bg-purple-500' : 'bg-green-500'}`} />
                <span className="font-medium text-gray-900 dark:text-white">{model.name}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Input tokens:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatTokens(model.inputTokens)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Output tokens:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatTokens(model.outputTokens)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">Total cost:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(model.cost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Reference */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Pricing Reference</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Per 1M tokens</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Model</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Input</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Output</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.pricing).map(([key, pricing]) => (
                <tr key={key} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{pricing.name}</td>
                  <td className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">${pricing.input}</td>
                  <td className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">${pricing.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Based on {data.total.sessions.toLocaleString()} sessions analyzed
      </div>
    </div>
  );
}
